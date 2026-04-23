#!/usr/bin/env node
/**
 * Inject mock data for Wiki Dreaming Pipeline testing
 * 
 * Usage: node scripts/inject-mock-wiki-data.mjs [volume]
 *   volume: 'light' (5 reports), 'medium' (15 reports), 'heavy' (25 reports)
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VOLUME = process.argv[2] || 'light'; // light, medium, heavy

// Define data volumes
const VOLUMES = {
  light: { reports: 5, claimsPerReport: 3, evidencePerReport: 2 },
  medium: { reports: 15, claimsPerReport: 5, evidencePerReport: 4 },
  heavy: { reports: 25, claimsPerReport: 8, evidencePerReport: 6 },
};

const config = VOLUMES[VOLUME];
if (!config) {
  console.error(`Invalid volume: ${VOLUME}. Use: light, medium, heavy`);
  process.exit(1);
}

const OWNER_KEY = 'dreaming-test-user';
const ENTITY_SLUG = 'openai'; // A well-known company for realistic data

console.log(`\n🎯 Injecting ${VOLUME.toUpperCase()} mock data:`);
console.log(`   Owner: ${OWNER_KEY}`);
console.log(`   Entity: ${ENTITY_SLUG}`);
console.log(`   Reports: ${config.reports}`);
console.log(`   Claims per report: ${config.claimsPerReport}`);
console.log(`   Evidence per report: ${config.evidencePerReport}`);
console.log(`   Total expected: ~${config.reports * (1 + config.claimsPerReport + config.evidencePerReport)} documents\n`);

// Helper to run convex commands
function convexRun(functionPath, args) {
  const argsJson = JSON.stringify(args).replace(/"/g, '\\"');
  const cmd = `npx convex run "${functionPath}" "${argsJson}"`;
  try {
    const result = execSync(cmd, { 
      cwd: join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output: result };
  } catch (e) {
    return { success: false, error: e.stderr || e.message };
  }
}

// Generate realistic mock data
const MOCK_REPORTS = [
  { title: 'OpenAI GPT-5 Development Update', summary: 'OpenAI is developing GPT-5 with significant improvements in reasoning and multimodal capabilities. Internal testing shows 40% improvement on complex reasoning benchmarks.', type: 'research' },
  { title: 'OpenAI Funding Round Analysis', summary: 'OpenAI raised $6.5B in Series C funding led by Thrive Capital. Valuation reached $157B. Funds earmarked for compute expansion and safety research.', type: 'funding' },
  { title: 'OpenAI Safety Initiatives Report', summary: 'OpenAI published new safety framework for frontier models. Includes red-teaming protocols and preparedness framework for models beyond GPT-4 capability.', type: 'safety' },
  { title: 'OpenAI Partnership with Microsoft', summary: 'Expanded Azure partnership includes dedicated supercomputing clusters for training. Microsoft invests additional $2B in compute credits.', type: 'partnership' },
  { title: 'OpenAI API Revenue Growth', summary: 'API revenue reached $2B ARR, growing 400% YoY. Enterprise adoption accelerating with ChatGPT Enterprise reaching 1M+ seats.', type: 'financial' },
  { title: 'OpenAI Competition Analysis', summary: 'Competitive landscape intensifying with Anthropic Claude 3.5, Google Gemini Ultra, and open source Llama 3. OpenAI maintains lead in reasoning tasks.', type: 'competitive' },
  { title: 'OpenAI Talent Acquisition', summary: 'Hired key researchers from Google DeepMind and Meta AI. Focus areas: mechanistic interpretability, RLHF scaling, and multimodal architectures.', type: 'talent' },
  { title: 'OpenAI Product Roadmap', summary: 'Sora video generation entering beta. DALL-E 3 integration expanding. Voice engine development continues with safety guardrails.', type: 'product' },
  { title: 'OpenAI Regulatory Response', summary: 'Submitted compliance documentation to EU AI Act. Engaging with US AI Safety Institute. Supporting UK AI Safety Summit initiatives.', type: 'regulatory' },
  { title: 'OpenAI Compute Infrastructure', summary: 'Building $5B custom AI chip R&D facility in Arizona. Partnership with TSMC for advanced node allocation. Oryon project for training chips.', type: 'infrastructure' },
  { title: 'OpenAI Research Publications', summary: 'Published 15 papers at NeurIPS and ICML on alignment, interpretability, and scaling laws. New scaling law predicts continued capability gains through 2026.', type: 'research' },
  { title: 'OpenAI Enterprise Features', summary: 'Launched enterprise SSO, audit logs, and custom GPTs for organizations. Admin controls for data retention and model access permissions.', type: 'enterprise' },
  { title: 'OpenAI Consumer Growth', summary: 'ChatGPT reached 200M weekly active users. Plus subscriptions growing 3x faster than free tier. Mobile app 50M+ downloads.', type: 'growth' },
  { title: 'OpenAI Developer Ecosystem', summary: '3M+ developers on API platform. New assistants API gaining traction. Custom model fine-tuning demand exceeds capacity.', type: 'developer' },
  { title: 'OpenAI Ethics Board Update', summary: 'Added new members from civil rights and labor backgrounds. Quarterly ethics review process established for major model releases.', type: 'governance' },
  { title: 'OpenAI Energy Efficiency', summary: 'New training techniques reduce energy consumption 40%. Renewable energy commitment increased to 100% by 2026 for all operations.', type: 'sustainability' },
  { title: 'OpenAI Multimodal Capabilities', summary: 'GPT-4V demonstrating strong visual reasoning. Audio understanding in testing. Cross-modal integration enables richer agent capabilities.', type: 'capability' },
  { title: 'OpenAI Agent Development', summary: 'Autonomous agent prototypes showing promising results on complex workflows. Safety mechanisms including human-in-the-loop checkpoints.', type: 'agent' },
  { title: 'OpenAI Model Distillation', summary: 'Successfully distilled GPT-4 capabilities into smaller models. 70% of GPT-4 capability in 1/10th size model achieved.', type: 'technical' },
  { title: 'OpenAI Customer Success', summary: 'Fortune 500 adoption at 92% of top companies. Average deployment time reduced to 2 weeks. CSAT scores averaging 4.6/5.', type: 'customer' },
  { title: 'OpenAI Open Source Strategy', summary: 'Released Whisper v3 and Triton v3 under permissive licenses. Balancing openness with safety considerations for frontier models.', type: 'strategy' },
  { title: 'OpenAI International Expansion', summary: 'New offices in Singapore, London, and Tokyo. Local language support expanded to 50+ languages. Regional data residency options.', type: 'expansion' },
  { title: 'OpenAI Education Initiatives', summary: 'ChatGPT Edu launched with institutional pricing. 1000+ universities participating. Custom learning GPTs in development.', type: 'education' },
  { title: 'OpenAI Healthcare Applications', summary: 'Pilot programs with Mayo Clinic and NHS. Focus on medical literature synthesis and clinical decision support tools.', type: 'healthcare' },
  { title: 'OpenAI Robotics Research', summary: 'Figure AI partnership for humanoid robotics. GPT-4V powering robot perception and task planning. Safety protocols for physical systems.', type: 'robotics' },
];

const MOCK_CLAIMS = [
  { claimText: 'OpenAI raised $6.5 billion in Series C funding in October 2024', claimType: 'funding_round', confidence: 0.95 },
  { claimText: 'Company valuation reached $157 billion post-money', claimType: 'funding_amount', confidence: 0.92 },
  { claimText: 'Thrive Capital led the funding round', claimType: 'funding_round', confidence: 0.88 },
  { claimText: 'Microsoft participated as a major investor', claimType: 'funding_round', confidence: 0.90 },
  { claimText: 'Sam Altman serves as CEO of OpenAI', claimType: 'founder_identity', confidence: 0.99 },
  { claimText: 'Headquarters located in San Francisco', claimType: 'headquarters', confidence: 0.98 },
  { claimText: 'GPT-5 development is underway', claimType: 'product_capability', confidence: 0.75 },
  { claimText: 'API revenue reached $2 billion annual recurring revenue', claimType: 'timeline_event', confidence: 0.85 },
  { claimText: 'ChatGPT has 200 million weekly active users', claimType: 'timeline_event', confidence: 0.80 },
  { claimText: '3 million developers use OpenAI API platform', claimType: 'timeline_event', confidence: 0.78 },
  { claimText: 'Sora video generation model entering beta', claimType: 'product_capability', confidence: 0.82 },
  { claimText: 'OpenAI building custom AI chip R&D facility', claimType: 'timeline_event', confidence: 0.70 },
  { claimText: 'Company committed to 100% renewable energy by 2026', claimType: 'timeline_event', confidence: 0.65 },
  { claimText: 'Partnership with Figure AI for robotics', claimType: 'product_capability', confidence: 0.72 },
  { claimText: 'Fortune 500 adoption at 92% of top companies', claimType: 'customer', confidence: 0.68 },
];

const MOCK_EVIDENCE = [
  { label: 'SEC Filing Series C', description: 'Form D filing showing $6.5B capital raise', sourceUrl: 'https://sec.gov/edgar/filing', sourceDomain: 'sec.gov' },
  { label: 'OpenAI Blog Post', description: 'Official announcement of funding round', sourceUrl: 'https://openai.com/blog/funding', sourceDomain: 'openai.com' },
  { label: 'Bloomberg Article', description: 'Analysis of valuation and investor breakdown', sourceUrl: 'https://bloomberg.com/news/openai', sourceDomain: 'bloomberg.com' },
  { label: 'Reuters Report', description: 'Market impact analysis of the funding round', sourceUrl: 'https://reuters.com/tech/openai', sourceDomain: 'reuters.com' },
  { label: 'TechCrunch Coverage', description: 'Startup ecosystem reaction to the raise', sourceUrl: 'https://techcrunch.com/openai-funding', sourceDomain: 'techcrunch.com' },
  { label: 'The Information Source', description: 'Insider details on Thrive Capital leadership', sourceUrl: 'https://theinformation.com/openai', sourceDomain: 'theinformation.com' },
  { label: 'Financial Times', description: 'Global market implications analysis', sourceUrl: 'https://ft.com/technology/openai', sourceDomain: 'ft.com' },
  { label: 'CNBC Interview', description: 'Sam Altman discusses growth strategy', sourceUrl: 'https://cnbc.com/tech/openai-ceo', sourceDomain: 'cnbc.com' },
  { label: 'VentureBeat Analysis', description: 'Competitive landscape implications', sourceUrl: 'https://venturebeat.com/ai/openai', sourceDomain: 'venturebeat.com' },
  { label: 'ArXiv Paper', description: 'GPT-4 technical report and capabilities', sourceUrl: 'https://arxiv.org/abs/openai', sourceDomain: 'arxiv.org' },
  { label: 'Research Blog', description: 'Safety research and alignment updates', sourceUrl: 'https://openai.com/research/safety', sourceDomain: 'openai.com' },
  { label: 'Developer Docs', description: 'API documentation and feature updates', sourceUrl: 'https://platform.openai.com/docs', sourceDomain: 'openai.com' },
];

// Create mutation call helper
async function injectData() {
  const now = Date.now();
  const results = { reports: 0, claims: 0, evidence: 0, errors: [] };

  // Generate and insert reports
  for (let i = 0; i < config.reports; i++) {
    const mock = MOCK_REPORTS[i % MOCK_REPORTS.length];
    const reportArgs = {
      ownerKey: OWNER_KEY,
      entitySlug: ENTITY_SLUG,
      title: `${mock.title} #${i + 1}`,
      summary: mock.summary,
      type: mock.type,
      updatedAt: now - (i * 86400000), // Each report 1 day older
    };

    const result = convexRun('domains/product/wikiStagingMutations:_createMockReport', reportArgs);
    if (result.success) {
      results.reports++;
      console.log(`✓ Report ${i + 1}: ${reportArgs.title.slice(0, 40)}...`);
    } else {
      results.errors.push(`Report ${i}: ${result.error}`);
      console.error(`✗ Report ${i + 1} failed: ${result.error.slice(0, 100)}`);
    }
  }

  // Generate and insert claims
  for (let i = 0; i < config.reports * config.claimsPerReport; i++) {
    const mock = MOCK_CLAIMS[i % MOCK_CLAIMS.length];
    const claimArgs = {
      ownerKey: OWNER_KEY,
      claimText: mock.claimText,
      claimType: mock.claimType,
      supportStrength: mock.confidence > 0.9 ? 'verified' : mock.confidence > 0.7 ? 'corroborated' : 'single_source',
      confidence: mock.confidence,
      createdAt: now - (Math.random() * 30 * 86400000),
    };

    const result = convexRun('domains/product/wikiStagingMutations:_createMockClaim', claimArgs);
    if (result.success) {
      results.claims++;
    } else {
      results.errors.push(`Claim ${i}: ${result.error}`);
    }
  }
  console.log(`✓ Inserted ${results.claims} claims`);

  // Generate and insert evidence
  for (let i = 0; i < config.reports * config.evidencePerReport; i++) {
    const mock = MOCK_EVIDENCE[i % MOCK_EVIDENCE.length];
    const evidenceArgs = {
      ownerKey: OWNER_KEY,
      label: mock.label,
      description: mock.description,
      sourceUrl: mock.sourceUrl,
      sourceDomain: mock.sourceDomain,
      createdAt: now - (Math.random() * 30 * 86400000),
    };

    const result = convexRun('domains/product/wikiStagingMutations:_createMockEvidence', evidenceArgs);
    if (result.success) {
      results.evidence++;
    } else {
      results.errors.push(`Evidence ${i}: ${result.error}`);
    }
  }
  console.log(`✓ Inserted ${results.evidence} evidence items`);

  console.log(`\n📊 Summary:`);
  console.log(`   Reports: ${results.reports}`);
  console.log(`   Claims: ${results.claims}`);
  console.log(`   Evidence: ${results.evidence}`);
  console.log(`   Total: ${results.reports + results.claims + results.evidence}`);
  if (results.errors.length > 0) {
    console.log(`   Errors: ${results.errors.length}`);
  }

  return results;
}

// Run injection
injectData().then((results) => {
  if (results.errors.length === 0) {
    console.log('\n✅ All mock data injected successfully!');
    console.log(`\nNext: Run the dreaming pipeline test:`);
    console.log(`   node scripts/test-dreaming-pipeline-with-data.mjs ${VOLUME}`);
  } else {
    console.log(`\n⚠️ Completed with ${results.errors.length} errors`);
    process.exit(1);
  }
});
