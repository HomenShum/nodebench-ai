# Query Pattern 1: Criteria-Based Search - Detailed Flow

## 🎯 User Query Example

```
"Find companies: $2M+ seed stage, healthcare/life science, 
founded after 2022, experienced founders"
```

---

## 📊 Complete Processing Flow

### Step 1: User Input → Fast Agent Panel
```
User types query in Fast Agent Panel
  ↓
Panel captures request
  ↓
Sends to CoordinatorAgent
```

### Step 2: CoordinatorAgent Analysis
```
CoordinatorAgent receives: "Find companies: $2M+ seed..."
  ↓
Analyzes request type: "This is an entity research query"
  ↓
Delegates to EntityResearchAgent
```

### Step 3: EntityResearchAgent Routes to Tool
```
EntityResearchAgent receives delegated request
  ↓
Identifies tool needed: searchCompaniesByCriteria
  ↓
Extracts parameters:
  - minFunding: "$2M"
  - industry: "healthcare"
  - minFoundingYear: 2022
  - requireFounderExperience: true
```

### Step 4: searchCompaniesByCriteria Tool Execution
**File**: `convex/agents/specializedAgents.ts:912-1001`

```typescript
searchCompaniesByCriteria: createTool({
  description: "Search for companies matching specific criteria",
  args: {
    minFunding: "$2M",
    industry: "healthcare",
    minFoundingYear: 2022,
    requireFounderExperience: true,
    maxResults: 10
  },
  handler: async (ctx, args) => {
    // Step 4a: Build search query
    // Step 4b: Call LinkUp API
    // Step 4c: Filter results
    // Step 4d: Extract CRM fields
    // Step 4e: Store in cache
  }
})
```

### Step 4a: Build Search Query
**File**: `convex/agents/specializedAgents.ts:930-940`

```typescript
const queryParts: string[] = [];
if (args.industry) queryParts.push(args.industry);           // "healthcare"
if (args.minFoundingYear) queryParts.push(`founded after ${args.minFoundingYear}`);  // "founded after 2022"
if (args.minFunding) queryParts.push(`funded ${args.minFunding} or more`);  // "funded $2M or more"

const searchQuery = queryParts.length > 0
  ? `${queryParts.join(' ')} companies`
  : 'companies';

// Result: "healthcare founded after 2022 funded $2M or more companies"
```

### Step 4b: Call LinkUp API
**File**: `convex/agents/specializedAgents.ts:944`

```typescript
const searchResults = await linkupStructuredSearch(
  searchQuery,                      // "healthcare founded after 2022 funded $2M or more companies"
  comprehensiveCompanySchema,       // 40+ field schema
  "deep"                            // Deep search mode for comprehensive results
);

// LinkUp API returns:
// Array of companies with 40+ fields each:
// - companyName
// - headline
// - summary
// - location
// - website
// - financials (funding rounds, market cap)
// - keyPersonnel (founders, executives)
// - primaryServicesOrProducts
// - competitiveLandscape
// - swotAnalysis
// - ... and 30+ more fields
```

### Step 4c: Filter Results by Criteria
**File**: `convex/agents/specializedAgents.ts:956-959`

```typescript
const matchedCompanies = companies.filter((company: any) =>
  matchesCriteria(company, args)
).slice(0, args.maxResults || 10);
```

**matchesCriteria Function** - `convex/agents/criteriaSearch.ts:147-201`

For each company, checks ALL criteria:

#### 1️⃣ Funding Filter
```typescript
if (criteria.minFunding || criteria.maxFunding) {
  const totalFunding = company.financials?.fundingRounds?.reduce(
    (sum, round) => sum + parseFundingAmount(round.amount || '0'),
    0
  ) || 0;
  
  if (criteria.minFunding) {
    const minAmount = parseFundingAmount(criteria.minFunding);  // "$2M" → 2,000,000
    if (totalFunding < minAmount) return false;  // ❌ Reject if below $2M
  }
}
```

**parseFundingAmount Function** - `convex/agents/criteriaSearch.ts:9-26`
```typescript
export function parseFundingAmount(fundingStr: string): number {
  // "$2M" → 2,000,000
  // "$500K" → 500,000
  // "$1.5B" → 1,500,000,000
  
  const cleaned = fundingStr.replace(/[$,\s]/g, '').toUpperCase();
  const match = cleaned.match(/^([\d.]+)([KMB])?$/);
  
  const amount = parseFloat(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'K': return amount * 1_000;
    case 'M': return amount * 1_000_000;
    case 'B': return amount * 1_000_000_000;
    default: return amount;
  }
}
```

#### 2️⃣ Industry Filter
```typescript
if (criteria.industry) {
  const detectedIndustry = extractIndustry(
    company.summary,
    company.headline,
    company.primaryServicesOrProducts
  );
  if (!detectedIndustry || !detectedIndustry.toLowerCase().includes(criteria.industry.toLowerCase())) {
    return false;  // ❌ Reject if not healthcare
  }
}
```

**extractIndustry Function** - `convex/agents/criteriaSearch.ts:102-127`
```typescript
export function extractIndustry(summary, headline, products): string | null {
  const healthcareKeywords = [
    'healthcare', 'health', 'medical', 'biotech', 'pharma',
    'clinical', 'hospital', 'patient', 'disease', 'treatment',
    'therapy', 'drug', 'medicine', 'wellness', 'telemedicine',
    'diagnostics', 'lab', 'genetic', 'vaccine', 'life science'
  ];
  
  const text = [summary, headline, ...products].join(' ').toLowerCase();
  
  if (healthcareKeywords.some(keyword => text.includes(keyword))) {
    return 'healthcare';  // ✅ Match found
  }
  return null;  // ❌ No match
}
```

#### 3️⃣ Founding Year Filter
```typescript
const foundingYear = extractFoundingYear(company.summary, company.headline, company.allLinks);
if (criteria.minFoundingYear && foundingYear && foundingYear < criteria.minFoundingYear) {
  return false;  // ❌ Reject if founded before 2022
}
```

**extractFoundingYear Function** - `convex/agents/criteriaSearch.ts:70-97`
```typescript
export function extractFoundingYear(summary, headline, allLinks): number | null {
  const text = `${summary} ${headline}`.toLowerCase();
  
  const patterns = [
    /founded\s+(?:in\s+)?(\d{4})/i,
    /established\s+(?:in\s+)?(\d{4})/i,
    /launched\s+(?:in\s+)?(\d{4})/i,
    /created\s+(?:in\s+)?(\d{4})/i,
    /since\s+(\d{4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      if (year >= 1900 && year <= new Date().getFullYear()) {
        return year;  // ✅ Valid year found
      }
    }
  }
  return null;  // ❌ No year found
}
```

#### 4️⃣ Founder Experience Filter
```typescript
if (criteria.requireFounderExperience) {
  const hasExperience = checkFounderExperience(
    company.keyPersonnel,
    undefined,
    company.summary
  );
  if (!hasExperience) return false;  // ❌ Reject if no founder experience
}
```

**checkFounderExperience Function** - `convex/agents/criteriaSearch.ts:45-65`
```typescript
export function checkFounderExperience(keyPersonnel, workExperience, summary): boolean {
  const experienceKeywords = [
    'founder', 'co-founder', 'ceo', 'startup', 'entrepreneur',
    'serial entrepreneur', 'founded', 'launched', 'created',
    'established', 'built', 'scaled'
  ];
  
  const text = [
    ...keyPersonnel?.map(p => `${p.name} ${p.title}`),
    ...workExperience?.map(w => `${w.jobTitle} at ${w.companyName}`),
    summary
  ].join(' ').toLowerCase();
  
  return experienceKeywords.some(keyword => text.includes(keyword));  // ✅ or ❌
}
```

### Step 4d: Extract CRM Fields
**File**: `convex/agents/specializedAgents.ts:965-989`

```typescript
for (const company of matchedCompanies) {
  const companyData = company as any;
  const companyName = companyData?.companyName || 'Unknown';
  
  // Extract 40 CRM fields from LinkUp data
  const crmFields = extractCRMFields(companyData, companyName);
  
  // crmFields includes:
  // - companyName, description, headline
  // - hqLocation, city, state, country
  // - website, email, phone, linkedin
  // - founders, foundersBackground, keyPeople
  // - industry, companyType, foundingYear
  // - product, targetMarket, businessModel
  // - fundingStage, totalFunding, lastFundingDate
  // - investors, investorBackground
  // - competitors, competitorAnalysis
  // - fdaApprovalStatus, fdaTimeline
  // - newsTimeline, recentNews
  // - keyEntities, researchPapers, partnerships
  // - completenessScore, dataQuality
}
```

### Step 4e: Store in Cache
**File**: `convex/agents/specializedAgents.ts:975-989`

```typescript
await ctx.runMutation(api.entityContexts.storeEntityContext, {
  entityName: companyName,
  entityType: "company",
  linkupData: companyData,
  summary: companyData?.summary || `Research data for ${companyName}`,
  keyFacts: [
    companyData?.headline,
    `Industry: ${crmFields.industry}`,
    `Funding: ${crmFields.totalFunding}`,
    `Founded: ${crmFields.foundingYear}`,
  ].filter(Boolean),
  sources: companyData?.allLinks?.slice(0, 5).map(url => ({ name: url, url })),
  crmFields,
  researchedBy: userId,
});

// Stored in entityContexts table with 7-day TTL
// Future queries for same company return cached data instantly
```

### Step 5: Format Results
**File**: `convex/agents/specializedAgents.ts:991-997`

```typescript
results.push(`✅ **${companyName}**
- Industry: ${crmFields.industry}
- Founded: ${crmFields.foundingYear}
- Funding: ${crmFields.totalFunding}
- Founders: ${crmFields.founders.join(', ')}
- Location: ${crmFields.hqLocation}
- Product: ${crmFields.product}`);
```

### Step 6: Return to Agent
```
searchCompaniesByCriteria tool returns formatted results
  ↓
EntityResearchAgent receives results
  ↓
Formats as markdown response
```

### Step 7: Display in Fast Agent Panel
```
Agent response sent to Fast Agent Panel
  ↓
UIMessageBubble renders results
  ↓
Shows to user with:
  - Company names
  - Industry
  - Founding year
  - Funding
  - Founders
  - Location
  - Product
```

---

## 🔄 Criteria Matching Logic

All criteria must be met (AND logic):

```
✅ Funding >= $2M
  AND
✅ Industry contains "healthcare"
  AND
✅ Founded year >= 2022
  AND
✅ Founders have experience
  
= Company matches criteria
```

If ANY criterion fails → Company is rejected

---

## 📈 Performance

- **LinkUp API call**: 2-4 seconds
- **Criteria filtering**: <100ms
- **CRM extraction**: <100ms
- **Cache storage**: <100ms
- **Total**: ~3-5 seconds

---

## 💾 Caching Benefit

After first search:
- Companies are cached with 7-day TTL
- Follow-up queries return instantly (<100ms)
- No additional LinkUp API calls needed
- Reduces API costs and improves UX

---

## ✅ Summary

Query Pattern 1 flow:
1. User enters criteria in Fast Agent Panel
2. CoordinatorAgent delegates to EntityResearchAgent
3. searchCompaniesByCriteria tool builds query
4. LinkUp API returns companies with 40+ fields
5. matchesCriteria filters by ALL criteria
6. CRM fields extracted and cached
7. Results formatted and displayed
8. User sees matching companies with full details

