# SEC Filing Tools - User Guide

## Overview

Your Fast Agent Panel now has **SEC EDGAR filing download capabilities**! You can search for, download, and analyze SEC filings (10-K, 10-Q, 8-K, etc.) using natural language voice commands.

## Available Tools

### 1. **searchSecFilings** - Search for SEC Filings

Search for SEC EDGAR filings by company ticker or CIK number.

**Voice Commands:**
- "Find SEC filings for Apple"
- "Get 10-K for AAPL"
- "Show me Tesla's quarterly reports"
- "Search for Microsoft 8-K filings"
- "Find all SEC filings for CIK 0000320193"

**Parameters:**
- `ticker` (optional): Company ticker symbol (e.g., "AAPL", "TSLA")
- `cik` (optional): SEC CIK number (10-digit identifier)
- `formType` (optional): Type of form - "10-K", "10-Q", "8-K", "DEF 14A", "S-1", or "ALL" (default)
- `limit` (optional): Max results (1-20, default: 10)

**Example Response:**
```
SEC Filings for Apple Inc. (CIK: 0000320193) [AAPL]

Found 10 recent filings:

1. 10-K - Filed: 2024-10-31
   Accession: 0000320193-24-000123
   Document: https://www.sec.gov/Archives/edgar/data/320193/...

2. 10-Q - Filed: 2024-08-02
   Accession: 0000320193-24-000089
   Document: https://www.sec.gov/Archives/edgar/data/320193/...
```

---

### 2. **downloadSecFiling** - Download SEC Filing

Download an SEC filing document and save it to your documents.

**Voice Commands:**
- "Download the latest 10-K for Apple"
- "Save that SEC filing"
- "Download the document from that URL"
- "Get me the full 10-Q report"

**Parameters:**
- `documentUrl` (required): The SEC document URL from search results
- `title` (optional): Custom title for saved document
- `saveAsDocument` (optional): Whether to save as document (default: true)

**Example Response:**
```
SEC filing downloaded and saved successfully!

Title: "SEC Filing - 0000320193-24-000123.htm"
Document ID: j57abc123def456
Source: https://www.sec.gov/Archives/edgar/data/320193/...
Size: 45,678 characters

The document is ready to view and analyze.
```

---

### 3. **getCompanyInfo** - Get Company Information

Look up company details from SEC EDGAR database.

**Voice Commands:**
- "Get company info for Tesla"
- "What's the CIK for Microsoft?"
- "Show me Apple's SEC information"
- "Look up company details for ticker NVDA"

**Parameters:**
- `ticker` (optional): Company ticker symbol
- `cik` (optional): SEC CIK number

**Example Response:**
```
Company Information:

Name: Apple Inc.
CIK: 0000320193
Ticker: AAPL
SIC: 3571 - Electronic Computers
Fiscal Year End: 0930

Business Address:
One Apple Park Way
Cupertino, CA 95014

Category: Large accelerated filer
Entity Type: operating company
```

---

## Usage Examples

### Example 1: Find and Download Apple's Latest 10-K

**User:** "Find Apple's latest 10-K filing"

**Agent Response:**
1. Calls `searchSecFilings(ticker: "AAPL", formType: "10-K", limit: 5)`
2. Returns list of recent 10-K filings with URLs

**User:** "Download the first one"

**Agent Response:**
1. Calls `downloadSecFiling(documentUrl: "...", saveAsDocument: true)`
2. Saves the filing as a document
3. Returns confirmation with document ID

---

### Example 2: Research Tesla's Quarterly Reports

**User:** "Show me Tesla's last 3 quarterly reports"

**Agent Response:**
1. Calls `searchSecFilings(ticker: "TSLA", formType: "10-Q", limit: 3)`
2. Returns list of Q1, Q2, Q3 10-Q filings

**User:** "Download all of them"

**Agent Response:**
1. Calls `downloadSecFiling()` three times for each URL
2. Saves all three documents
3. Returns summary of downloaded filings

---

### Example 3: Company Research Workflow

**User:** "I want to research Microsoft. Get me their company info and latest annual report"

**Agent Response:**
1. Calls `getCompanyInfo(ticker: "MSFT")`
2. Calls `searchSecFilings(ticker: "MSFT", formType: "10-K", limit: 1)`
3. Calls `downloadSecFiling()` for the latest 10-K
4. Returns comprehensive summary with company details and downloaded report

---

### Example 4: Multi-Company Analysis

**User:** "Compare the latest 10-Ks for Apple, Microsoft, and Google"

**Agent Response:**
1. Calls `searchSecFilings()` for each company
2. Calls `downloadSecFiling()` for each latest 10-K
3. Calls `analyzeDocument()` on each downloaded filing
4. Returns comparative analysis

---

## Technical Details

### SEC EDGAR API

The tools use the official SEC EDGAR API:
- **Base URL:** `https://data.sec.gov/`
- **User-Agent:** Required (set to "NodeBench AI contact@nodebench.ai")
- **Rate Limits:** SEC recommends max 10 requests/second
- **Data Format:** JSON responses

### Supported Filing Types

- **10-K**: Annual report
- **10-Q**: Quarterly report
- **8-K**: Current report (material events)
- **DEF 14A**: Proxy statement
- **S-1**: Registration statement
- **And many more...**

### Document Size Limits

- Maximum document size: ~100KB of text
- Larger documents are automatically truncated
- HTML content is cleaned (scripts/styles removed)

---

## Integration Points

### Fast Agent Panel

The SEC tools are integrated into:
- **Agent Streaming Mode** (`convex/fastAgentPanelStreaming.ts`)
- Available in the chat interface
- Supports voice commands
- Real-time streaming responses

### Tool Registration

Tools are registered in the agent configuration:
```typescript
tools: {
  // ... other tools
  searchSecFilings,
  downloadSecFiling,
  getCompanyInfo,
}
```

---

## Best Practices

### 1. **Use Ticker Symbols**
Ticker symbols are easier than CIK numbers:
- ✅ "Find filings for AAPL"
- ❌ "Find filings for CIK 0000320193"

### 2. **Specify Form Types**
Be specific about what you want:
- ✅ "Get the latest 10-K for Tesla"
- ❌ "Get SEC filings for Tesla" (returns all types)

### 3. **Download Selectively**
Don't download everything - filings can be large:
- ✅ "Download the latest 10-K"
- ❌ "Download all filings" (could be hundreds)

### 4. **Combine with Analysis**
Use document analysis tools after downloading:
- "Download Apple's 10-K and summarize the key risks"
- "Get Tesla's latest 10-Q and analyze revenue trends"

---

## Troubleshooting

### "Failed to look up ticker"
- Verify the ticker symbol is correct
- Try using the full company name instead
- Check if the company is publicly traded

### "Failed to fetch SEC filings"
- The CIK number might be incorrect
- SEC API might be temporarily unavailable
- Check your internet connection

### "Document truncated due to size"
- SEC filings can be very large
- The tool automatically truncates to 100KB
- Consider downloading specific sections instead

---

## Future Enhancements

Potential improvements:
- [ ] XBRL data extraction (financial statements)
- [ ] Automatic financial ratio calculation
- [ ] Multi-filing comparison analysis
- [ ] Filing change detection (diff between periods)
- [ ] Exhibit download support
- [ ] PDF filing support (currently HTML/TXT only)

---

## API Reference

### File Location
`convex/tools/secFilingTools.ts`

### Dependencies
- `@convex-dev/agent` - Tool creation framework
- `zod` - Schema validation
- SEC EDGAR API - Public data source

### Error Handling
All tools include comprehensive error handling:
- Network failures
- Invalid ticker/CIK
- API rate limits
- Document size limits
- Parsing errors

---

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify SEC EDGAR API is accessible
3. Review the tool implementation in `convex/tools/secFilingTools.ts`
4. Test with known-good ticker symbols (AAPL, MSFT, TSLA)

---

## Example Conversation

```
User: "I need to research Apple's financials"

Agent: "I'll help you with that! Let me search for Apple's SEC filings."
[Calls searchSecFilings(ticker: "AAPL", formType: "10-K", limit: 5)]

Agent: "I found Apple's recent 10-K filings. The latest one was filed on 
October 31, 2024. Would you like me to download it?"

User: "Yes, download it and give me a summary"

Agent: [Calls downloadSecFiling(...)]
"I've downloaded Apple's latest 10-K filing. Let me analyze it for you..."
[Calls analyzeDocument(...)]

Agent: "Here's a summary of Apple Inc.'s 2024 10-K filing:

Key Highlights:
- Total revenue: $XXX billion
- Net income: $XXX billion
- Key risks: Supply chain, competition, regulatory
- Major products: iPhone, Mac, iPad, Services

The full document is saved in your documents for detailed review."
```

---

**Happy SEC filing research! 📊📈**

