// agents/services/linkup.ts
// Small, isolated Linkup client + helpers. Safe to import from Convex actions.
import { LinkupClient } from "linkup-sdk";

const resolvedApiKey =
  process.env.LINKUP_API_KEY ||
  process.env.NEXT_PUBLIC_LINKUP_API_KEY ||
  "";

const linkupClientInstance = resolvedApiKey
  ? new LinkupClient({ apiKey: resolvedApiKey })
  : null;

if (!linkupClientInstance) {
  const warning =
    "Linkup API key not configured; using fallback data for Linkup services.";
  if (!process.env.SILENCE_LINKUP_WARNINGS) {
    console.warn(`[linkup] ${warning}`);
  }
}

export const linkupClient = linkupClientInstance;
export const hasLinkupCredentials = Boolean(linkupClientInstance);

const FALLBACK_IMAGE_RESULTS: Array<{ name: string; url: string; type: string }> = [
  {
    name: "VR Avatar 1",
    url: "https://images.unsplash.com/photo-1535223289827-42f1e9919769",
    type: "image",
  },
  {
    name: "VR Avatar 2",
    url: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac",
    type: "image",
  },
  {
    name: "VR Avatar 3",
    url: "https://images.unsplash.com/photo-1617802690992-15d93263d3a9",
    type: "image",
  },
];

function makeFallbackStructuredResponse(query: string, schema?: any) {
  const schemaSummary = schema && typeof schema === "object" && schema.properties
    ? Object.keys(schema.properties)
    : [];
  return {
    answer: `Linkup search skipped (no API key). Query: ${query}`,
    summary:
      "Linkup structured search unavailable because no API key is configured.",
    sources: [] as Array<{ name: string; url: string; snippet?: string }>,
    structured: { ok: false, schemaSummary, error: undefined as string | undefined },
  };
}

function formatLinkupError(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

export const comprehensivePersonSchema = {
  type: "object",
  properties: {
    fullName: { type: "string" },
    headline: { type: "string" },
    summary: { type: "string" },
    location: {
      type: "object",
      properties: { city: { type: "string" }, state: { type: "string" }, country: { type: "string" } },
    },
    socialProfiles: {
      type: "array",
      items: { type: "object", properties: { platform: { type: "string" }, url: { type: "string", format: "uri" } }, required: ["platform", "url"] },
    },
    workExperience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          jobTitle: { type: "string" },
          companyName: { type: "string" },
          location: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          description: { type: "string" },
        },
        required: ["jobTitle", "companyName"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          fieldOfStudy: { type: "string" },
          graduationYear: { type: "integer" },
        },
        required: ["institution"],
      },
    },
    skills: {
      type: "object",
      properties: {
        technicalSkills: { type: "array", items: { type: "string" } },
        softSkills: { type: "array", items: { type: "string" } },
        certifications: { type: "array", items: { type: "string" } },
      },
    },
    keyAchievements: { type: "array", items: { type: "string" } },
    inferredExpertise: { type: "string" },
    roleSuitabilityAnalysis: {
      type: "array",
      items: {
        type: "object",
        properties: { suggestedRole: { type: "string" }, reasoning: { type: "string" } },
        required: ["suggestedRole", "reasoning"],
      },
    },
    compensationAnalysis: {
      type: "object",
      properties: {
        location: { type: "string" },
        estimatedBaseSalaryRange: { type: "string" },
        influencingFactors: { type: "string" },
      },
    },
  },
  required: ["fullName", "headline", "summary", "workExperience", "skills", "roleSuitabilityAnalysis"],
} as const;

export const comprehensiveCompanySchema = {
  type: "object",
  description: "A comprehensive strategic, operational, and financial brief on a company.",
  properties: {
    companyName: { type: "string" },
    companyType: {
      type: "string",
      enum: [
        "Public Corporation",
        "Private Equity-Owned",
        "Venture-Backed Startup",
        "Small-to-Medium Business (SMB)",
        "Individual/Sole Proprietor",
        "Non-Profit/Foundation",
      ],
    },
    headline: { type: "string" },
    summary: { type: "string" },
    website: { type: "string", format: "uri" },
    location: { type: "string" },
    businessModel: {
      type: "object",
      properties: {
        monetizationStrategy: { type: "string" },
        goToMarketStrategy: { type: "string" },
        targetAudience: { type: "string" },
      },
    },
    competitiveLandscape: {
      type: "object",
      properties: {
        primaryCompetitors: { type: "array", items: { type: "string" } },
        economicMoat: { type: "array", items: { type: "string" } },
      },
    },
    swotAnalysis: {
      type: "object",
      properties: {
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        opportunities: { type: "array", items: { type: "string" } },
        threats: { type: "array", items: { type: "string" } },
      },
    },
    financials: {
      type: "object",
      properties: {
        stockTicker: { type: "string" },
        marketCap: { type: "string" },
        fundingRounds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              roundName: { type: "string" },
              amount: { type: "string" },
              date: { type: "string" },
              leadInvestors: { type: "array", items: { type: "string" } },
            },
          },
        },
        investors: { type: "array", items: { type: "string" } },
        subsidiaries: { type: "array", items: { type: "string" } },
      },
    },
    primaryServicesOrProducts: { type: "array", items: { type: "string" } },
    keyPersonnel: { type: "array", items: { type: "object", properties: { name: { type: "string" }, title: { type: "string" } } } },
    talentAndHiring: { type: "string" },
    techStack: { type: "array", items: { type: "string" } },
    publicSentiment: { type: "string" },
    regulatoryAndIP: { type: "string" },
    socialMediaPresence: { type: "array", items: { type: "object", properties: { platform: { type: "string" }, url: { type: "string", format: "uri" } } } },
    allLinks: { type: "array", items: { type: "string", format: "uri" } },
  },
  required: ["companyName", "companyType", "headline", "summary", "allLinks"],
} as const;

export async function linkupSourcedAnswer(query: string): Promise<{
  rawResponse: string;
  sources: Array<{ name: string; url: string; snippet?: string }>;
}> {
  if (!linkupClientInstance) {
    return {
      rawResponse: `Linkup API key missing; returning fallback response for "${query}"`,
      sources: [],
    };
  }

  try {
    const res: any = await linkupClientInstance.search({ query, depth: "deep", outputType: "sourcedAnswer" });
    return {
      rawResponse:
        res?.answer || `Linkup search completed but returned no answer for "${query}"`,
      sources: Array.isArray(res?.sources) ? res.sources : [],
    };
  } catch (error) {
    return {
      rawResponse: `Linkup search failed (${formatLinkupError(error)})`,
      sources: [],
    };
  }
}

export async function linkupPersonProfile(fullNameAndCompany: string) {
  if (!linkupClientInstance) {
    return { ok: false, error: "Linkup API key missing" } as const;
  }

  try {
    const client = linkupClientInstance;
    return await client.search({
      query: fullNameAndCompany,
      depth: "standard",
      outputType: "structured",
      structuredOutputSchema: comprehensivePersonSchema,
    });
  } catch (e) {
    return { error: `Failed to fetch profile: ${formatLinkupError(e)}` } as const;
  }
}

export async function linkupCompanyProfile(companyName: string) {
  if (!linkupClientInstance) {
    return { ok: false, error: "Linkup API key missing" } as const;
  }

  try {
    const client = linkupClientInstance;
    return await client.search({
      query: companyName,
      depth: "standard",
      outputType: "structured",
      structuredOutputSchema: comprehensiveCompanySchema,
    });
  } catch (e) {
    return { error: `Failed to fetch company profile: ${formatLinkupError(e)}` } as const;
  }
}

export async function linkupStructuredSearch(
  query: string,
  structuredOutputSchema: any,
  depth: "standard" | "deep" = "standard",
  includeImages?: boolean
) {
  if (!linkupClientInstance) {
    return makeFallbackStructuredResponse(query, structuredOutputSchema);
  }

  const params: any = {
    query,
    depth,
    outputType: "structured",
    structuredOutputSchema,
  };
  if (includeImages) {
    params.includeImages = true;
  }

  try {
    const client = linkupClientInstance;
    return await client.search(params);
  } catch (error) {
    const fallback = makeFallbackStructuredResponse(query, structuredOutputSchema);
    fallback.structured.error = formatLinkupError(error);
    return fallback;
  }
}

/**
 * Search for images using Linkup
 * Returns array of image results with name, url, and type
 */
export async function linkupImageSearch(
  query: string,
  depth: "standard" | "deep" = "standard"
): Promise<Array<{ name: string; url: string; type: string }>> {
  if (!linkupClientInstance) {
    return FALLBACK_IMAGE_RESULTS;
  }

  try {
    const res: any = await linkupClientInstance.search({
      query,
      depth,
      outputType: "searchResults",
      includeImages: true,
    });

    const results = Array.isArray(res?.results) ? res.results : [];
    const images = results.filter((r: any) => r.type === "image").map((r: any) => ({
      name: r.name || "",
      url: r.url || "",
      type: r.type || "image",
    }));

    return images.length > 0 ? images : FALLBACK_IMAGE_RESULTS;
  } catch (error) {
    console.warn(`[linkup] image search failed: ${formatLinkupError(error)}`);
    return FALLBACK_IMAGE_RESULTS;
  }
}
