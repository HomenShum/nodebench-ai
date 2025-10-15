# AI Streaming Implementation with GPT-5 Support

## Overview
This document describes the implementation of true incremental streaming for the FastAgentPanel using the AI SDK pattern from the Convex AI Agents guide, with support for GPT-5 series models.

## Architecture

### Backend Components

#### 1. HTTP Streaming Route (`convex/router.ts`)
- **Endpoint**: `POST /api/chat-stream`
- **Pattern**: Uses AI SDK's `streamText()` for true incremental streaming
- **Key Features**:
  - Streams tokens as they arrive from OpenAI (no buffering)
  - Uses `@ai-sdk/openai` package instead of raw OpenAI SDK
  - Supports GPT-5 series (gpt-5, gpt-5-mini, gpt-5-nano) models
  - Proper CORS headers for cross-origin requests

```typescript
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const chatModel = openai.chat(modelName);
const result = streamText({
  model: chatModel,
  messages: conversation,
});

for await (const chunk of result.textStream) {
  fullResponse += chunk;
  await chunkAppender(chunk);
}
```

#### 2. Streaming Mutations (`convex/fastAgentPanelStreaming.ts`)
- **`sendMessageWithStreaming`**: Creates user message and AI message with streamId
- **`markStreamComplete`**: Finalizes streaming message with full content
- **`getStreamBody`**: Query for useStream hook to get stream content
- **`getMessageByStreamId`**: Query to find message by streamId

#### 3. Schema Updates (`convex/schema.ts`)
- Added `streamId` field (optional string) to chatMessages table
- Added `isStreaming` field (optional boolean) to chatMessages table
- Added index `by_streamId` for efficient lookups

### Frontend Components

#### 1. StreamingMessage Component
- Uses `useStream` hook from `@convex-dev/persistent-text-streaming/react`
- Renders Markdown with syntax highlighting (ReactMarkdown + react-syntax-highlighter)
- Shows cursor animation during streaming
- Displays streamed text in real-time

#### 2. Settings Panel
- Model selection dropdown with GPT-5 options
- Organized into optgroups:
  - **GPT-5 Series**: gpt-5, gpt-5-mini, gpt-5-nano
  - **Other**: gemini

## Supported Models

### GPT-5 Series
- **gpt-5**: Most capable GPT-5 model (default)
- **gpt-5-mini**: Balanced performance and speed
- **gpt-5-nano**: Fastest GPT-5 model

### Other
- **gemini**: Google Gemini model

## Flow Diagram

```
User sends message
    ↓
sendMessageWithStreaming mutation
    ↓
Creates user message (complete)
Creates AI message (streaming, empty content)
Generates streamId
    ↓
Frontend: useStream hook (isDriven=true)
    ↓
POST to /api/chat-stream with streamId
    ↓
Backend: generateChat callback
    ↓
Load message and conversation history
    ↓
AI SDK streamText() with openai.chat(model)
    ↓
For each chunk from OpenAI:
  - Append to fullResponse
  - Call chunkAppender(chunk)
    ↓
Frontend: useStream receives chunks
    ↓
StreamingMessage renders with ReactMarkdown
    ↓
When complete:
  - markStreamComplete mutation
  - Update message with final content
  - Set isStreaming=false, status="complete"
```

## Key Differences from Previous Implementation

### Before (Buffered Streaming)
1. Node.js action called OpenAI SDK
2. Collected all chunks in array
3. Returned array to HTTP route
4. HTTP route iterated over array
5. Result: All text appeared at once

### After (True Incremental Streaming)
1. HTTP route calls AI SDK directly
2. Streams chunks as they arrive from OpenAI
3. No buffering or intermediate storage
4. Result: Text streams character-by-character in real-time

## Dependencies

```json
{
  "ai": "^latest",
  "@ai-sdk/openai": "^latest",
  "@convex-dev/persistent-text-streaming": "^latest",
  "react-markdown": "^latest",
  "react-syntax-highlighter": "^latest"
}
```

## Environment Variables

- `OPENAI_API_KEY`: Required for OpenAI API access

## Testing

1. **Hard refresh** the browser (Ctrl/Cmd+Shift+R)
2. Open **DevTools → Network** tab
3. Send a message in FastAgentPanel
4. Verify:
   - OPTIONS request to `/api/chat-stream` returns 204 with CORS headers
   - POST request to `/api/chat-stream` stays open during streaming
   - Text appears incrementally in the UI with Markdown formatting
   - Cursor animation shows during streaming
   - Message marked complete when done

## Troubleshooting

### No text showing
- Check OPENAI_API_KEY is set in Convex environment
- Verify model name is valid (gpt-5, gpt-5-mini, gpt-5-nano)
- Check browser console for errors
- Inspect Network tab for failed requests

### CORS errors
- Verify Origin header is allowed in router.ts
- Check Access-Control-Allow-Origin header is set
- Ensure preflight OPTIONS handler is working

### Text appears all at once
- Verify using AI SDK's streamText() not OpenAI SDK
- Check chunkAppender is called for each chunk
- Ensure no buffering in generateChat callback

## Future Enhancements

1. **Temperature & Max Tokens**: Pass from Settings panel to streaming route
2. **System Prompt**: Support custom system prompts per thread
3. **Model-specific parameters**: Different settings for reasoning vs chat models
4. **Retry logic**: Automatic retry on transient failures
5. **Rate limiting**: Implement per-user rate limits
6. **Cost tracking**: Track token usage and costs per model
7. **Model fallback**: Automatic fallback to gpt-5-mini if gpt-5 unavailable

## References

- [Convex AI Agents Guide](https://stack.convex.dev/ai-agents)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Persistent Text Streaming Component](https://stack.convex.dev/build-streaming-chat-app-with-persistent-text-streaming-component)

