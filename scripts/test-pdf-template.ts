/**
 * Test Script: Generate Sample PDF Report
 *
 * Creates a PDF with mock funding data to visually test the NodeBench AI template.
 * Run with: npx tsx scripts/test-pdf-template.ts
 */

import { generate } from "@pdfme/generator";
import { text, image } from "@pdfme/schemas";
import type { Template } from "@pdfme/common";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// COPY OF TEMPLATE FROM scheduledPDFReports.ts (for standalone testing)
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 12;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const CHART_WIDTH = 85;
const CHART_HEIGHT = 55;

const COLORS = {
  primary: "#4f46e5",
  primaryDark: "#3730a3",
  primaryLight: "#818cf8",
  capital: "#2563eb",
  trend: "#059669",
  trendDown: "#dc2626",
  alert: "#f97316",
  text: "#111827",
  textSecondary: "#4b5563",
  textMuted: "#9ca3af",
  bgAccent: "#f5f3ff",
  bgMuted: "#f9fafb",
};

const FONTS = {
  hero: 28,
  title: 18,
  subtitle: 14,
  heading: 11,
  body: 9,
  small: 7.5,
  micro: 6.5,
};

const CHART_COLORS = [
  "#4f46e5", "#7c3aed", "#2563eb", "#0891b2",
  "#059669", "#f97316", "#ec4899", "#8b5cf6",
];

const SIDEBAR_WIDTH = 55;
const MAIN_WIDTH = CONTENT_WIDTH - SIDEBAR_WIDTH - 5;

const scheduledReportTemplate: Template = {
  basePdf: { width: PAGE_WIDTH, height: PAGE_HEIGHT, padding: [MARGIN, MARGIN, MARGIN, MARGIN] },
  schemas: [
    [
      // ZONE 1: HEADER
      { name: "heroHeadline", type: "text", position: { x: MARGIN, y: MARGIN }, width: CONTENT_WIDTH, height: 14, fontSize: FONTS.hero, fontColor: COLORS.primaryDark, alignment: "left" },
      { name: "brandLine", type: "text", position: { x: MARGIN, y: MARGIN + 15 }, width: CONTENT_WIDTH * 0.6, height: 6, fontSize: FONTS.small, fontColor: COLORS.primary, alignment: "left" },
      { name: "quarterLabel", type: "text", position: { x: MARGIN, y: MARGIN + 22 }, width: CONTENT_WIDTH * 0.5, height: 6, fontSize: FONTS.subtitle, fontColor: COLORS.textSecondary, alignment: "left" },
      { name: "dataSource", type: "text", position: { x: MARGIN + CONTENT_WIDTH * 0.5, y: MARGIN + 22 }, width: CONTENT_WIDTH * 0.5, height: 6, fontSize: FONTS.small, fontColor: COLORS.textMuted, alignment: "right" },

      // ZONE 2: VISUAL DATA
      { name: "chartsTitle", type: "text", position: { x: MARGIN, y: MARGIN + 32 }, width: MAIN_WIDTH, height: 6, fontSize: FONTS.heading, fontColor: COLORS.primaryDark },
      { name: "sectorPieChart", type: "image", position: { x: MARGIN, y: MARGIN + 40 }, width: CHART_WIDTH, height: CHART_HEIGHT },
      { name: "fundingBarChart", type: "image", position: { x: MARGIN + CHART_WIDTH + 4, y: MARGIN + 40 }, width: MAIN_WIDTH - CHART_WIDTH - 4, height: CHART_HEIGHT },

      // Key Metrics Sidebar
      { name: "metricsTitle", type: "text", position: { x: MARGIN + MAIN_WIDTH + 5, y: MARGIN + 32 }, width: SIDEBAR_WIDTH, height: 6, fontSize: FONTS.heading, fontColor: COLORS.primaryDark },
      { name: "totalCapitalLabel", type: "text", position: { x: MARGIN + MAIN_WIDTH + 5, y: MARGIN + 42 }, width: SIDEBAR_WIDTH, height: 4, fontSize: FONTS.small, fontColor: COLORS.textMuted },
      { name: "totalCapitalValue", type: "text", position: { x: MARGIN + MAIN_WIDTH + 5, y: MARGIN + 47 }, width: SIDEBAR_WIDTH, height: 7, fontSize: FONTS.title, fontColor: COLORS.capital },
      { name: "totalDealsLabel", type: "text", position: { x: MARGIN + MAIN_WIDTH + 5, y: MARGIN + 56 }, width: SIDEBAR_WIDTH, height: 4, fontSize: FONTS.small, fontColor: COLORS.textMuted },
      { name: "totalDealsValue", type: "text", position: { x: MARGIN + MAIN_WIDTH + 5, y: MARGIN + 61 }, width: SIDEBAR_WIDTH, height: 6, fontSize: FONTS.subtitle, fontColor: COLORS.text },
      { name: "medianDealLabel", type: "text", position: { x: MARGIN + MAIN_WIDTH + 5, y: MARGIN + 70 }, width: SIDEBAR_WIDTH, height: 4, fontSize: FONTS.small, fontColor: COLORS.textMuted },
      { name: "medianDealValue", type: "text", position: { x: MARGIN + MAIN_WIDTH + 5, y: MARGIN + 75 }, width: SIDEBAR_WIDTH, height: 6, fontSize: FONTS.subtitle, fontColor: COLORS.text },
      { name: "momentumLabel", type: "text", position: { x: MARGIN + MAIN_WIDTH + 5, y: MARGIN + 84 }, width: SIDEBAR_WIDTH, height: 4, fontSize: FONTS.small, fontColor: COLORS.textMuted },
      { name: "momentumIndicator", type: "text", position: { x: MARGIN + MAIN_WIDTH + 5, y: MARGIN + 89 }, width: SIDEBAR_WIDTH, height: 5, fontSize: FONTS.body, fontColor: COLORS.trend },

      // ZONE 3: DETAILED DATA
      { name: "summaryTitle", type: "text", position: { x: MARGIN, y: MARGIN + 100 }, width: CONTENT_WIDTH, height: 6, fontSize: FONTS.heading, fontColor: COLORS.primaryDark },
      { name: "executiveSummary", type: "text", position: { x: MARGIN, y: MARGIN + 108 }, width: CONTENT_WIDTH, height: 14, fontSize: FONTS.body, fontColor: COLORS.text, lineHeight: 1.35 },

      { name: "topDealsTitle", type: "text", position: { x: MARGIN, y: MARGIN + 126 }, width: CONTENT_WIDTH, height: 6, fontSize: FONTS.heading, fontColor: COLORS.primaryDark },
      { name: "topDealsList", type: "text", position: { x: MARGIN, y: MARGIN + 134 }, width: CONTENT_WIDTH, height: 44, fontSize: FONTS.small, fontColor: COLORS.text, lineHeight: 1.2 },

      // Sector + Investors side-by-side
      { name: "sectorTitle", type: "text", position: { x: MARGIN, y: MARGIN + 182 }, width: CONTENT_WIDTH * 0.5 - 2, height: 6, fontSize: FONTS.heading, fontColor: COLORS.primaryDark },
      { name: "sectorBreakdown", type: "text", position: { x: MARGIN, y: MARGIN + 190 }, width: CONTENT_WIDTH * 0.5 - 2, height: 18, fontSize: FONTS.small, fontColor: COLORS.text, lineHeight: 1.25 },

      { name: "investorsTitle", type: "text", position: { x: MARGIN + CONTENT_WIDTH * 0.5 + 2, y: MARGIN + 182 }, width: CONTENT_WIDTH * 0.5 - 2, height: 6, fontSize: FONTS.heading, fontColor: COLORS.primaryDark },
      { name: "topInvestorsList", type: "text", position: { x: MARGIN + CONTENT_WIDTH * 0.5 + 2, y: MARGIN + 190 }, width: CONTENT_WIDTH * 0.5 - 2, height: 18, fontSize: FONTS.small, fontColor: COLORS.text, lineHeight: 1.25 },

      // Geographic Distribution (full width)
      { name: "geoTitle", type: "text", position: { x: MARGIN, y: MARGIN + 210 }, width: CONTENT_WIDTH, height: 5, fontSize: FONTS.heading, fontColor: COLORS.primaryDark },
      { name: "geoBreakdownLine", type: "text", position: { x: MARGIN, y: MARGIN + 216 }, width: CONTENT_WIDTH, height: 6, fontSize: FONTS.small, fontColor: COLORS.textSecondary, lineHeight: 1.2 },

      // ZONE 4: AI ANALYSIS
      { name: "insightsTitle", type: "text", position: { x: MARGIN, y: MARGIN + 226 }, width: CONTENT_WIDTH, height: 6, fontSize: FONTS.heading, fontColor: COLORS.primary },
      { name: "insightsContent", type: "text", position: { x: MARGIN, y: MARGIN + 234 }, width: CONTENT_WIDTH, height: 42, fontSize: FONTS.small, fontColor: COLORS.textSecondary, lineHeight: 1.2 },

      // ZONE 5: FOOTER
      { name: "disclaimer", type: "text", position: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 5 }, width: CONTENT_WIDTH, height: 5, fontSize: FONTS.micro, fontColor: COLORS.textMuted, alignment: "center" },
    ],
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// QUICKCHART GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateSectorPieChart(): Promise<string> {
  const chartConfig = {
    type: "doughnut",
    data: {
      labels: ["AI/ML", "FinTech", "HealthTech", "CleanTech", "SaaS", "Other"],
      datasets: [{
        data: [450, 280, 220, 180, 150, 120],
        backgroundColor: CHART_COLORS.slice(0, 6),
        borderWidth: 2,
        borderColor: "#ffffff",
      }],
    },
    options: {
      cutout: "55%",
      plugins: {
        legend: {
          position: "right",
          labels: { font: { size: 10 }, boxWidth: 12, padding: 8, usePointStyle: true },
        },
        title: {
          display: true,
          text: "SECTOR ALLOCATION",
          font: { size: 11, weight: "bold" },
          color: COLORS.primaryDark,
        },
      },
    },
  };

  const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=400&h=250&format=png&backgroundColor=white`;

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
  } catch (e) {
    console.error("Failed to fetch pie chart:", e);
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }
}

async function generateFundingBarChart(): Promise<string> {
  const chartConfig = {
    type: "bar",
    data: {
      labels: ["Series B", "Series A", "Seed", "Series C", "Growth"],
      datasets: [{
        label: "Capital ($M)",
        data: [520, 380, 220, 180, 100],
        backgroundColor: COLORS.capital,
        borderWidth: 0,
        barThickness: 14,
        borderRadius: 2,
      }],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "CAPITAL BY ROUND TYPE ($M)",
          font: { size: 11, weight: "bold" },
          color: COLORS.primaryDark,
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } },
      },
    },
  };

  const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=400&h=250&format=png&backgroundColor=white`;

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
  } catch (e) {
    console.error("Failed to fetch bar chart:", e);
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_INPUTS = {
  // ZONE 1: Header
  heroHeadline: "AI/ML Dominates with 32% of Funding",
  brandLine: "NODEBENCH AI • VENTURE INTELLIGENCE",
  quarterLabel: "Q4 2025",
  dataSource: "Data through January 14, 2026",

  // ZONE 2: Charts + Metrics
  chartsTitle: "Capital Allocation by Sector & Round Type",
  metricsTitle: "KEY METRICS",
  totalCapitalLabel: "TOTAL CAPITAL",
  totalCapitalValue: "$1.4B",
  totalDealsLabel: "DEAL COUNT",
  totalDealsValue: "47 Deals",
  medianDealLabel: "MEDIAN SIZE",
  medianDealValue: "$18.5M",
  momentumLabel: "MARKET MOMENTUM",
  momentumIndicator: "▲▲ Strong Momentum",

  // ZONE 3: Detailed Data
  summaryTitle: "EXECUTIVE SUMMARY",
  executiveSummary: "Venture funding totaled $1.4B across 47 transactions in Q4 2025. Early-stage rounds (Seed/Series A) represented 28 deals totaling $420M, while growth-stage rounds (Series B+) accounted for 19 deals totaling $980M. Median deal size: $18.5M.",

  topDealsTitle: "TOP FUNDING ROUNDS",
  topDealsList: `1. Anthropic — Series D — $750M
   Lead: Google, Salesforce Ventures [Announced Dec 15]
2. Cerebras Systems — Series F — $250M
   Lead: G42, Altimeter Capital [Announced Dec 8]
3. Waymo — Series C — $200M
   Lead: Alphabet, Andreessen Horowitz [Announced Nov 22]
4. Scale AI — Series E — $150M
   Lead: Accel, Index Ventures [Announced Nov 15]
5. Anduril — Series F — $120M
   Lead: Founders Fund, General Catalyst [Announced Oct 30]
6. Rippling — Series D — $100M
   Lead: Greenoaks Capital [Announced Oct 18]`,

  sectorTitle: "SECTOR BREAKDOWN",
  sectorBreakdown: `AI/ML: ████████ 32%
FinTech: ██████ 20%
HealthTech: █████ 16%
CleanTech: ████ 13%`,

  investorsTitle: "MOST ACTIVE INVESTORS",
  topInvestorsList: `Andreessen Horowitz: 5 deals
Sequoia Capital: 4 deals
Google Ventures: 3 deals
Founders Fund: 3 deals`,

  // Geographic Distribution
  geoTitle: "GEOGRAPHIC DISTRIBUTION",
  geoBreakdownLine: "United States: 78%  •  Europe: 12%  •  Asia: 6%  •  Israel: 4%",

  // ZONE 4: AI Analysis
  insightsTitle: "🤖 AI Market Analysis — Powered by NodeBench",
  insightsContent: `## EXECUTIVE SUMMARY
AI/ML continues to dominate Q4 2025 funding with 32% of total capital deployed. Anthropic's $750M Series D represents the quarter's mega-round, signaling sustained investor confidence in foundation models.

## SECTOR TRENDS
• AI/ML: Bullish - Deal flow increased 40% QoQ with 5 deals exceeding $100M
• FinTech: Neutral - Steady activity focused on B2B payments and infrastructure
• HealthTech: Emerging - Notable uptick in AI-powered diagnostics investments

## MARKET MOMENTUM
Late-stage funding (Series B+) accounted for 70% of total capital, indicating investor preference for proven business models. Geographic distribution remained US-centric (78%), with notable European expansion in CleanTech.

## ACTIONABLE INSIGHTS
• Founders: AI infrastructure and vertical AI applications remain highly fundable
• Investors: Focus due diligence on AI governance and compliance tooling
• Corporates: Consider M&A targets in AI-native customer service and analytics`,

  // ZONE 5: Footer
  disclaimer: "© NodeBench AI • Automated Market Intelligence • For informational purposes only. Data compiled from publicly available sources. This report does not constitute investment advice.",
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("🚀 NodeBench AI PDF Template Test\n");
  console.log("Generating charts...");

  // Generate charts
  const [pieChart, barChart] = await Promise.all([
    generateSectorPieChart(),
    generateFundingBarChart(),
  ]);

  console.log("✅ Charts generated");

  // Prepare inputs with charts
  const inputs = {
    ...MOCK_INPUTS,
    sectorPieChart: pieChart,
    fundingBarChart: barChart,
  };

  console.log("Generating PDF...");

  // Generate PDF
  const pdfBuffer = await generate({
    template: scheduledReportTemplate,
    inputs: [inputs],
    plugins: { text, image },
  });

  // Save to file
  const outputPath = path.join(__dirname, "../output/test-nodebench-report.pdf");
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`\n✅ PDF generated successfully!`);
  console.log(`📄 Output: ${outputPath}`);
  console.log(`📊 Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB\n`);

  // Print comparison checklist
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("📋 JPMorgan Comparison Checklist");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const checklist = [
    { item: "Editorial headline (not generic)", status: "✅", notes: "Dynamic headlines based on data" },
    { item: "Data source attribution", status: "✅", notes: "\"Data through [date]\"" },
    { item: "Executive summary narrative", status: "✅", notes: "Includes stage breakdown" },
    { item: "Median deal size", status: "✅", notes: "Displayed in metrics sidebar" },
    { item: "Stage groupings (Early/Late)", status: "✅", notes: "Seed/A vs B+ in executive summary" },
    { item: "Source citations on deals", status: "✅", notes: "[Announced date] per deal" },
    { item: "Legal disclaimer", status: "✅", notes: "Footer with \"not investment advice\"" },
    { item: "Visual charts", status: "✅", notes: "QuickChart.io integration" },
    { item: "Z-pattern layout", status: "✅", notes: "Header → Charts+Sidebar → Details → AI" },
    { item: "Branded color palette", status: "✅", notes: "Indigo/violet (not JPM navy)" },
    { item: "Market momentum indicator", status: "✅", notes: "Score-based momentum with trend icons" },
    { item: "Top investors table", status: "✅", notes: "Standalone 'Most Active Investors' section" },
    { item: "Geographic breakdown", status: "✅", notes: "Full-width compact distribution line" },
    { item: "Combination charts (bars+lines)", status: "⚠️", notes: "Only separate charts, no Pareto" },
    { item: "YoY/QoQ comparison data", status: "⚠️", notes: "Momentum indicator (no historical data)" },
    { item: "IPO pipeline section", status: "❌", notes: "Not included in template" },
  ];

  checklist.forEach(({ item, status, notes }) => {
    console.log(`${status} ${item}`);
    console.log(`   └─ ${notes}\n`);
  });

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🎯 REMAINING GAPS (Minor)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("1. No IPO/Exit pipeline - JPM includes upcoming liquidity events");
  console.log("2. No Pareto (combo) charts - JPM uses bars + line overlays");
  console.log("3. No historical YoY/QoQ data - requires data persistence\n");

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("✅ FEATURES MATCHING/EXCEEDING JPM (13/16 = 81%)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("• Editorial headlines (data-driven storytelling)");
  console.log("• Market momentum indicator with trend icons");
  console.log("• Geographic distribution breakdown");
  console.log("• Most Active Investors section");
  console.log("• AI-powered market analysis (unique to NodeBench)");
  console.log("• Visual charts with branded color palette");
  console.log("• Professional Z-pattern layout\n");
}

main().catch(console.error);
