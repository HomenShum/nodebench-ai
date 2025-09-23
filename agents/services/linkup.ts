// agents/services/linkup.ts
// Small, isolated Linkup client + helpers. Safe to import from Convex actions.
import { LinkupClient } from "linkup-sdk";


// Static client (linkup-sdk is installed)
const apiKey = (process.env.LINKUP_API_KEY || process.env.NEXT_PUBLIC_LINKUP_API_KEY || "");
if (!apiKey) throw new Error("Missing LINKUP_API_KEY (or NEXT_PUBLIC_LINKUP_API_KEY) for Linkup");
export const linkupClient = new LinkupClient({ apiKey });

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

export async function linkupSourcedAnswer(query: string): Promise<{ rawResponse: string; sources: Array<{ name: string; url: string; snippet?: string }> }> {
  const client = linkupClient;
  const res: any = await client.search({ query, depth: "deep", outputType: "sourcedAnswer" });
  return {
    rawResponse: res?.answer || "Linkup search completed but returned no answer.",
    sources: Array.isArray(res?.sources) ? res.sources : [],
  };
}

export async function linkupPersonProfile(fullNameAndCompany: string) {
  try {
    const client = linkupClient;
    return await client.search({
      query: fullNameAndCompany,
      depth: "standard",
      outputType: "structured",
      structuredOutputSchema: comprehensivePersonSchema,
    });
  } catch (e) {
    return { error: `Failed to fetch profile: ${(e as Error).message}` } as const;
  }
}

export async function linkupCompanyProfile(companyName: string) {
  try {
    const client = linkupClient;
    return await client.search({
      query: companyName,
      depth: "standard",
      outputType: "structured",
      structuredOutputSchema: comprehensiveCompanySchema,
    });
  } catch (e) {
    return { error: `Failed to fetch company profile: ${(e as Error).message}` } as const;
  }
}



export async function linkupStructuredSearch(query: string, structuredOutputSchema: any, depth: 'standard' | 'deep' = 'standard') {
  const client = linkupClient;
  return await client.search({ query, depth, outputType: 'structured', structuredOutputSchema });
}
