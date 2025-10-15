# Linkup Search Tool Integration

## Overview

Successfully integrated Linkup's AI-optimized search API as a tool for the Convex Agent component. The AI can now search the web for current information and provide grounded, factual responses with sources.

## What Was Implemented

### 1. Scrolling Fix ✅

**Problem:** Messages weren't scrolling in streaming mode.

**Solution:**
- Updated `UIMessageStream.tsx` to use proper Tailwind flex utilities
- Added `flex-1 overflow-y-auto p-6` classes for proper scrolling
- Removed old CSS class dependencies
- Maintained auto-scroll behavior with `useEffect` and `scrollIntoView`

**Files Changed:**
- `src/components/FastAgentPanel/FastAgentPanel.UIMessageStream.tsx`

### 2. Linkup Search Tool ✅

**Implementation:**
- Created `convex/tools/linkupSearch.ts` following Convex Agent documentation patterns
- Used `createTool` function from `@convex-dev/agent`
- Integrated Linkup API (https://api.linkup.so/v1/search)
- Added tool to `FastChatAgent` configuration

**Features:**
- **Web Search**: Search for current information using natural language queries
- **Search Depth**: Choose between `standard` (faster) or `deep` (more comprehensive)
- **Image Search**: Include images in search results with `includeImages: true`
- **Domain Filtering**: Optional include/exclude domain lists
- **Source Citations**: Returns answer with up to 5 sources (name, URL, snippet)
- **Image Display**: Images are automatically extracted and displayed in a grid
- **Error Handling**: Proper error messages and logging
- **Type Safety**: Full TypeScript support with Zod validation

**Files Created:**
- `convex/tools/linkupSearch.ts`

**Files Modified:**
- `convex/fastAgentPanelStreaming.ts` (added tool import and configuration)

## How It Works

### Tool Definition

```typescript
export const linkupSearch = createTool({
  description: "Search the web for current information...",
  args: z.object({
    query: z.string().describe("The natural language search query"),
    depth: z.enum(["standard", "deep"]).default("standard"),
    includeImages: z.boolean().default(false).describe("Include images in results"),
    includeDomains: z.array(z.string()).optional(),
    excludeDomains: z.array(z.string()).optional(),
  }),
  handler: async (_ctx, args): Promise<string> => {
    // Calls Linkup API and returns formatted results with images
  },
});
```

### Agent Configuration

```typescript
const createChatAgent = (model: string) => new Agent(components.agent, {
  name: "FastChatAgent",
  languageModel: openai.chat(model),
  instructions: "...use the linkupSearch tool to search the web.",
  tools: {
    linkupSearch,
  },
});
```

### Tool Call Flow

1. **User asks a question** requiring current information
2. **AI decides to use linkupSearch** tool
3. **Tool call appears** in UIMessageBubble with wrench icon
4. **Linkup API is called** with the query
5. **Results are returned** with answer and sources
6. **AI incorporates** the information into its response

## Setup Instructions

### 1. Get Linkup API Key

1. Go to https://app.linkup.so
2. Create a free account
3. Copy your API key

### 2. Add to Convex Environment

```bash
# Using Convex CLI
npx convex env set LINKUP_API_KEY your_api_key_here

# Or via Convex Dashboard
# Go to Settings → Environment Variables
# Add: LINKUP_API_KEY = your_api_key_here
```

### 3. Test the Integration

1. Start your dev server: `npm run dev`
2. Switch to "Streaming" mode in FastAgentPanel
3. Ask a question requiring current information:
   - "What is Microsoft's 2024 revenue?"
   - "What are the latest developments in AI?"
   - "Search for recent news about Convex"
   - **With images**: "Search for images of the latest iPhone models"
   - **With images**: "Find pictures of the Eiffel Tower with includeImages set to true"

4. Watch for:
   - Tool call appearing with wrench icon
   - Search results being incorporated
   - Sources listed in the response
   - **Images displayed in a 2-column grid** (when includeImages is true)

## API Reference

### Linkup Search Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Natural language search query |
| `depth` | "standard" \| "deep" | "standard" | Search depth (standard is faster) |
| `includeImages` | boolean | false | Whether to include images in results |
| `includeDomains` | string[] | optional | Domains to search within |
| `excludeDomains` | string[] | optional | Domains to exclude |

### Response Format

**Without Images:**
```
{answer}

Sources:
1. {source name}
   {source url}
   {snippet preview}...

2. {source name}
   {source url}
   {snippet preview}...
```

**With Images:**
```
{answer}

Images:
1. https://example.com/image1.jpg
   {image description}

2. https://example.com/image2.jpg
   {image description}

Sources:
1. {source name}
   {source url}
   {snippet preview}...
```

## UI Display

Tool calls are automatically displayed in `UIMessageBubble`:

- **Wrench icon** (🔧) indicates a tool call
- **Tool name** shown (e.g., "linkupSearch")
- **Tool output** displayed in formatted box
- **Blue background** for tool call sections
- **Images displayed in 2-column grid** when present
- **Automatic image extraction** from tool output URLs
- **Lazy loading** for better performance
- **Error handling** for failed image loads

## Benefits

1. **Current Information**: AI can access up-to-date facts and news
2. **Grounded Responses**: Answers backed by real sources
3. **Transparency**: Users see which sources were used
4. **Flexibility**: Can filter by domain or adjust search depth
5. **Seamless Integration**: Works automatically with streaming

## Linkup vs Other Search APIs

**Why Linkup?**
- Optimized specifically for LLMs and AI agents
- Fast, accurate results with proper context
- Better than Tavily, Exa, or Brave for AI use cases
- Clean API with good documentation
- Affordable pricing

## Next Steps

### Additional Tools to Consider

1. **Database Search Tool**
   ```typescript
   export const searchDatabase = createTool({
     description: "Search the application database",
     args: z.object({ query: z.string() }),
     handler: async (ctx, args) => {
       return await ctx.runQuery(api.search.query, args);
     },
   });
   ```

2. **Image Generation Tool**
   ```typescript
   export const generateImage = createTool({
     description: "Generate an image using DALL-E",
     args: z.object({ prompt: z.string() }),
     handler: async (ctx, args) => {
       // Call DALL-E API
     },
   });
   ```

3. **Code Execution Tool**
   ```typescript
   export const executeCode = createTool({
     description: "Execute Python code safely",
     args: z.object({ code: z.string() }),
     handler: async (ctx, args) => {
       // Use E2B or similar sandbox
     },
   });
   ```

## Troubleshooting

### Tool Not Being Called

**Check:**
1. Is `LINKUP_API_KEY` set in Convex environment?
2. Are you in "Streaming" mode?
3. Is the query specific enough to trigger search?

**Solution:**
- Be explicit: "Search the web for..."
- Check Convex logs for tool call attempts

### API Errors

**Common Issues:**
- Invalid API key → Check environment variable
- Rate limiting → Upgrade Linkup plan
- Network errors → Check Convex logs

### Tool Output Not Showing

**Check:**
1. Is `UIMessageBubble` rendering tool parts?
2. Check browser console for errors
3. Verify tool output is being returned

## Documentation References

- **Convex Agent Tools**: https://docs.convex.dev/agents/tools
- **Linkup API**: https://docs.linkup.so/pages/documentation/api-reference
- **Linkup Concepts**: https://docs.linkup.so/pages/documentation/get-started/concepts

## Summary

✅ **Scrolling fixed** - Messages now scroll properly in streaming mode
✅ **Linkup integrated** - AI can search the web for current information
✅ **Image search enabled** - AI can search for and display images
✅ **Tool calls displayed** - Proper UI for tool invocations and results
✅ **Smart image rendering** - Images automatically extracted and displayed in grid
✅ **Documentation complete** - Full setup and usage instructions

The AI assistant now has access to the internet through Linkup's search API, enabling it to provide current, factual information with proper source citations and visual content!

