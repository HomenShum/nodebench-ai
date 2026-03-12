/**
 * NodeBench Onboarding Flows — Figma Plugin Script
 *
 * Paste this into Figma's Plugin Console (Plugins → Development → Open console)
 *
 * Creates a page "Onboarding Flows" with high-fidelity wireframes for all 14 screens:
 *
 *   Flow 1: Agent Guided Onboarding (4 steps)
 *     1.1 Welcome — Meet Your AI Assistants
 *     1.2 Fast Agent — Quick answers, instant actions
 *     1.3 Deep Agent — Multi-step planning
 *     1.4 Ready to Start
 *
 *   Flow 2: Operator Profile Wizard (3 states)
 *     2.1 Saved Profile — Compact card
 *     2.2 Step 1 — Profile Form (name, role, domains, goals)
 *     2.3 Step 2 — Schedule Selection
 *
 *   Flow 3: Proactive Onboarding / Smart Alerts (5 steps)
 *     3.1 Welcome to Smart Alerts
 *     3.2 Privacy & Consent
 *     3.3 Choose Features
 *     3.4 Configure Preferences
 *     3.5 Success / Confirmation
 *
 *   Flow 4: Tutorial Page (2 states)
 *     4.1 In-Progress — Checklist + Chat
 *     4.2 All Complete — Congratulations
 */

// ══════════════════════════════════════════════════════════════════════
// COLOR PALETTE (from src/index.css)
// ══════════════════════════════════════════════════════════════════════

function rgb(r, g, b) { return { r: r / 255, g: g / 255, b: b / 255 }; }
function solid(r, g, b) { return [{ type: "SOLID", color: rgb(r, g, b) }]; }
function solidA(r, g, b, a) { return [{ type: "SOLID", color: rgb(r, g, b), opacity: a }]; }

const C = {
  bg:         rgb(250, 250, 250),
  surface:    rgb(255, 255, 255),
  surfaceSec: rgb(243, 244, 246),
  text:       rgb(17, 24, 39),
  textSec:    rgb(107, 114, 128),
  textMuted:  rgb(156, 163, 175),
  border:     rgb(229, 231, 235),
  accent:     rgb(94, 106, 210),
  accentBg:   rgb(238, 240, 253),
  indigo500:  rgb(99, 102, 241),
  indigo600:  rgb(79, 70, 229),
  blue500:    rgb(59, 130, 246),
  blueBg:     rgb(239, 246, 255),
  green500:   rgb(34, 197, 94),
  greenBg:    rgb(240, 253, 244),
  green600:   rgb(22, 163, 74),
  amber500:   rgb(245, 158, 11),
  amberBg:    rgb(255, 251, 235),
  purple500:  rgb(168, 85, 247),
  purpleBg:   rgb(250, 245, 255),
  red500:     rgb(239, 68, 68),
  white:      rgb(255, 255, 255),
  black:      rgb(0, 0, 0),
  gray100:    rgb(243, 244, 246),
  gray200:    rgb(229, 231, 235),
  gray300:    rgb(209, 213, 219),
  gray700:    rgb(55, 65, 81),
  gray900:    rgb(17, 24, 39),
  violet500:  rgb(139, 92, 246),
  cyan500:    rgb(6, 182, 212),
  orange500:  rgb(249, 115, 22),
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

async function loadFont(family = "Inter", style = "Regular") {
  try {
    await figma.loadFontAsync({ family, style });
    return true;
  } catch {
    await figma.loadFontAsync({ family: "Roboto", style });
    return false;
  }
}

function createFrame(name, x, y, w, h, fills) {
  const f = figma.createFrame();
  f.name = name;
  f.x = x; f.y = y;
  f.resize(w, h);
  if (fills) f.fills = fills;
  f.clipsContent = true;
  return f;
}

function createRect(parent, x, y, w, h, fills, radius) {
  const r = figma.createRectangle();
  r.x = x; r.y = y;
  r.resize(w, h);
  if (fills) r.fills = fills;
  if (radius !== undefined) r.cornerRadius = radius;
  parent.appendChild(r);
  return r;
}

function createText(parent, x, y, content, size, color, opts = {}) {
  const t = figma.createText();
  t.x = x; t.y = y;
  t.characters = content;
  t.fontSize = size;
  t.fills = [{ type: "SOLID", color }];
  if (opts.bold) t.fontName = { family: "Inter", style: "Bold" };
  else if (opts.semibold) t.fontName = { family: "Inter", style: "Semi Bold" };
  else if (opts.medium) t.fontName = { family: "Inter", style: "Medium" };
  else t.fontName = { family: "Inter", style: "Regular" };
  if (opts.width) { t.resize(opts.width, t.height); t.textAutoResize = "HEIGHT"; }
  parent.appendChild(t);
  return t;
}

function createCircle(parent, x, y, d, fills) {
  const e = figma.createEllipse();
  e.x = x; e.y = y;
  e.resize(d, d);
  if (fills) e.fills = fills;
  parent.appendChild(e);
  return e;
}

function createLine(parent, x1, y1, x2, y2, color, strokeWeight = 2) {
  const l = figma.createLine();
  l.x = x1; l.y = y1;
  l.rotation = -Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  l.resize(len, 0);
  l.strokes = [{ type: "SOLID", color }];
  l.strokeWeight = strokeWeight;
  parent.appendChild(l);
  return l;
}

// Flow arrow between two frames
function createArrow(parent, fromFrame, toFrame) {
  const x1 = fromFrame.x + fromFrame.width;
  const y1 = fromFrame.y + fromFrame.height / 2;
  const x2 = toFrame.x;
  const y2 = toFrame.y + toFrame.height / 2;
  const midX = (x1 + x2) / 2;

  // Horizontal line from source
  createLine(parent, x1, y1, midX, y1, C.gray300, 2);
  // Vertical connector if needed
  if (Math.abs(y2 - y1) > 2) {
    createLine(parent, midX, y1, midX, y2, C.gray300, 2);
  }
  // Horizontal line to target
  createLine(parent, midX, y2, x2 - 8, y2, C.gray300, 2);

  // Arrowhead triangle
  const tri = figma.createPolygon();
  tri.pointCount = 3;
  tri.resize(12, 10);
  tri.x = x2 - 12;
  tri.y = y2 - 5;
  tri.rotation = 90;
  tri.fills = [{ type: "SOLID", color: C.gray300 }];
  parent.appendChild(tri);
}

// Section header
function createSectionHeader(parent, x, y, label, color) {
  const bar = createRect(parent, x, y, 4, 28, [{ type: "SOLID", color }], 2);
  createText(parent, x + 12, y + 2, label, 20, C.text, { bold: true });
}

// Step indicator pill
function createStepPill(parent, x, y, num, label, state) {
  // state: "current" | "completed" | "future"
  let bgColor, textColor;
  if (state === "current") { bgColor = C.blue500; textColor = C.white; }
  else if (state === "completed") { bgColor = C.green500; textColor = C.white; }
  else { bgColor = C.surfaceSec; textColor = C.textSec; }

  const pill = createRect(parent, x, y, 32, 32, [{ type: "SOLID", color: bgColor }], 16);
  const numStr = state === "completed" ? "✓" : String(num);
  createText(parent, x + (state === "completed" ? 9 : 11), y + 7, numStr, 14, textColor, { semibold: true });
  if (label) {
    createText(parent, x + 40, y + 7, label, 12, C.textSec, { medium: true });
  }
}

// Feature bullet with checkmark circle
function createFeatureBullet(parent, x, y, text, accentColor, width) {
  createCircle(parent, x, y + 1, 18, [{ type: "SOLID", color: accentColor }]);
  createText(parent, x + 4, y + 2, "✓", 10, C.white, { bold: true });
  createText(parent, x + 26, y, text, 13, C.text, { width: width - 30 });
}

// Card with border
function createCard(parent, x, y, w, h, opts = {}) {
  const card = createRect(parent, x, y, w, h, [{ type: "SOLID", color: opts.fill || C.surface }], opts.radius || 8);
  card.strokes = [{ type: "SOLID", color: opts.borderColor || C.border }];
  card.strokeWeight = 1;
  return card;
}

// Button
function createButton(parent, x, y, label, variant, opts = {}) {
  const w = opts.width || (label.length * 8 + 32);
  const h = opts.height || 36;
  let bgColor, txtColor;
  if (variant === "primary") { bgColor = C.accent; txtColor = C.white; }
  else if (variant === "indigo") { bgColor = C.indigo500; txtColor = C.white; }
  else if (variant === "green") { bgColor = C.green500; txtColor = C.white; }
  else if (variant === "blue") { bgColor = C.blue500; txtColor = C.white; }
  else if (variant === "gradient-violet") { bgColor = C.violet500; txtColor = C.white; }
  else if (variant === "gradient-amber") { bgColor = C.amber500; txtColor = C.white; }
  else if (variant === "gradient-blue") { bgColor = C.blue500; txtColor = C.white; }
  else if (variant === "gradient-green") { bgColor = C.green500; txtColor = C.white; }
  else { bgColor = C.surfaceSec; txtColor = C.textSec; } // ghost
  createRect(parent, x, y, w, h, [{ type: "SOLID", color: bgColor }], 8);
  createText(parent, x + 12, y + 9, label, 13, txtColor, { semibold: true });
}

// Input field
function createInput(parent, x, y, w, placeholder) {
  createCard(parent, x, y, w, 38);
  createText(parent, x + 12, y + 10, placeholder, 13, C.textMuted);
}

// ══════════════════════════════════════════════════════════════════════
// FLOW 1: AGENT GUIDED ONBOARDING
// ══════════════════════════════════════════════════════════════════════

function buildAgentOnboardingStep(parent, x, y, step) {
  const W = 480, H = 520;
  // Modal background
  createCard(parent, x, y, W, H, { radius: 12 });

  // Screen label
  createText(parent, x, y - 24, `1.${step.num} ${step.id}`, 11, C.textMuted, { medium: true });

  // Progress dots
  for (let i = 0; i < 4; i++) {
    const dotW = i === step.num - 1 ? 24 : 8;
    const dotX = x + W / 2 - 28 + i * 16;
    createRect(parent, dotX, y + 16, dotW, 8, [{ type: "SOLID", color: i === step.num - 1 ? C.gray900 : C.surfaceSec }], 4);
  }

  // Icon with gradient bg
  createRect(parent, x + 32, y + 48, 56, 56, [{ type: "SOLID", color: step.iconBg }], 12);
  createText(parent, x + 46, y + 60, step.iconEmoji, 24, C.white, { bold: true });

  // Title + subtitle
  createText(parent, x + 32, y + 120, step.title, 26, C.text, { bold: true, width: W - 64 });
  createText(parent, x + 32, y + 152, step.subtitle, 11, C.textSec, { semibold: true, width: W - 64 });

  // Description
  createText(parent, x + 32, y + 176, step.description, 16, C.text, { width: W - 64 });

  // Features
  let fy = y + 240;
  for (const feat of step.features) {
    createFeatureBullet(parent, x + 32, fy, feat, step.iconBg, W - 64);
    fy += 32;
  }

  // Navigation buttons
  createButton(parent, x + 32, y + H - 56, "Previous", "ghost");
  createButton(parent, x + W - 160, y + H - 56,
    step.num === 4 ? "Get Started →" : "Next →",
    step.btnVariant, { width: 128 });

  return { x, y, width: W, height: H };
}

function buildFlow1(parent, startX, startY) {
  const steps = [
    { num: 1, id: "welcome", title: "Meet Your AI Assistants", subtitle: "Two powerful agents, one unified experience",
      description: "Your AI workspace combines fast, conversational AI with deep, document-aware intelligence.",
      iconBg: C.violet500, iconEmoji: "✨", btnVariant: "gradient-violet",
      features: ["Real-time assistance for quick questions", "Deep analysis for complex research", "Seamless context switching"] },
    { num: 2, id: "fast-agent", title: "Fast Agent", subtitle: "Quick answers, instant actions",
      description: "The Fast Agent is your go-to for rapid interactions. Access it via the ⚡ button or slash commands.",
      iconBg: C.orange500, iconEmoji: "⚡", btnVariant: "gradient-amber",
      features: ["Chat-style Q&A with web search", "Slash commands: /search, /summarize", "Context-aware suggestions", "Works in seconds, not minutes"] },
    { num: 3, id: "deep-agent", title: "Deep Agent", subtitle: "Multi-step planning & document editing",
      description: "The Deep Agent handles complex tasks requiring planning, memory, and persistent context.",
      iconBg: C.blue500, iconEmoji: "🧠", btnVariant: "gradient-blue",
      features: ["Creates and edits documents autonomously", "Builds research dossiers with citations", "Remembers context across sessions", "Plans multi-step workflows"] },
    { num: 4, id: "ready", title: "Ready to Start?", subtitle: "Your workspace awaits",
      description: "Open a document and try the Fast Agent, or ask the Deep Agent to research a topic for you.",
      iconBg: C.green500, iconEmoji: "✅", btnVariant: "gradient-green",
      features: ["Type '/' in any document for commands", "Click ⚡ to open the Fast Agent panel", "Start a new dossier for deep research"] },
  ];

  createSectionHeader(parent, startX, startY, "Flow 1: Agent Guided Onboarding", C.violet500);

  const frames = [];
  const gap = 80;
  let cx = startX;
  for (const step of steps) {
    const f = buildAgentOnboardingStep(parent, cx, startY + 48, step);
    frames.push(f);
    cx += f.width + gap;
  }

  // Flow arrows
  for (let i = 0; i < frames.length - 1; i++) {
    createArrow(parent, frames[i], frames[i + 1]);
  }

  return { totalWidth: cx - startX, totalHeight: 520 + 72 };
}

// ══════════════════════════════════════════════════════════════════════
// FLOW 2: OPERATOR PROFILE WIZARD
// ══════════════════════════════════════════════════════════════════════

function buildProfileSaved(parent, x, y) {
  const W = 400, H = 140;
  createText(parent, x, y - 24, "2.1 Saved Profile", 11, C.textMuted, { medium: true });
  createCard(parent, x, y, W, H);

  // Avatar
  createCircle(parent, x + 16, y + 16, 32, [{ type: "SOLID", color: C.accentBg }]);
  createText(parent, x + 24, y + 22, "👤", 16, C.accent);

  // Name + role
  createText(parent, x + 58, y + 16, "Homen Shum", 14, C.text, { semibold: true });
  createText(parent, x + 58, y + 34, "Builder-Analyst · AI/ML, Finance, SaaS", 11, C.textSec);

  // Edit button
  createButton(parent, x + W - 72, y + 16, "✏ Edit", "ghost", { width: 56, height: 28 });

  // Goal pills
  const goals = ["Stay informed on my domains", "Track AI developments", "Build agentic tools"];
  let gx = x + 16;
  for (const g of goals) {
    const pw = g.length * 6.5 + 16;
    createRect(parent, gx, y + 76, pw, 24, [{ type: "SOLID", color: C.surfaceSec }], 4);
    createText(parent, gx + 8, y + 82, g, 11, C.textSec);
    gx += pw + 8;
  }

  return { x, y, width: W, height: H };
}

function buildProfileStep1(parent, x, y) {
  const W = 400, H = 520;
  createText(parent, x, y - 24, "2.2 Step 1 — Profile Form", 11, C.textMuted, { medium: true });
  createCard(parent, x, y, W, H);

  // Step indicators
  createRect(parent, x + 16, y + 16, 80, 28, [{ type: "SOLID", color: C.indigo500 }], 6);
  createText(parent, x + 28, y + 22, "👤 You", 12, C.white, { semibold: true });
  createText(parent, x + 104, y + 22, "›", 12, C.gray300);
  createRect(parent, x + 116, y + 16, 100, 28, [{ type: "SOLID", color: C.surfaceSec }], 6);
  createText(parent, x + 126, y + 22, "🕐 Schedule", 12, C.textSec, { medium: true });

  // Form fields
  let fy = y + 64;
  createText(parent, x + 16, fy, "Name *", 12, C.textSec, { medium: true });
  createInput(parent, x + 16, fy + 18, W - 32, "How should the agent address you?");
  fy += 64;

  createText(parent, x + 16, fy, "Role", 12, C.textSec, { medium: true });
  createInput(parent, x + 16, fy + 18, W - 32, "e.g., Product Manager, Founder");
  fy += 64;

  createText(parent, x + 16, fy, "Domains", 12, C.textSec, { medium: true });
  createInput(parent, x + 16, fy + 18, W - 76, "Add a domain...");
  createButton(parent, x + W - 56, fy + 18, "+", "indigo", { width: 38, height: 38 });
  fy += 60;

  // Domain suggestions
  createText(parent, x + 16, fy, "Suggestions:", 11, C.textMuted);
  const domains = ["AI/ML", "Finance", "SaaS", "Crypto", "Healthcare", "DevTools"];
  let dx = x + 80;
  for (const d of domains) {
    const dw = d.length * 7 + 16;
    createRect(parent, dx, fy - 4, dw, 22, [{ type: "SOLID", color: C.surfaceSec }], 4);
    createText(parent, dx + 8, fy, d, 11, C.textSec);
    dx += dw + 6;
  }
  fy += 32;

  createText(parent, x + 16, fy, "Goals", 12, C.textSec, { medium: true });
  createText(parent, x + 16, fy + 16, "What should the agent prioritize? First = highest priority.", 10, C.textMuted, { width: W - 32 });
  fy += 36;

  // Goal entry
  createCard(parent, x + 16, fy, W - 32, 32);
  createText(parent, x + 28, fy + 8, "#1", 11, C.textMuted);
  createText(parent, x + 50, fy + 8, "Stay informed on my domains", 13, C.text);
  fy += 40;

  createInput(parent, x + 16, fy, W - 76, "Add a goal...");
  createButton(parent, x + W - 56, fy, "+", "indigo", { width: 38, height: 38 });

  // Nav buttons
  createButton(parent, x + 16, y + H - 52, "← Cancel", "ghost", { width: 90 });
  createButton(parent, x + W - 100, y + H - 52, "Next →", "indigo", { width: 84 });

  return { x, y, width: W, height: H };
}

function buildProfileStep2(parent, x, y) {
  const W = 400, H = 340;
  createText(parent, x, y - 24, "2.3 Step 2 — Schedule", 11, C.textMuted, { medium: true });
  createCard(parent, x, y, W, H);

  // Step indicators — step 2 active
  createRect(parent, x + 16, y + 16, 80, 28, [{ type: "SOLID", color: C.greenBg }], 6);
  createText(parent, x + 28, y + 22, "✓ You", 12, C.green500, { semibold: true });
  createText(parent, x + 104, y + 22, "›", 12, C.gray300);
  createRect(parent, x + 116, y + 16, 100, 28, [{ type: "SOLID", color: C.indigo500 }], 6);
  createText(parent, x + 126, y + 22, "🕐 Schedule", 12, C.white, { semibold: true });

  // Description
  createText(parent, x + 16, y + 64, "How often should the agent check for new\ndiscoveries and send you a brief?", 13, C.textSec, { width: W - 32 });

  // 2x2 grid of schedule options
  const options = [
    { label: "Every 3 hours", desc: "High frequency", selected: false },
    { label: "Every 6 hours", desc: "3x daily", selected: false },
    { label: "Every 12 hours", desc: "Morning + evening", selected: true },
    { label: "Daily", desc: "One comprehensive brief", selected: false },
  ];
  const gw = (W - 48) / 2;
  for (let i = 0; i < 4; i++) {
    const ox = x + 16 + (i % 2) * (gw + 16);
    const oy = y + 112 + Math.floor(i / 2) * 64;
    const opt = options[i];
    const borderC = opt.selected ? C.indigo500 : C.border;
    const bgC = opt.selected ? C.accentBg : C.surface;
    createCard(parent, ox, oy, gw, 52, { borderColor: borderC, fill: bgC });
    createText(parent, ox + 12, oy + 10, opt.label, 13, C.text, { medium: true });
    createText(parent, ox + 12, oy + 28, opt.desc, 11, C.textSec);
  }

  // Helper text
  createText(parent, x + 16, y + 252, "You can adjust this anytime from the dashboard below.", 11, C.textMuted, { width: W - 32 });

  // Nav buttons
  createButton(parent, x + 16, y + H - 52, "← Back", "ghost", { width: 72 });
  createButton(parent, x + W - 140, y + H - 52, "✓ Create Profile", "green", { width: 120 });

  return { x, y, width: W, height: H };
}

function buildFlow2(parent, startX, startY) {
  createSectionHeader(parent, startX, startY, "Flow 2: Operator Profile Wizard", C.indigo500);

  const gap = 80;
  const f1 = buildProfileSaved(parent, startX, startY + 48);
  const f2 = buildProfileStep1(parent, startX + f1.width + gap, startY + 48);
  const f3 = buildProfileStep2(parent, startX + f1.width + gap + f2.width + gap, startY + 48);

  createArrow(parent, f1, f2);
  createArrow(parent, f2, f3);

  return { totalWidth: f1.width + f2.width + f3.width + gap * 2, totalHeight: 520 + 72 };
}

// ══════════════════════════════════════════════════════════════════════
// FLOW 3: PROACTIVE ONBOARDING (SMART ALERTS)
// ══════════════════════════════════════════════════════════════════════

function buildProactiveModalFrame(parent, x, y, stepNum, totalSteps, title, subtitle) {
  const W = 560, H = 600;
  createCard(parent, x, y, W, H, { radius: 12 });

  // Header bar
  createRect(parent, x + 1, y + 1, W - 2, 100, [{ type: "SOLID", color: C.surface }], 12);
  createText(parent, x + 24, y + 16, "Enable Smart Alerts", 16, C.text, { semibold: true });
  createText(parent, x + 24, y + 38, `Step ${stepNum} of ${totalSteps}: ${title}`, 12, C.textSec);

  // Progress steps
  const stepW = (W - 48) / totalSteps;
  for (let i = 1; i <= totalSteps; i++) {
    const sx = x + 24 + (i - 1) * stepW;
    let bgC, txtC;
    if (i === stepNum) { bgC = C.blue500; txtC = C.white; }
    else if (i < stepNum) { bgC = C.green500; txtC = C.white; }
    else { bgC = C.surfaceSec; txtC = C.textSec; }
    createCircle(parent, sx + stepW / 2 - 12, y + 62, 24, [{ type: "SOLID", color: bgC }]);
    createText(parent, sx + stepW / 2 - 4, y + 67, i < stepNum ? "✓" : String(i), 12, txtC, { semibold: true });
    if (i < totalSteps) {
      createLine(parent, sx + stepW / 2 + 14, y + 74, sx + stepW + stepW / 2 - 14, y + 74, i < stepNum ? C.green500 : C.border, 2);
    }
  }

  return { x, y, width: W, height: H };
}

function buildSmartAlertsWelcome(parent, x, y) {
  createText(parent, x, y - 24, "3.1 Welcome", 11, C.textMuted, { medium: true });
  const frame = buildProactiveModalFrame(parent, x, y, 1, 5, "Welcome", "");

  const cx = x + 24, cy = y + 120;
  // Icon
  createCircle(parent, x + frame.width / 2 - 28, cy, 56, [{ type: "SOLID", color: C.blueBg }]);
  createText(parent, x + frame.width / 2 - 12, cy + 14, "✨", 24, C.blue500);

  createText(parent, x + 40, cy + 72, "Welcome to Smart Alerts", 22, C.text, { bold: true, width: frame.width - 80 });
  createText(parent, x + 40, cy + 100, "Let your AI assistant work for you — automatically find\nopportunities and take action", 14, C.textSec, { width: frame.width - 80 });

  // 3 feature cards
  const cards = [
    { icon: "⚡", title: "Meeting Prep", desc: "Auto-generate briefings" },
    { icon: "🔔", title: "Follow-Up Reminders", desc: "Never miss a follow-up" },
    { icon: "📈", title: "Daily Briefs", desc: "Morning summary" },
  ];
  const cardW = (frame.width - 64) / 3;
  for (let i = 0; i < 3; i++) {
    const ccx = cx + i * (cardW + 8);
    createCard(parent, ccx, cy + 148, cardW, 80, { fill: C.surfaceSec });
    createText(parent, ccx + 12, cy + 158, `${cards[i].icon} ${cards[i].title}`, 12, C.text, { semibold: true, width: cardW - 24 });
    createText(parent, ccx + 12, cy + 178, cards[i].desc, 11, C.textSec, { width: cardW - 24 });
  }

  // How it works
  createCard(parent, cx, cy + 244, frame.width - 48, 100, { fill: C.blueBg, borderColor: C.blue500 });
  createText(parent, cx + 12, cy + 254, "✨ How it works", 13, C.text, { semibold: true });
  createText(parent, cx + 12, cy + 274, "1. Monitors connected accounts\n2. Identifies opportunities\n3. Smart notifications\n4. You're always in control", 11, C.textSec, { width: frame.width - 72 });

  // Footer
  createButton(parent, x + 24, y + frame.height - 52, "← Back", "ghost", { width: 72 });
  createButton(parent, x + frame.width - 100, y + frame.height - 52, "Next →", "blue", { width: 76 });

  return frame;
}

function buildSmartAlertsConsent(parent, x, y) {
  createText(parent, x, y - 24, "3.2 Privacy & Consent", 11, C.textMuted, { medium: true });
  const frame = buildProactiveModalFrame(parent, x, y, 2, 5, "Consent", "");

  const cx = x + 24, cy = y + 120;
  createCircle(parent, x + frame.width / 2 - 28, cy, 56, [{ type: "SOLID", color: C.greenBg }]);
  createText(parent, x + frame.width / 2 - 12, cy + 14, "🛡", 24, C.green500);

  createText(parent, x + 40, cy + 72, "Privacy & Data Access", 22, C.text, { bold: true, width: frame.width - 80 });

  // 3 data access cards
  const items = [
    { icon: "🗄", title: "What we access", detail: "Gmail, Calendar, Slack, notes" },
    { icon: "👁", title: "What we do with it", detail: "Analyze, extract, generate" },
    { icon: "🔒", title: "How we protect it", detail: "Encrypted, 90-day retention" },
  ];
  let iy = cy + 108;
  for (const item of items) {
    createCard(parent, cx, iy, frame.width - 48, 48, { fill: C.surfaceSec });
    createText(parent, cx + 12, iy + 8, `${item.icon} ${item.title}`, 13, C.text, { semibold: true });
    createText(parent, cx + 12, iy + 28, item.detail, 11, C.textSec);
    iy += 56;
  }

  // Consent checkbox
  createCard(parent, cx, iy + 8, frame.width - 48, 80, { fill: C.surfaceSec });
  createRect(parent, cx + 12, iy + 20, 18, 18, [{ type: "SOLID", color: C.blue500 }], 4);
  createText(parent, cx + 14, iy + 21, "✓", 12, C.white, { bold: true });
  createText(parent, cx + 38, iy + 18, "I consent to smart alerts", 13, C.text, { semibold: true });
  createText(parent, cx + 38, iy + 38, "• Access connected accounts\n• Detect opportunities\n• Send notifications", 10, C.textSec, { width: frame.width - 100 });

  // Footer
  createButton(parent, x + 24, y + frame.height - 52, "← Back", "ghost", { width: 72 });
  createButton(parent, x + frame.width - 100, y + frame.height - 52, "Next →", "blue", { width: 76 });

  return frame;
}

function buildSmartAlertsFeatures(parent, x, y) {
  createText(parent, x, y - 24, "3.3 Choose Features", 11, C.textMuted, { medium: true });
  const frame = buildProactiveModalFrame(parent, x, y, 3, 5, "Features", "");

  const cx = x + 24, cy = y + 120;
  createCircle(parent, x + frame.width / 2 - 28, cy, 56, [{ type: "SOLID", color: C.purpleBg }]);
  createText(parent, x + frame.width / 2 - 12, cy + 14, "⚡", 24, C.purple500);

  createText(parent, x + 40, cy + 72, "Choose Your Features", 22, C.text, { bold: true, width: frame.width - 80 });

  // Feature toggles
  const features = [
    { icon: "📅", name: "Meeting Prep Packs", desc: "Auto-generate briefings 4h before meetings", enabled: true, rec: true },
    { icon: "🔔", name: "Follow-Up Nudges", desc: "Smart reminders when action needed", enabled: true, rec: true },
    { icon: "📄", name: "Daily Brief", desc: "Morning summary of updates and priorities", enabled: true, rec: true },
    { icon: "⚠️", name: "Risk Alerts", desc: "Warnings about potential issues", enabled: false, rec: false },
    { icon: "✉️", name: "Email Draft Generator", desc: "Auto-draft common emails", enabled: false, rec: false },
  ];

  let fy = cy + 108;
  for (const feat of features) {
    const borderC = feat.enabled ? C.blue500 : C.border;
    const bgC = feat.enabled ? C.blueBg : C.surfaceSec;
    createCard(parent, cx, fy, frame.width - 48, 48, { fill: bgC, borderColor: borderC });
    createText(parent, cx + 12, fy + 8, `${feat.icon} ${feat.name}`, 13, C.text, { semibold: true });
    if (feat.rec) {
      createRect(parent, cx + 12 + (feat.name.length + 3) * 7, fy + 8, 82, 18, [{ type: "SOLID", color: C.greenBg }], 4);
      createText(parent, cx + 18 + (feat.name.length + 3) * 7, fy + 10, "Recommended", 10, C.green600, { medium: true });
    }
    createText(parent, cx + 12, fy + 28, feat.desc, 11, C.textSec, { width: frame.width - 100 });
    // Checkbox circle
    const checkX = cx + frame.width - 72;
    if (feat.enabled) {
      createCircle(parent, checkX, fy + 12, 22, [{ type: "SOLID", color: C.blue500 }]);
      createText(parent, checkX + 4, fy + 15, "✓", 12, C.white, { bold: true });
    } else {
      createCircle(parent, checkX, fy + 12, 22, [{ type: "SOLID", color: C.surfaceSec }]);
    }
    fy += 56;
  }

  // Footer
  createButton(parent, x + 24, y + frame.height - 52, "← Back", "ghost", { width: 72 });
  createButton(parent, x + frame.width - 100, y + frame.height - 52, "Next →", "blue", { width: 76 });

  return frame;
}

function buildSmartAlertsPreferences(parent, x, y) {
  createText(parent, x, y - 24, "3.4 Preferences", 11, C.textMuted, { medium: true });
  const frame = buildProactiveModalFrame(parent, x, y, 4, 5, "Preferences", "");

  const cx = x + 24, cy = y + 120;
  createCircle(parent, x + frame.width / 2 - 28, cy, 56, [{ type: "SOLID", color: C.amberBg }]);
  createText(parent, x + frame.width / 2 - 12, cy + 14, "⚙", 24, C.amber500);

  createText(parent, x + 40, cy + 72, "Configure Preferences", 22, C.text, { bold: true, width: frame.width - 80 });

  // Notification channels card
  let py = cy + 108;
  createCard(parent, cx, py, frame.width - 48, 100, { fill: C.surfaceSec });
  createText(parent, cx + 12, py + 8, "🔔 Notification Channels", 13, C.text, { semibold: true });
  createText(parent, cx + 12, py + 30, "💬 In-App Notifications", 12, C.text);
  createRect(parent, cx + frame.width - 96, py + 28, 36, 18, [{ type: "SOLID", color: C.blue500 }], 9);
  createText(parent, cx + 12, py + 52, "📱 Slack Messages", 12, C.textSec);
  createRect(parent, cx + frame.width - 96, py + 50, 36, 18, [{ type: "SOLID", color: C.surfaceSec }], 9);
  createRect(parent, cx + frame.width - 44, py + 48, 60, 22, [{ type: "SOLID", color: C.amberBg }], 4);
  createText(parent, cx + frame.width - 40, py + 52, "Coming Soon", 9, C.amber500, { medium: true });
  createText(parent, cx + 12, py + 74, "✉️ Email Notifications", 12, C.textSec);
  createRect(parent, cx + frame.width - 96, py + 72, 36, 18, [{ type: "SOLID", color: C.surfaceSec }], 9);
  py += 112;

  // Quiet hours card
  createCard(parent, cx, py, frame.width - 48, 80, { fill: C.surfaceSec });
  createText(parent, cx + 12, py + 8, "🌙 Quiet Hours", 13, C.text, { semibold: true });
  createText(parent, cx + 12, py + 32, "Start: 22:00", 12, C.text, { medium: true });
  createText(parent, cx + 140, py + 32, "End: 08:00", 12, C.text, { medium: true });
  createText(parent, cx + 12, py + 54, "Timezone: America/Los_Angeles", 10, C.textMuted);
  py += 92;

  // Confidence slider card
  createCard(parent, cx, py, frame.width - 48, 72, { fill: C.surfaceSec });
  createText(parent, cx + 12, py + 8, "📊 Relevance Filter", 13, C.text, { semibold: true });
  // Slider track
  createRect(parent, cx + 12, py + 36, frame.width - 72, 4, [{ type: "SOLID", color: C.border }], 2);
  createRect(parent, cx + 12, py + 36, (frame.width - 72) * 0.7, 4, [{ type: "SOLID", color: C.blue500 }], 2);
  createCircle(parent, cx + 12 + (frame.width - 72) * 0.7 - 6, py + 30, 12, [{ type: "SOLID", color: C.blue500 }]);
  createText(parent, cx + 12, py + 52, "More", 10, C.textSec);
  createText(parent, cx + (frame.width - 48) / 2 - 16, py + 52, "70%", 12, C.blue500, { semibold: true });
  createText(parent, cx + frame.width - 80, py + 52, "Fewer", 10, C.textSec);

  // Footer
  createButton(parent, x + 24, y + frame.height - 52, "← Back", "ghost", { width: 72 });
  createButton(parent, x + frame.width - 100, y + frame.height - 52, "Next →", "blue", { width: 76 });

  return frame;
}

function buildSmartAlertsSuccess(parent, x, y) {
  createText(parent, x, y - 24, "3.5 Success", 11, C.textMuted, { medium: true });
  const frame = buildProactiveModalFrame(parent, x, y, 5, 5, "Success", "");

  const cx = x + 24, cy = y + 120;
  createCircle(parent, x + frame.width / 2 - 28, cy, 56, [{ type: "SOLID", color: C.greenBg }]);
  createText(parent, x + frame.width / 2 - 12, cy + 14, "✅", 24, C.green500);

  createText(parent, x + 40, cy + 72, "You're All Set!", 22, C.text, { bold: true, width: frame.width - 80 });
  createText(parent, x + 40, cy + 100, "Smart alerts are ready to start working for you", 14, C.textSec, { width: frame.width - 80 });

  // Summary cards
  let sy = cy + 132;
  createCard(parent, cx, sy, frame.width - 48, 80, { fill: C.surfaceSec });
  createText(parent, cx + 12, sy + 8, "✨ Enabled Features (3)", 13, C.text, { semibold: true });
  createText(parent, cx + 12, sy + 30, "✓ Meeting Prep Packs\n✓ Follow-Up Nudges\n✓ Daily Brief", 11, C.textSec, { width: frame.width - 72 });
  sy += 92;

  createCard(parent, cx, sy, frame.width - 48, 56, { fill: C.surfaceSec });
  createText(parent, cx + 12, sy + 8, "🔔 Notification Settings", 13, C.text, { semibold: true });
  createText(parent, cx + 12, sy + 30, "Channels: InApp · Quiet: 22:00–08:00 · Filter: 70%", 11, C.textSec, { width: frame.width - 72 });
  sy += 68;

  // What happens next
  createCard(parent, cx, sy, frame.width - 48, 80, { fill: C.blueBg, borderColor: C.blue500 });
  createText(parent, cx + 12, sy + 8, "What happens next?", 13, C.text, { semibold: true });
  createText(parent, cx + 12, sy + 28, "📅 Briefings 4h before meetings\n🔔 Smart reminders for follow-ups\n📄 Morning summary at 8:00 AM", 11, C.textSec, { width: frame.width - 72 });

  // Footer
  createButton(parent, x + 24, y + frame.height - 52, "← Back", "ghost", { width: 72 });
  createButton(parent, x + frame.width - 160, y + frame.height - 52, "✓ Enable Smart Alerts", "green", { width: 140 });

  return frame;
}

function buildFlow3(parent, startX, startY) {
  createSectionHeader(parent, startX, startY, "Flow 3: Proactive Onboarding / Smart Alerts", C.blue500);

  const gap = 60;
  const frames = [];
  const builders = [
    buildSmartAlertsWelcome,
    buildSmartAlertsConsent,
    buildSmartAlertsFeatures,
    buildSmartAlertsPreferences,
    buildSmartAlertsSuccess,
  ];

  let cx = startX;
  for (const builder of builders) {
    const f = builder(parent, cx, startY + 48);
    frames.push(f);
    cx += f.width + gap;
  }

  for (let i = 0; i < frames.length - 1; i++) {
    createArrow(parent, frames[i], frames[i + 1]);
  }

  return { totalWidth: cx - startX, totalHeight: 600 + 72 };
}

// ══════════════════════════════════════════════════════════════════════
// FLOW 4: TUTORIAL PAGE
// ══════════════════════════════════════════════════════════════════════

function buildTutorialInProgress(parent, x, y) {
  const W = 960, H = 640;
  createText(parent, x, y - 24, "4.1 Tutorial — In Progress", 11, C.textMuted, { medium: true });
  createCard(parent, x, y, W, H, { radius: 12 });

  // Header
  createCircle(parent, x + W / 2 - 24, y + 16, 48, [{ type: "SOLID", color: C.accentBg }]);
  createText(parent, x + W / 2 - 10, y + 28, "🤖", 20, C.accent);
  createText(parent, x + W / 2 - 150, y + 72, "Welcome to Your AI Workspace", 22, C.text, { bold: true, width: 300 });
  createText(parent, x + W / 2 - 200, y + 100, "Let's get you started with your intelligent document management system.", 13, C.textSec, { width: 400 });

  // Skip button
  createButton(parent, x + W / 2 - 120, y + 124, "Skip tutorial and go to workspace →", "ghost", { width: 240 });

  // Progress bar
  createRect(parent, x + 24, y + 160, W - 48, 8, [{ type: "SOLID", color: C.surfaceSec }], 4);
  createRect(parent, x + 24, y + 160, (W - 48) * 0.2, 8, [{ type: "SOLID", color: C.accent }], 4);
  createText(parent, x + 24, y + 172, "1 of 5 completed", 11, C.textSec);

  // Left panel: Getting Started Guide
  const lpW = 300, rpW = W - lpW - 72;
  createCard(parent, x + 24, y + 196, lpW, H - 220);
  createText(parent, x + 40, y + 212, "📖 Getting Started Guide", 14, C.text, { semibold: true });

  const steps = [
    { title: "Welcome", done: true },
    { title: "Create Your First Document", done: false, current: true },
    { title: "Discover AI Features", done: false },
    { title: "Organize Your Workspace", done: false },
    { title: "Collaboration Features", done: false },
  ];

  let sy = y + 244;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const bgC = s.done ? C.accentBg : s.current ? C.accentBg : C.surfaceSec;
    const borderC = s.current ? C.accent : C.border;
    createCard(parent, x + 36, sy, lpW - 24, 52, { fill: bgC, borderColor: borderC });
    createCircle(parent, x + 44, sy + 14, 24, [{ type: "SOLID", color: s.done ? C.accentBg : C.surfaceSec }]);
    createText(parent, x + 50, sy + 18, s.done ? "✓" : String(i + 1), 12, s.done ? C.accent : C.textSec, { semibold: true });
    createText(parent, x + 76, sy + 10, s.title, 12, C.text, { semibold: true, width: lpW - 64 });
    if (!s.done && s.current) {
      createText(parent, x + 76, sy + 30, "Try it →", 10, C.accent, { semibold: true });
    }
    sy += 60;
  }

  // Right panel: AI Chat
  const rpX = x + 24 + lpW + 24;
  createCard(parent, rpX, y + 196, rpW, H - 220);
  // Chat header
  createCircle(parent, rpX + 16, y + 208, 32, [{ type: "SOLID", color: C.accentBg }]);
  createText(parent, rpX + 24, y + 216, "🤖", 14, C.accent);
  createText(parent, rpX + 56, y + 208, "AI Onboarding Assistant", 13, C.text, { medium: true });
  createText(parent, rpX + 56, y + 226, "Ask me anything about getting started!", 11, C.textSec);

  // Chat messages
  let my = y + 256;
  // System message
  createRect(parent, rpX + rpW / 2 - 100, my, 200, 24, [{ type: "SOLID", color: C.surfaceSec }], 12);
  createText(parent, rpX + rpW / 2 - 90, my + 5, "👋 Welcome to your AI workspace!", 10, C.textSec);
  my += 36;
  // Assistant message
  createRect(parent, rpX + 16, my, rpW - 100, 60, [{ type: "SOLID", color: C.surface }], 8);
  createText(parent, rpX + 28, my + 8, "Hi there! I'm your AI assistant, and\nI'm excited to help you get started.", 12, C.text, { width: rpW - 120 });
  my += 72;
  // User message
  createRect(parent, rpX + rpW - 220, my, 200, 28, [{ type: "SOLID", color: C.accent }], 8);
  createText(parent, rpX + rpW - 210, my + 6, "How do I create a document?", 12, C.white);

  // Quick action pills
  const qy = y + H - 80;
  const pills = ["Create Document", "AI Features", "Collaboration", "Organization"];
  let px = rpX + 16;
  for (const pill of pills) {
    const pw = pill.length * 7 + 24;
    createRect(parent, px, qy, pw, 26, [{ type: "SOLID", color: C.accentBg }], 13);
    createText(parent, px + 12, qy + 6, pill, 11, C.accent, { medium: true });
    px += pw + 8;
  }

  // Input bar
  createCard(parent, rpX + 16, y + H - 44, rpW - 80, 32);
  createText(parent, rpX + 28, y + H - 36, "Ask me anything about getting started...", 12, C.textMuted);
  createButton(parent, rpX + rpW - 56, y + H - 44, "↗", "primary", { width: 32, height: 32 });

  return { x, y, width: W, height: H };
}

function buildTutorialComplete(parent, x, y) {
  const W = 400, H = 260;
  createText(parent, x, y - 24, "4.2 Tutorial — All Complete", 11, C.textMuted, { medium: true });
  createCard(parent, x, y, W, H, { fill: C.greenBg, borderColor: C.green500 });

  createCircle(parent, x + 16, y + 16, 28, [{ type: "SOLID", color: C.green500 }]);
  createText(parent, x + 23, y + 21, "✓", 14, C.white, { bold: true });
  createText(parent, x + 52, y + 16, "Congratulations!", 16, C.green600, { semibold: true });
  createText(parent, x + 52, y + 38, "You've completed the onboarding!", 13, C.green600);

  // Completed steps
  const stepNames = ["Welcome", "Create Document", "AI Features", "Organize", "Collaboration"];
  let sy = y + 72;
  for (const name of stepNames) {
    createText(parent, x + 28, sy, `✓ ${name}`, 12, C.green600, { medium: true });
    sy += 24;
  }

  // CTA
  createButton(parent, x + 24, y + H - 52, "Enter Your Workspace", "green", { width: W - 48, height: 36 });

  return { x, y, width: W, height: H };
}

function buildFlow4(parent, startX, startY) {
  createSectionHeader(parent, startX, startY, "Flow 4: Tutorial Page (Interactive Onboarding)", C.accent);

  const gap = 80;
  const f1 = buildTutorialInProgress(parent, startX, startY + 48);
  const f2 = buildTutorialComplete(parent, startX + f1.width + gap, startY + 48 + 190);

  createArrow(parent, f1, { x: f2.x, y: f2.y, width: f2.width, height: f2.height });

  return { totalWidth: f1.width + f2.width + gap, totalHeight: 640 + 72 };
}

// ══════════════════════════════════════════════════════════════════════
// MAIN — Assemble all flows on one Figma page
// ══════════════════════════════════════════════════════════════════════

async function main() {
  // Load fonts
  await loadFont("Inter", "Regular");
  await loadFont("Inter", "Medium");
  await loadFont("Inter", "Semi Bold");
  await loadFont("Inter", "Bold");

  // Create or find page
  let page = figma.root.children.find(p => p.name === "Onboarding Flows");
  if (!page) {
    page = figma.createPage();
    page.name = "Onboarding Flows";
  }
  figma.currentPage = page;

  // Clear existing children
  for (const child of [...page.children]) {
    child.remove();
  }

  // Title
  const title = figma.createText();
  title.characters = "NodeBench — Onboarding Flows";
  title.fontSize = 32;
  title.fontName = { family: "Inter", style: "Bold" };
  title.fills = [{ type: "SOLID", color: C.text }];
  title.x = 0; title.y = 0;
  page.appendChild(title);

  const subtitle = figma.createText();
  subtitle.characters = "14 screens across 4 flows · Generated " + new Date().toISOString().slice(0, 10);
  subtitle.fontSize = 14;
  subtitle.fontName = { family: "Inter", style: "Regular" };
  subtitle.fills = [{ type: "SOLID", color: C.textSec }];
  subtitle.x = 0; subtitle.y = 44;
  page.appendChild(subtitle);

  const startY = 100;
  const flowGap = 120;

  // Flow 1: Agent Guided Onboarding
  const f1 = buildFlow1(page, 0, startY);

  // Flow 2: Operator Profile Wizard
  const f2 = buildFlow2(page, 0, startY + f1.totalHeight + flowGap);

  // Flow 3: Proactive Onboarding
  const f3 = buildFlow3(page, 0, startY + f1.totalHeight + flowGap + f2.totalHeight + flowGap);

  // Flow 4: Tutorial Page
  const f4 = buildFlow4(page, 0, startY + f1.totalHeight + flowGap + f2.totalHeight + flowGap + f3.totalHeight + flowGap);

  figma.viewport.scrollAndZoomIntoView(page.children);
  figma.notify("✅ Onboarding Flows page created with 14 wireframe screens!");

  // ── Phase 2: Try to fill frames with actual screenshots ─────────
  // If the dev server is running (npm run dev), fetch real screenshots.
  // This is optional — wireframes work standalone.
  const SCREENSHOT_BASE = "http://localhost:5173/dogfood/onboarding";
  const SCREEN_IDS = [
    "1.1-agent-welcome", "1.2-agent-fast", "1.3-agent-deep", "1.4-agent-ready",
    "2.1-profile-saved", "2.2-profile-step1", "2.3-profile-step2",
    "3.1-proactive-welcome", "3.2-proactive-consent", "3.3-proactive-features",
    "3.4-proactive-preferences", "3.5-proactive-success",
    "4.1-tutorial-inprogress", "4.2-tutorial-complete",
  ];

  let loaded = 0;
  for (const screenId of SCREEN_IDS) {
    try {
      const url = `${SCREENSHOT_BASE}/${screenId}.png`;
      const img = await figma.createImageAsync(url);
      // Find the matching frame by name
      const frame = page.children.find(
        n => n.type === "FRAME" && n.name.startsWith(screenId)
      );
      if (frame) {
        // Create a fill rectangle with the screenshot
        const rect = figma.createRectangle();
        rect.resize(frame.width, frame.height);
        rect.x = 0; rect.y = 0;
        rect.fills = [{
          type: "IMAGE",
          imageHash: img.hash,
          scaleMode: "FIT",
        }];
        // Move screenshot behind wireframe elements (index 0)
        frame.insertChild(0, rect);
        loaded++;
      }
    } catch (_) {
      // Dev server not running or image not found — wireframes still work
    }
  }
  if (loaded > 0) {
    figma.notify(`📸 Loaded ${loaded}/${SCREEN_IDS.length} screenshots from dev server`);
  }
}

main().catch(err => {
  console.error(err);
  figma.notify("❌ Error: " + err.message);
});
