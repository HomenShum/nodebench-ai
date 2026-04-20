type ArchivePost = {
  _id?: string;
  content: string;
  postType?: string;
  persona?: string;
  postUrl?: string;
  postedAt: number;
  dateString?: string;
  target?: string;
};

export type SystemRelatedEntity = {
  slug: string;
  name: string;
  entityType: string;
  reason: string;
  count: number;
};

export type SystemTimelineItem = {
  key: string;
  title: string;
  summary: string;
  postType: string;
  persona: string;
  postedAt: number;
  sourceUrls: string[];
  sourceLabels: string[];
};

export type SystemEntityNode = {
  slug: string;
  name: string;
  entityType: string;
  summary: string;
  updatedAt: number;
  reportCount: number;
  latestRevision: number;
  sourceUrls: string[];
  sourceLabels: string[];
  relatedEntities: SystemRelatedEntity[];
  timeline: SystemTimelineItem[];
  originLabel: string;
  systemGroup: string;
};

type Mention = {
  slug: string;
  name: string;
  entityType: string;
  title: string;
  summary: string;
  postType: string;
  persona: string;
  postedAt: number;
  sourceUrls: string[];
  sourceLabels: string[];
};

const COMPANY_MARKERS = new Set([
  "ai",
  "bank",
  "capital",
  "corp",
  "corporation",
  "fund",
  "funding",
  "group",
  "holdings",
  "inc",
  "labs",
  "llc",
  "lp",
  "partners",
  "platform",
  "protocol",
  "software",
  "systems",
  "technologies",
  "technology",
  "ventures",
]);

const BLOCKED_LINE_PREFIXES = [
  "what:",
  "so what:",
  "now what:",
  "trace:",
  "lead investors:",
  "audience:",
  "risk:",
  "opportunity:",
  "funding snapshot:",
  "deeper breakdown:",
  "how the evidence stacks up:",
  "based on today's research",
  "verification and context on today's",
  "this signals",
  "which of these",
  "worth learning or exploring:",
  "i built a system",
];

const ACTION_VERBS = [
  "approves",
  "bans",
  "blasts",
  "confirms",
  "demands",
  "fails",
  "falls",
  "fires",
  "gets",
  "has",
  "have",
  "introduces",
  "is",
  "just",
  "launches",
  "lets",
  "plummets",
  "publishes",
  "quits",
  "raises",
  "raised",
  "returns",
  "says",
  "seeks",
  "targets",
  "targeted",
  "tries",
  "unveils",
  "will",
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['".,()[\]{}]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toSentenceCase(value: string) {
  return value
    .split(/[\s-_]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueStrings(values: Array<string | null | undefined>, max = 6) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const next = value?.trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    if (out.length >= max) break;
  }
  return out;
}

function extractUrls(content: string) {
  return [...content.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0]);
}

function stripDecorators(value: string) {
  return normalizeWhitespace(
    value
      .replace(/^\[\d+\/\d+\]\s*/g, "")
      .replace(/^[-*]\s+/g, "")
      .replace(/^\d+[.)]\s+/g, "")
      .replace(/\s*[—-]{2,}\s*$/, "")
      .replace(/^[“"']|[”"']$/g, ""),
  );
}

function isBlockedLine(line: string) {
  const normalized = line.trim().toLowerCase();
  if (!normalized) return true;
  if (/^https?:\/\//.test(normalized)) return true;
  if (normalized.startsWith("#")) return true;
  return BLOCKED_LINE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isCandidateTitleLine(line: string) {
  const trimmed = stripDecorators(line);
  if (!trimmed || trimmed.length < 8 || trimmed.length > 160) return false;
  if (isBlockedLine(trimmed)) return false;
  if (!/[A-Z]/.test(trimmed)) return false;
  return true;
}

function prettifyGithubRepoName(url: string) {
  const match = url.match(/github\.com\/[^/]+\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  return toSentenceCase(match[1].replace(/[-_]+/g, " "));
}

function prettifyLinkedInProfileName(url: string) {
  const match = url.match(/linkedin\.com\/(?:in|pub)\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  return match[1]
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => {
      if (/^[A-Z]{2,}$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function prettifyReferenceUrlName(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    if (!hostname) return null;
    const parts = hostname.split(".").filter(Boolean);
    if (parts.length === 0) return null;
    const labelParts = parts.length >= 2 ? [parts[0], parts[1]] : [parts[0]];
    return labelParts
      .map((part) => {
        if (part.toLowerCase() === "ai") return "AI";
        if (part.toLowerCase() === "vc") return "VC";
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  } catch {
    return null;
  }
}

function extractFundingNames(content: string) {
  return [...content.matchAll(/^\d+[.)]\s+(.+?)\s+--\s+\$[^\n]+$/gm)]
    .map((match) => stripDecorators(match[1] ?? ""))
    .filter(Boolean)
    .slice(0, 8);
}

function extractLeadInvestorNames(content: string) {
  return [...content.matchAll(/Lead investors:\s+([^\n]+)/gi)]
    .flatMap((match) =>
      String(match[1] ?? "")
        .split(/,| and /gi)
        .map((value) => stripDecorators(value))
        .filter(Boolean),
    )
    .slice(0, 8);
}

function extractTitleFromHeading(title: string) {
  const cleaned = stripDecorators(title);
  if (!cleaned) return null;

  const possessiveMatch = cleaned.match(
    /^([A-Z][A-Za-z0-9.'&+-]+(?:\s+[A-Z][A-Za-z0-9.'&+-]+){1,3})['’]s\b/,
  );
  if (possessiveMatch?.[1]) return possessiveMatch[1];

  const verbPattern = new RegExp(
    `^((?:[A-Z][A-Za-z0-9.'&+-]+|[A-Z]{2,})(?:\\s+(?:[A-Z][A-Za-z0-9.'&+-]+|[A-Z]{2,})){0,4})\\s+(?:${ACTION_VERBS.join("|")})\\b`,
  );
  const verbMatch = cleaned.match(verbPattern);
  if (verbMatch?.[1]) return verbMatch[1];

  const colonMatch = cleaned.match(/^((?:[A-Z][A-Za-z0-9.'&+-]+(?:\s+[A-Z][A-Za-z0-9.'&+-]+){0,4})):\s+/);
  if (colonMatch?.[1]) return colonMatch[1];

  const companyPhrase = cleaned.match(
    /\b([A-Z][A-Za-z0-9.'&+-]+(?:\s+[A-Z][A-Za-z0-9.'&+-]+){0,4}\s+(?:AI|Capital|Corp|Corporation|Fund|Group|Holdings|Inc|Labs|LLC|Partners|Platform|Protocol|Software|Systems|Technologies|Ventures))\b/,
  );
  if (companyPhrase?.[1]) return companyPhrase[1];

  return null;
}

function looksLikePersonName(value: string) {
  const tokens = value
    .split(/\s+/g)
    .map((token) => token.replace(/[^A-Za-z'-]/g, ""))
    .filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;
  return tokens.every((token) => /^[A-Z][a-z'’-]+$/.test(token));
}

function inferEntityType(name: string, title: string, url?: string, postType?: string) {
  const normalizedName = name.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  if (postType === "funding_tracker" || postType === "funding_brief") return "company";
  if (url && /linkedin\.com\/(?:in|pub)\//i.test(url)) return "person";
  if (looksLikePersonName(name)) return "person";
  if (
    normalizedName
      .split(/\s+/g)
      .some((token) => COMPANY_MARKERS.has(token))
  ) {
    return "company";
  }
  if (/github\.com\//i.test(url ?? "")) return "note";
  if (/(market|stocks|economy|bourse|talks|policy|industry|supply chain|capital)/.test(normalizedTitle)) {
    return "market";
  }
  if (name.split(/\s+/g).length === 1 && /^[A-Z0-9][A-Za-z0-9&.+-]+$/.test(name)) {
    return "company";
  }
  return "note";
}

function looksLikeReferenceLabel(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return false;
  return /^(founder|co-founder|firm|company|project|team|site|website|profile|linkedin|github|twitter|x)(\s+(founder|co-founder|site|website|profile|linkedin|github|twitter|x))?$/.test(
    normalized,
  );
}

function deriveEntityName(title: string, url?: string, postType?: string) {
  const fundingName = title.match(/^(.+?)\s+--\s+\$/)?.[1];
  if (fundingName) return stripDecorators(fundingName);

  const linkedInName = url ? prettifyLinkedInProfileName(url) : null;
  if (linkedInName) return linkedInName;

  const githubName = url ? prettifyGithubRepoName(url) : null;
  if (githubName) return githubName;

  if (looksLikeReferenceLabel(title) && url) {
    const referenceName = prettifyReferenceUrlName(url);
    if (referenceName) return referenceName;
  }

  const headingName = extractTitleFromHeading(title);
  if (headingName) return headingName;

  const cleaned = stripDecorators(title);
  return cleaned.split(/\s+/g).slice(0, 6).join(" ");
}

function deriveMentionSummary(title: string, lines: string[]) {
  const supportingLine = lines.find((line) => !isBlockedLine(line) && line !== title);
  if (supportingLine) return stripDecorators(supportingLine).slice(0, 260);
  return stripDecorators(title).slice(0, 260);
}

function buildSystemGroup(postType: string, persona: string) {
  if (postType === "funding_tracker" || postType === "funding_brief") return "Funding tracker";
  if (postType === "daily_digest") return `Daily brief · ${persona || "General"}`;
  return `${persona || "General"} · ${postType.replace(/_/g, " ")}`;
}

function buildSourceLabels(urls: string[]) {
  return urls.map((url) => {
    try {
      return new URL(url).hostname.replace(/^www\./i, "");
    } catch {
      return url;
    }
  });
}

function buildFallbackMention(post: ArchivePost, urls: string[]): Mention | null {
  const firstSentence = normalizeWhitespace(post.content.split(/\n\n|\n/)[0] ?? "");
  if (!firstSentence || isBlockedLine(firstSentence)) return null;
  const name = deriveEntityName(firstSentence, urls[0], post.postType);
  const slug = slugify(name);
  if (!slug) return null;
  return {
    slug,
    name,
    entityType: inferEntityType(name, firstSentence, urls[0], post.postType),
    title: firstSentence,
    summary: firstSentence.slice(0, 260),
    postType: post.postType ?? "archive",
    persona: post.persona ?? "GENERAL",
    postedAt: post.postedAt,
    sourceUrls: uniqueStrings([...urls, post.postUrl]),
    sourceLabels: buildSourceLabels(uniqueStrings(urls)),
  };
}

export function extractArchiveMentions(post: ArchivePost): Mention[] {
  const content = String(post.content ?? "");
  const urls = extractUrls(content);
  const lines = content
    .split(/\r?\n/g)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const mentions: Mention[] = [];
  const pushMention = (name: string, title: string, supportingLines: string[], sourceUrl?: string) => {
    const normalizedName = stripDecorators(name);
    const slug = slugify(normalizedName);
    if (!normalizedName || !slug) return;
    mentions.push({
      slug,
      name: normalizedName,
      entityType: inferEntityType(normalizedName, title, sourceUrl, post.postType),
      title: stripDecorators(title),
      summary: deriveMentionSummary(title, supportingLines),
      postType: post.postType ?? "archive",
      persona: post.persona ?? "GENERAL",
      postedAt: post.postedAt,
      sourceUrls: uniqueStrings([sourceUrl, ...urls, post.postUrl]),
      sourceLabels: buildSourceLabels(uniqueStrings([sourceUrl, ...urls])),
    });
  };

  const fundingNames = extractFundingNames(content);
  if (fundingNames.length > 0) {
    for (const fundingName of fundingNames) {
      pushMention(fundingName, `${fundingName} funding update`, lines, urls[0]);
    }
    for (const investorName of extractLeadInvestorNames(content)) {
      pushMention(investorName, `${investorName} investor mention`, lines, urls[0]);
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!isCandidateTitleLine(line)) continue;
    const nextLine = lines[index + 1] ?? "";
    const prevLine = lines[index - 1] ?? "";
    const pairedUrl = /^https?:\/\//.test(nextLine)
      ? nextLine
      : /^https?:\/\//.test(prevLine)
        ? prevLine
        : urls[0];
    const derivedName = deriveEntityName(line, pairedUrl, post.postType);
    if (!derivedName) continue;
    pushMention(derivedName, line, lines.slice(index, index + 3), pairedUrl);
  }

  const deduped = mentions.filter((mention, index, all) => {
    return all.findIndex((candidate) => candidate.slug === mention.slug) === index;
  });

  if (deduped.length > 0) return deduped;

  const fallback = buildFallbackMention(post, urls);
  return fallback ? [fallback] : [];
}

export function buildSystemEntityNodes(posts: ArchivePost[]): SystemEntityNode[] {
  const entityMap = new Map<
    string,
    {
      slug: string;
      name: string;
      entityType: string;
      timeline: SystemTimelineItem[];
      sourceUrls: Set<string>;
      sourceLabels: Set<string>;
      related: Map<string, SystemRelatedEntity>;
    }
  >();

  for (const post of posts) {
    const mentions = extractArchiveMentions(post);
    for (const mention of mentions) {
      const existing = entityMap.get(mention.slug) ?? {
        slug: mention.slug,
        name: mention.name,
        entityType: mention.entityType,
        timeline: [],
        sourceUrls: new Set<string>(),
        sourceLabels: new Set<string>(),
        related: new Map<string, SystemRelatedEntity>(),
      };
      existing.name = mention.name;
      existing.entityType = mention.entityType;
      existing.timeline.push({
        key: `${mention.slug}:${post._id ?? post.postedAt}:${existing.timeline.length}`,
        title: mention.title,
        summary: mention.summary,
        postType: mention.postType,
        persona: mention.persona,
        postedAt: mention.postedAt,
        sourceUrls: mention.sourceUrls,
        sourceLabels: mention.sourceLabels,
      });
      for (const url of mention.sourceUrls) existing.sourceUrls.add(url);
      for (const label of mention.sourceLabels) existing.sourceLabels.add(label);
      entityMap.set(mention.slug, existing);
    }

    for (const left of mentions) {
      const leftEntry = entityMap.get(left.slug);
      if (!leftEntry) continue;
      for (const right of mentions) {
        if (left.slug === right.slug) continue;
        const existing = leftEntry.related.get(right.slug);
        if (existing) {
          existing.count += 1;
          existing.reason = buildSystemGroup(post.postType ?? "archive", post.persona ?? "GENERAL");
          continue;
        }
        leftEntry.related.set(right.slug, {
          slug: right.slug,
          name: right.name,
          entityType: right.entityType,
          reason: buildSystemGroup(post.postType ?? "archive", post.persona ?? "GENERAL"),
          count: 1,
        });
      }
    }
  }

  return [...entityMap.values()]
    .map((entity) => {
      const timeline = entity.timeline
        .sort((left, right) => right.postedAt - left.postedAt)
        .slice(0, 8);
      const latest = timeline[0];
      return {
        slug: entity.slug,
        name: entity.name,
        entityType: entity.entityType,
        summary:
          latest?.summary ||
          `System-generated intelligence from ${entity.timeline.length} archived posts.`,
        updatedAt: latest?.postedAt ?? 0,
        reportCount: entity.timeline.length,
        latestRevision: entity.timeline.length,
        sourceUrls: [...entity.sourceUrls].slice(0, 6),
        sourceLabels: [...entity.sourceLabels].slice(0, 6),
        relatedEntities: [...entity.related.values()]
          .sort((left, right) => right.count - left.count)
          .slice(0, 6),
        timeline,
        originLabel: "System intelligence",
        systemGroup: latest ? buildSystemGroup(latest.postType, latest.persona) : "System intelligence",
      };
    })
    .filter((entity) => entity.slug && entity.updatedAt > 0)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export function getSystemEntityNodeBySlug(posts: ArchivePost[], slug: string) {
  return buildSystemEntityNodes(posts).find((entity) => entity.slug === slug) ?? null;
}
