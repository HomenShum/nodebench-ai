/**
 * Analyze JPMorgan PDF with Gemini 2.0 Flash
 *
 * Downloads the JPMorgan Q4 2025 Biopharma report and uses Gemini
 * to extract the visual structure, layout, and design elements.
 *
 * Run: npx tsx scripts/analyze-jpm-pdf-with-gemini.ts
 */

import { GoogleGenAI, createPartFromUri, Type } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
const JPM_PDF_URL = "https://www.jpmorgan.com/content/dam/jpmorgan/documents/cb/insights/outlook/jpm-biopharma-deck-q4-2025.pdf";

async function downloadPdf(url: string, outputPath: string): Promise<void> {
  console.log(`Downloading PDF from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  console.log(`✅ PDF downloaded to ${outputPath}`);
}

async function analyzeWithGemini(pdfPath: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY or GOOGLE_AI_API_KEY not set");
  }

  console.log("Initializing Gemini...");
  const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Read PDF as base64
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString("base64");

  console.log("Uploading PDF to Gemini...");

  // Use Gemini 2.0 Flash for document understanding
  const model = genai.models.generateContent;

  const prompt = `You are analyzing a JPMorgan quarterly funding report PDF.

TASK: Extract the EXACT visual structure, layout, and design elements that make this report professional.

Please provide a detailed analysis with these sections:

## 1. PAGE LAYOUT STRUCTURE
- How many distinct zones/sections per page?
- What is the grid system (columns, rows)?
- What is the visual hierarchy (eye flow pattern)?

## 2. HEADER DESIGN
- What elements appear in headers?
- Font sizes and colors used?
- Any logos or brand marks?

## 3. CHART TYPES & STYLES
- List each chart type used (bar, line, pie, combo, etc.)
- What color palette is used?
- How are axes labeled?
- Are there trend lines or annotations?

## 4. DATA PRESENTATION
- How are deals/transactions listed?
- What columns are in tables?
- How are amounts formatted?
- What metadata is shown per deal?

## 5. METRICS & KPIs
- What metrics are highlighted prominently?
- How are percentages/changes displayed?
- Are there trend indicators (arrows, colors)?

## 6. COMPARISON ELEMENTS
- Is there YoY or QoQ comparison?
- How is historical data shown?
- Any benchmark comparisons?

## 7. FOOTER & DISCLAIMERS
- What legal text appears?
- Data source attribution?
- Date/cutoff information?

## 8. UNIQUE PROFESSIONAL ELEMENTS
- What makes this report look "institutional grade"?
- Any elements we should definitely replicate?
- What differentiates it from typical reports?

Be specific with colors (hex codes if visible), font sizes, spacing, and layout measurements.`;

  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      maxOutputTokens: 8000,
      temperature: 0.1,
    },
  });

  return response.text || "No response generated";
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🔍 JPMorgan PDF Analysis with Gemini 2.0 Flash");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Create output directory
  const outputDir = path.join(__dirname, "../output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Download PDF
  const pdfPath = path.join(outputDir, "jpm-biopharma-q4-2025.pdf");
  if (!fs.existsSync(pdfPath)) {
    await downloadPdf(JPM_PDF_URL, pdfPath);
  } else {
    console.log(`Using cached PDF at ${pdfPath}`);
  }

  // Analyze with Gemini
  console.log("\nAnalyzing PDF with Gemini 2.0 Flash...\n");
  const analysis = await analyzeWithGemini(pdfPath);

  // Save analysis
  const analysisPath = path.join(outputDir, "jpm-analysis.md");
  fs.writeFileSync(analysisPath, `# JPMorgan Q4 2025 Biopharma Report Analysis\n\n${analysis}`);

  console.log(analysis);
  console.log(`\n✅ Analysis saved to ${analysisPath}`);

  // Generate gap analysis
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("🎯 GAP ANALYSIS: NodeBench AI vs JPMorgan");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const nodebenchFeatures = [
    "Editorial headlines",
    "Z-pattern layout",
    "Branded color palette (indigo)",
    "Doughnut chart for sectors",
    "Horizontal bar chart for rounds",
    "Key metrics sidebar",
    "Executive summary narrative",
    "Top deals with source citations",
    "Sector distribution text",
    "AI-generated insights",
    "Legal disclaimer footer",
    "Data source attribution",
    "Median deal size",
    "Stage groupings (Early/Late)",
  ];

  console.log("NodeBench AI Current Features:");
  nodebenchFeatures.forEach(f => console.log(`  ✅ ${f}`));

  console.log("\nRecommended Additions Based on JPM Analysis:");
  const recommendations = [
    "YoY/QoQ trend comparison with arrows",
    "IPO pipeline section",
    "Top investors standalone table",
    "Geographic breakdown visual",
    "Combo charts (bars + trend line)",
    "10-year historical context",
    "Modality-specific breakdowns",
    "M&A activity section",
    "Indexed benchmark comparisons",
  ];
  recommendations.forEach(r => console.log(`  ❌ ${r}`));
}

main().catch(console.error);
