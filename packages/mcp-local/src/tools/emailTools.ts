/**
 * Email Tools — Send and read emails via raw SMTP/IMAP over TLS.
 *
 * Zero npm dependencies — uses Node's built-in `tls` module.
 *
 * Environment variables:
 * - EMAIL_USER: Email address (e.g., agent@gmail.com)
 * - EMAIL_PASS: App password (NOT regular password for Gmail)
 * - EMAIL_SMTP_HOST: SMTP server (default: smtp.gmail.com)
 * - EMAIL_SMTP_PORT: SMTP port (default: 465)
 * - EMAIL_IMAP_HOST: IMAP server (default: imap.gmail.com)
 * - EMAIL_IMAP_PORT: IMAP port (default: 993)
 */

import * as tls from "node:tls";
import type { McpTool } from "../types.js";

// ── Config ───────────────────────────────────────────────────────────────────

function getSmtpConfig() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) throw new Error("EMAIL_USER and EMAIL_PASS environment variables required. For Gmail, use an App Password (Google Account → Security → 2-Step Verification → App passwords).");
  return {
    host: process.env.EMAIL_SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_SMTP_PORT || "465"),
    user,
    pass,
  };
}

function getImapConfig() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) throw new Error("EMAIL_USER and EMAIL_PASS environment variables required. For Gmail, enable IMAP in Settings → Forwarding and POP/IMAP.");
  return {
    host: process.env.EMAIL_IMAP_HOST || "imap.gmail.com",
    port: parseInt(process.env.EMAIL_IMAP_PORT || "993"),
    user,
    pass,
  };
}

// ── SMTP helpers ─────────────────────────────────────────────────────────────

/** Read complete SMTP response (handles multi-line 250-... continuations) */
function readSmtp(socket: tls.TLSSocket, timeoutMs = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => {
      socket.removeAllListeners("data");
      reject(new Error("SMTP read timeout"));
    }, timeoutMs);

    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      // Complete when a line has "NNN " (space after 3-digit code, not dash)
      const lines = buf.split("\r\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (last && /^\d{3} /.test(last)) {
        clearTimeout(timer);
        socket.removeListener("data", onData);
        const code = parseInt(last.substring(0, 3));
        if (code >= 400) reject(new Error(`SMTP ${code}: ${buf.trim()}`));
        else resolve(buf.trim());
      }
    };
    socket.on("data", onData);
  });
}

/** Send SMTP command and wait for response */
async function smtpCmd(socket: tls.TLSSocket, cmd: string): Promise<string> {
  socket.write(cmd + "\r\n");
  return readSmtp(socket);
}

/** Build RFC 2822 MIME message */
function buildMessage(opts: {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  html?: string;
}): string {
  const boundary = `----NodeBench${Date.now()}`;
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to.join(", ")}`,
    ...(opts.cc?.length ? [`Cc: ${opts.cc.join(", ")}`] : []),
    `Subject: ${opts.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `X-Mailer: NodeBench-MCP`,
  ];

  if (opts.html) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    return [
      ...headers,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      opts.body,
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      opts.html,
      `--${boundary}--`,
    ].join("\r\n");
  }

  headers.push("Content-Type: text/plain; charset=UTF-8");
  return [...headers, "", opts.body].join("\r\n");
}

/** Send email via SMTP over TLS (port 465) */
async function sendEmail(opts: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
}): Promise<string> {
  const config = getSmtpConfig();

  const socket = tls.connect({ host: config.host, port: config.port, rejectUnauthorized: true });
  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });

  try {
    await readSmtp(socket); // 220 greeting
    await smtpCmd(socket, `EHLO nodebench`);
    await smtpCmd(socket, `AUTH LOGIN`);
    await smtpCmd(socket, Buffer.from(config.user).toString("base64"));
    await smtpCmd(socket, Buffer.from(config.pass).toString("base64"));

    await smtpCmd(socket, `MAIL FROM:<${config.user}>`);
    const allRecipients = [...opts.to, ...(opts.cc || []), ...(opts.bcc || [])];
    for (const rcpt of allRecipients) {
      await smtpCmd(socket, `RCPT TO:<${rcpt}>`);
    }

    await smtpCmd(socket, "DATA");

    const message = buildMessage({
      from: config.user,
      to: opts.to,
      cc: opts.cc,
      subject: opts.subject,
      body: opts.body,
      html: opts.html,
    });

    // Dot-stuff: lines starting with "." get an extra "." per RFC 5321
    const escaped = message.replace(/\r\n\./g, "\r\n..");
    socket.write(escaped + "\r\n.\r\n");
    await readSmtp(socket); // 250 OK

    await smtpCmd(socket, "QUIT").catch(() => {}); // QUIT may not get a reply
    return `Email sent to ${opts.to.join(", ")}`;
  } finally {
    socket.destroy();
  }
}

// ── IMAP helpers ─────────────────────────────────────────────────────────────

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
}

/** Read IMAP response until tagged completion (e.g., "A001 OK ...") */
function readImap(socket: tls.TLSSocket, tag: string, timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => {
      socket.removeAllListeners("data");
      reject(new Error(`IMAP read timeout waiting for ${tag}`));
    }, timeoutMs);

    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      if (buf.includes(`${tag} OK`) || buf.includes(`${tag} NO`) || buf.includes(`${tag} BAD`)) {
        clearTimeout(timer);
        socket.removeListener("data", onData);
        if (buf.includes(`${tag} NO`) || buf.includes(`${tag} BAD`)) {
          reject(new Error(`IMAP error: ${buf.substring(buf.indexOf(tag), buf.indexOf(tag) + 200).trim()}`));
        } else {
          resolve(buf.trim());
        }
      }
    };
    socket.on("data", onData);
  });
}

/** Read untagged IMAP greeting */
function readImapGreeting(socket: tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("IMAP greeting timeout")), 10000);
    const onData = (chunk: Buffer) => {
      const data = chunk.toString();
      if (data.startsWith("* OK") || data.startsWith("* PREAUTH")) {
        clearTimeout(timer);
        socket.removeListener("data", onData);
        resolve(data.trim());
      }
    };
    socket.on("data", onData);
  });
}

/** Extract header value from raw RFC822 headers */
function getHeader(headers: string, name: string): string {
  // Handle folded headers (continuation lines start with whitespace)
  const re = new RegExp(`^${name}:\\s*(.+?)(?=\\r\\n[^\\s]|\\r\\n$|$)`, "ims");
  const m = headers.match(re);
  return m ? m[1].replace(/\r\n\s+/g, " ").trim() : "";
}

/** Parse basic email from raw RFC822 text */
function parseRawEmail(raw: string, msgId: string): EmailMessage {
  // Split headers from body at first double CRLF
  const splitIdx = raw.indexOf("\r\n\r\n");
  const headersPart = splitIdx > 0 ? raw.substring(0, splitIdx) : raw;
  const bodyPart = splitIdx > 0 ? raw.substring(splitIdx + 4) : "";

  // For multipart, try to extract text/plain
  let body = bodyPart;
  const ctHeader = getHeader(headersPart, "Content-Type");
  if (ctHeader.includes("multipart")) {
    const bMatch = ctHeader.match(/boundary="?([^";\r\n]+)"?/);
    if (bMatch) {
      const parts = body.split(`--${bMatch[1]}`);
      for (const part of parts) {
        if (part.toLowerCase().includes("text/plain")) {
          const partSplit = part.indexOf("\r\n\r\n");
          if (partSplit > 0) {
            body = part.substring(partSplit + 4).trim();
            break;
          }
        }
      }
    }
  }

  // Clean trailing IMAP artifacts
  body = body.replace(/\)\s*$/, "").trim();

  return {
    id: msgId,
    from: getHeader(headersPart, "From"),
    to: getHeader(headersPart, "To"),
    subject: getHeader(headersPart, "Subject"),
    date: getHeader(headersPart, "Date"),
    body: body.substring(0, 5000),
  };
}

/** Read emails from IMAP mailbox */
async function readEmails(opts: {
  folder?: string;
  limit?: number;
  search?: string;
}): Promise<EmailMessage[]> {
  const config = getImapConfig();
  const folder = opts.folder || "INBOX";
  const limit = Math.min(opts.limit || 10, 50);
  const search = opts.search || "ALL";

  const socket = tls.connect({ host: config.host, port: config.port, rejectUnauthorized: true });
  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });

  let tagNum = 0;
  const tag = () => `A${String(++tagNum).padStart(4, "0")}`;

  try {
    await readImapGreeting(socket);

    const t1 = tag();
    socket.write(`${t1} LOGIN "${config.user}" "${config.pass}"\r\n`);
    await readImap(socket, t1);

    const t2 = tag();
    socket.write(`${t2} SELECT "${folder}"\r\n`);
    await readImap(socket, t2);

    const t3 = tag();
    socket.write(`${t3} SEARCH ${search}\r\n`);
    const searchResult = await readImap(socket, t3);

    // Parse "* SEARCH 1 2 3 4 5"
    const searchLine = searchResult.split("\r\n").find((l) => l.startsWith("* SEARCH"));
    const ids = searchLine
      ? searchLine.replace("* SEARCH", "").trim().split(/\s+/).filter(Boolean)
      : [];

    const recentIds = ids.slice(-limit);
    const messages: EmailMessage[] = [];

    for (const id of recentIds) {
      const t = tag();
      socket.write(`${t} FETCH ${id} RFC822\r\n`);
      const fetchResult = await readImap(socket, t, 30000);
      messages.push(parseRawEmail(fetchResult, id));
    }

    const tLogout = tag();
    socket.write(`${tLogout} LOGOUT\r\n`);
    await readImap(socket, tLogout).catch(() => {});

    return messages.reverse(); // Most recent first
  } finally {
    socket.destroy();
  }
}

// ── Tools ────────────────────────────────────────────────────────────────────

export const emailTools: McpTool[] = [
  {
    name: "send_email",
    description:
      "Send an email via SMTP over TLS. Requires EMAIL_USER and EMAIL_PASS env vars. Defaults to Gmail SMTP (smtp.gmail.com:465). For Gmail, use an App Password (Google Account → Security → 2-Step Verification → App passwords). Override host/port with EMAIL_SMTP_HOST and EMAIL_SMTP_PORT. Supports plain text and HTML multipart.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: {
          type: "array",
          items: { type: "string" },
          description: "Recipient email addresses",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        body: {
          type: "string",
          description: "Plain text email body",
        },
        cc: {
          type: "array",
          items: { type: "string" },
          description: "CC recipients (optional)",
        },
        bcc: {
          type: "array",
          items: { type: "string" },
          description: "BCC recipients (optional)",
        },
        html: {
          type: "string",
          description: "HTML email body (optional — sent as multipart/alternative with plain text)",
        },
      },
      required: ["to", "subject", "body"],
    },
    handler: async (args: Record<string, unknown>) => {
      const to = args.to as string[];
      const subject = args.subject as string;
      const body = args.body as string;
      const cc = args.cc as string[] | undefined;
      const bcc = args.bcc as string[] | undefined;
      const html = args.html as string | undefined;

      const result = await sendEmail({ to, subject, body, cc, bcc, html });
      return [{ type: "text" as const, text: JSON.stringify({ success: true, message: result }) }];
    },
  },
  {
    name: "read_emails",
    description:
      "Read emails from an IMAP mailbox over TLS. Requires EMAIL_USER and EMAIL_PASS env vars. Defaults to Gmail IMAP (imap.gmail.com:993). For Gmail, enable IMAP in Settings and use an App Password. Returns emails with headers (from, to, subject, date) and plain text body. Use IMAP SEARCH syntax to filter.",
    inputSchema: {
      type: "object" as const,
      properties: {
        folder: {
          type: "string",
          description: 'IMAP folder (default: INBOX). Common: INBOX, Sent, Drafts, [Gmail]/All Mail',
        },
        limit: {
          type: "number",
          description: "Maximum emails to return, most recent first (default: 10, max: 50)",
        },
        search: {
          type: "string",
          description:
            'IMAP SEARCH criteria (default: ALL). Examples: UNSEEN, FROM "sender@example.com", SUBJECT "keyword", SINCE 01-Jan-2026, OR UNSEEN FLAGGED',
        },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      const folder = args.folder as string | undefined;
      const limit = args.limit as number | undefined;
      const search = args.search as string | undefined;

      const messages = await readEmails({ folder, limit, search });
      return [
        {
          type: "text" as const,
          text: JSON.stringify({ count: messages.length, emails: messages }),
        },
      ];
    },
  },
  {
    name: "draft_email_reply",
    description:
      "Structure an email thread for reply drafting. Parses the thread, extracts context (from, subject, date), and builds a reply prompt with your instructions and desired tone. Returns a structured draft ready to review and send via send_email, or to refine via call_llm.",
    inputSchema: {
      type: "object" as const,
      properties: {
        thread: {
          type: "string",
          description: "The original email thread text (copy-paste or from read_emails output)",
        },
        instructions: {
          type: "string",
          description:
            'Instructions for the reply (e.g., "Accept the meeting", "Decline politely and suggest next week", "Ask for clarification on the budget")',
        },
        tone: {
          type: "string",
          enum: ["professional", "casual", "formal", "friendly"],
          description: "Desired tone for the reply (default: professional)",
        },
        include_original: {
          type: "boolean",
          description: "Include the original message below the reply (default: true)",
        },
      },
      required: ["thread", "instructions"],
    },
    handler: async (args: Record<string, unknown>) => {
      const thread = args.thread as string;
      const instructions = args.instructions as string;
      const tone = (args.tone as string) || "professional";
      const includeOriginal = args.include_original !== false;

      // Extract context from the thread
      const fromMatch = thread.match(/[Ff]rom:\s*(.+)/);
      const subjectMatch = thread.match(/[Ss]ubject:\s*(.+)/);
      const dateMatch = thread.match(/[Dd]ate:\s*(.+)/);

      const replySubject = subjectMatch
        ? subjectMatch[1].startsWith("Re:") ? subjectMatch[1].trim() : `Re: ${subjectMatch[1].trim()}`
        : "Re: (no subject)";

      const draft = {
        to: fromMatch ? fromMatch[1].trim() : "(extract from thread)",
        subject: replySubject,
        replyPrompt: [
          `Draft a ${tone} email reply.`,
          `Instructions: ${instructions}`,
          "",
          "--- Original thread ---",
          thread.substring(0, 3000),
          "--- End of thread ---",
        ].join("\n"),
        quotedOriginal: includeOriginal
          ? `\n\n--- Original Message ---\n${thread.substring(0, 2000)}`
          : "",
        metadata: {
          originalFrom: fromMatch?.[1]?.trim(),
          originalSubject: subjectMatch?.[1]?.trim(),
          originalDate: dateMatch?.[1]?.trim(),
          tone,
        },
      };

      return [{ type: "text" as const, text: JSON.stringify(draft) }];
    },
  },
  {
    name: "check_email_setup",
    description:
      "Diagnostic wizard for email tool configuration. Checks env vars (EMAIL_USER, EMAIL_PASS, etc.), optionally tests SMTP/IMAP connections, and returns step-by-step setup instructions for missing pieces. Supports Gmail, Outlook, Yahoo, and custom SMTP/IMAP. Run this FIRST before using send_email or read_emails.",
    inputSchema: {
      type: "object" as const,
      properties: {
        provider: {
          type: "string",
          enum: ["gmail", "outlook", "yahoo", "custom"],
          description: "Email provider for tailored setup instructions (default: auto-detect from EMAIL_USER or 'gmail')",
        },
        test_connection: {
          type: "boolean",
          description: "Actually test SMTP and IMAP connections (default: false — just checks env vars)",
        },
        generate_config: {
          type: "boolean",
          description: "Generate MCP config snippet with env vars for Claude Code / Cursor (default: true)",
        },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      const testConnection = args.test_connection === true;
      const generateConfig = args.generate_config !== false;

      // ── Check env vars ──
      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;
      const smtpHost = process.env.EMAIL_SMTP_HOST;
      const smtpPort = process.env.EMAIL_SMTP_PORT;
      const imapHost = process.env.EMAIL_IMAP_HOST;
      const imapPort = process.env.EMAIL_IMAP_PORT;

      const checks: Array<{ item: string; status: "ok" | "missing" | "optional"; value?: string; hint?: string }> = [];

      checks.push({
        item: "EMAIL_USER",
        status: user ? "ok" : "missing",
        value: user ? `${user.substring(0, 3)}***` : undefined,
        hint: !user ? "Your email address (e.g., agent@gmail.com)" : undefined,
      });

      checks.push({
        item: "EMAIL_PASS",
        status: pass ? "ok" : "missing",
        hint: !pass ? "App password (NOT your regular password). See setup instructions below." : undefined,
      });

      checks.push({
        item: "EMAIL_SMTP_HOST",
        status: smtpHost ? "ok" : "optional",
        value: smtpHost || "(default: smtp.gmail.com)",
        hint: "Only needed for non-Gmail providers",
      });

      checks.push({
        item: "EMAIL_SMTP_PORT",
        status: smtpPort ? "ok" : "optional",
        value: smtpPort || "(default: 465)",
      });

      checks.push({
        item: "EMAIL_IMAP_HOST",
        status: imapHost ? "ok" : "optional",
        value: imapHost || "(default: imap.gmail.com)",
        hint: "Only needed for non-Gmail providers",
      });

      checks.push({
        item: "EMAIL_IMAP_PORT",
        status: imapPort ? "ok" : "optional",
        value: imapPort || "(default: 993)",
      });

      const ready = checks.filter((c) => c.status === "missing").length === 0;

      // ── Auto-detect provider ──
      let provider = args.provider as string | undefined;
      if (!provider && user) {
        if (user.includes("gmail")) provider = "gmail";
        else if (user.includes("outlook") || user.includes("hotmail") || user.includes("live")) provider = "outlook";
        else if (user.includes("yahoo")) provider = "yahoo";
        else provider = "custom";
      }
      if (!provider) provider = "gmail";

      // ── Provider-specific setup instructions ──
      const providerGuides: Record<string, { name: string; smtp: string; imap: string; steps: string[] }> = {
        gmail: {
          name: "Gmail",
          smtp: "smtp.gmail.com:465",
          imap: "imap.gmail.com:993",
          steps: [
            "1. Go to https://myaccount.google.com/security",
            "2. Enable 2-Step Verification (required for App Passwords)",
            "3. Go to https://myaccount.google.com/apppasswords",
            "4. Select 'Other (Custom name)', enter 'NodeBench MCP', click Generate",
            "5. Copy the 16-character password (spaces are OK to remove)",
            "6. Set EMAIL_USER=your.email@gmail.com",
            "7. Set EMAIL_PASS=your-16-char-app-password",
            "8. Enable IMAP: Gmail Settings → Forwarding and POP/IMAP → Enable IMAP",
          ],
        },
        outlook: {
          name: "Outlook / Hotmail / Live",
          smtp: "smtp-mail.outlook.com:587",
          imap: "outlook.office365.com:993",
          steps: [
            "1. Go to https://account.microsoft.com/security",
            "2. Enable two-step verification",
            "3. Go to https://account.microsoft.com/security → App passwords",
            "4. Create a new app password, copy it",
            "5. Set EMAIL_USER=your.email@outlook.com",
            "6. Set EMAIL_PASS=your-app-password",
            "7. Set EMAIL_SMTP_HOST=smtp-mail.outlook.com",
            "8. Set EMAIL_SMTP_PORT=587",
            "9. Set EMAIL_IMAP_HOST=outlook.office365.com",
            "Note: Outlook uses STARTTLS on port 587 (not implicit TLS on 465). NodeBench defaults to Gmail's port 465. You MUST set EMAIL_SMTP_PORT=587 and EMAIL_SMTP_HOST.",
          ],
        },
        yahoo: {
          name: "Yahoo Mail",
          smtp: "smtp.mail.yahoo.com:465",
          imap: "imap.mail.yahoo.com:993",
          steps: [
            "1. Go to https://login.yahoo.com/account/security",
            "2. Enable two-step verification",
            "3. Generate an app password: Account Security → Generate app password",
            "4. Set EMAIL_USER=your.email@yahoo.com",
            "5. Set EMAIL_PASS=your-app-password",
            "6. Set EMAIL_SMTP_HOST=smtp.mail.yahoo.com",
            "7. Set EMAIL_IMAP_HOST=imap.mail.yahoo.com",
          ],
        },
        custom: {
          name: "Custom SMTP/IMAP",
          smtp: "(set EMAIL_SMTP_HOST and EMAIL_SMTP_PORT)",
          imap: "(set EMAIL_IMAP_HOST and EMAIL_IMAP_PORT)",
          steps: [
            "1. Get your SMTP server hostname and port from your email provider",
            "2. Get your IMAP server hostname and port from your email provider",
            "3. Set EMAIL_USER=your email address",
            "4. Set EMAIL_PASS=your password or app password",
            "5. Set EMAIL_SMTP_HOST=your.smtp.server",
            "6. Set EMAIL_SMTP_PORT=465 (or 587 for STARTTLS)",
            "7. Set EMAIL_IMAP_HOST=your.imap.server",
            "8. Set EMAIL_IMAP_PORT=993",
            "Note: NodeBench uses implicit TLS (port 465). If your provider requires STARTTLS (port 587), it may not work yet.",
          ],
        },
      };

      const guide = providerGuides[provider];

      // ── Connection test ──
      let smtpTest: { status: string; message: string } | null = null;
      let imapTest: { status: string; message: string } | null = null;

      if (testConnection && ready) {
        // Test SMTP
        try {
          const config = getSmtpConfig();
          const socket = tls.connect({ host: config.host, port: config.port, rejectUnauthorized: true });
          await new Promise<void>((resolve, reject) => {
            socket.once("secureConnect", resolve);
            socket.once("error", reject);
          });
          const greeting = await readSmtp(socket, 5000);
          await smtpCmd(socket, "EHLO nodebench-setup-check");
          await smtpCmd(socket, "AUTH LOGIN");
          await smtpCmd(socket, Buffer.from(config.user).toString("base64"));
          await smtpCmd(socket, Buffer.from(config.pass).toString("base64"));
          await smtpCmd(socket, "QUIT").catch(() => {});
          socket.destroy();
          smtpTest = { status: "ok", message: `SMTP connected and authenticated. Server: ${greeting.split("\r\n")[0]}` };
        } catch (e) {
          smtpTest = { status: "error", message: `SMTP failed: ${(e as Error).message}` };
        }

        // Test IMAP
        try {
          const config = getImapConfig();
          const socket = tls.connect({ host: config.host, port: config.port, rejectUnauthorized: true });
          await new Promise<void>((resolve, reject) => {
            socket.once("secureConnect", resolve);
            socket.once("error", reject);
          });
          const greeting = await readImapGreeting(socket);
          socket.write('A001 LOGIN "' + config.user + '" "' + config.pass + '"\r\n');
          await readImap(socket, "A001");
          socket.write("A002 LIST \"\" \"*\"\r\n");
          const listResult = await readImap(socket, "A002");
          const folders = listResult.split("\r\n")
            .filter((l) => l.startsWith("* LIST"))
            .map((l) => {
              const m = l.match(/"([^"]+)"$/);
              return m ? m[1] : l;
            });
          socket.write("A003 LOGOUT\r\n");
          socket.destroy();
          imapTest = { status: "ok", message: `IMAP connected. ${folders.length} folders: ${folders.slice(0, 8).join(", ")}` };
        } catch (e) {
          imapTest = { status: "error", message: `IMAP failed: ${(e as Error).message}` };
        }
      }

      // ── Generate MCP config snippet ──
      let configSnippet: string | null = null;
      if (generateConfig) {
        configSnippet = JSON.stringify({
          mcpServers: {
            nodebench: {
              command: "npx",
              args: ["-y", "nodebench-mcp"],
              env: {
                EMAIL_USER: user || "your.email@gmail.com",
                EMAIL_PASS: pass ? "(already set)" : "your-16-char-app-password",
                ...(provider !== "gmail" ? {
                  EMAIL_SMTP_HOST: smtpHost || guide.smtp.split(":")[0],
                  EMAIL_SMTP_PORT: smtpPort || guide.smtp.split(":")[1],
                  EMAIL_IMAP_HOST: imapHost || guide.imap.split(":")[0],
                  EMAIL_IMAP_PORT: imapPort || guide.imap.split(":")[1],
                } : {}),
              },
            },
          },
        }, null, 2);
      }

      return [
        {
          type: "text" as const,
          text: JSON.stringify({
            ready,
            provider: guide.name,
            checks,
            ...(ready ? {} : { setupInstructions: guide.steps }),
            ...(smtpTest ? { smtpConnectionTest: smtpTest } : {}),
            ...(imapTest ? { imapConnectionTest: imapTest } : {}),
            ...(configSnippet ? { mcpConfigSnippet: configSnippet } : {}),
            nextSteps: ready
              ? [
                  "Email is configured! Try: send_email to send, read_emails to read inbox.",
                  "Run with test_connection=true to verify SMTP/IMAP connectivity.",
                  "Use get_workflow_chain('email_assistant') for the full workflow.",
                  "Use get_workflow_chain('research_digest') to set up automated research digests.",
                ]
              : [
                  `Follow the ${guide.name} setup instructions above.`,
                  "Set the env vars in your MCP config (see mcpConfigSnippet) or shell profile.",
                  "Re-run check_email_setup to verify.",
                  "Then run with test_connection=true to test SMTP/IMAP.",
                ],
          }),
        },
      ];
    },
  },
];
