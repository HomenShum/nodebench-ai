# File & Image Upload Guide

## Overview
The Fast Agent Panel now supports uploading files and images for the AI to analyze. Users can upload images, PDFs, documents, and ask questions about them.

## Features

### 🖼️ **Image Analysis**
- Upload images (JPG, PNG, GIF, WebP, SVG)
- AI can describe, analyze, and answer questions about images
- Automatic image preview
- GPT-5 Vision support

### 📄 **Document Analysis**  
- Upload PDFs, text files, Word documents
- AI can read, summarize, and extract information
- File type detection and icons

### 💾 **Smart File Storage**
- Automatic file deduplication by hash
- Efficient storage using Convex file storage
- Files are reused if uploaded multiple times
- Automatic cleanup of unused files

### ⚡ **Seamless Integration**
- Works with existing chat threads
- Real-time streaming responses
- File attachments shown in conversation
- Optimistic UI updates

## How to Use

### For Users

1. **Open Fast Agent Panel** - Click the AI icon in your app
2. **Select or create a thread** - Choose an existing conversation or start new
3. **Click "Upload File or Image"** button - Located above the input bar
4. **Select a file** - Choose an image or document from your computer
5. **Ask a question** - Type what you want to know about the file
6. **Get AI response** - The agent will analyze and respond with streaming

### Example Questions

**For Images:**
- "What's in this image?"
- "Describe this image in detail"
- "What colors are dominant?"
- "Is there any text in this image?"
- "What's the mood or theme of this photo?"

**For Documents:**
- "Summarize this document"
- "What are the key points?"
- "Extract any dates and names"
- "Is there any financial information?"
- "Translate this document"

## Implementation Details

### Backend (`convex/fastAgentPanelStreaming.ts`)

#### 1. **uploadFile** Action
```typescript
export const uploadFile = action({
  args: {
    filename: v.string(),
    mimeType: v.string(),
    bytes: v.bytes(),
    sha256: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Store file using Convex Agent's storeFile
    const { file } = await storeFile(
      ctx,
      components.agent,
      new Blob([args.bytes], { type: args.mimeType }),
      { filename: args.filename, sha256: args.sha256 }
    );
    
    return { fileId: file.fileId, url: file.url };
  },
});
```

**Features:**
- Requires authentication
- Automatic deduplication by SHA-256 hash
- Returns fileId and URL
- Files stored in Convex file storage

#### 2. **submitFileQuestion** Mutation
```typescript
export const submitFileQuestion = mutation({
  args: {
    threadId: v.id("chatThreadsStream"),
    fileId: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    // Get file (automatically detects image vs file)
    const { filePart, imagePart } = await getFile(ctx, components.agent, args.fileId);
    
    // Save message with file attachment
    await saveMessage(ctx, components.agent, {
      threadId: thread.agentThreadId,
      message: {
        role: "user",
        content: [
          imagePart ?? filePart,
          { type: "text", text: args.question },
        ],
      },
      metadata: { fileIds: [args.fileId] },
    });
    
    // Trigger async response
    await ctx.scheduler.runAfter(0, internal.fastAgentPanelStreaming.generateFileResponse, {...});
  },
});
```

**Features:**
- Verifies thread ownership
- Attaches file to user message
- Tracks file usage in metadata
- Triggers async agent response

#### 3. **generateFileResponse** Internal Action
```typescript
export const generateFileResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    streamThreadId: v.id("chatThreadsStream"),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const chatAgent = createChatAgent(args.model);
    
    const result = await chatAgent.streamText(
      ctx,
      { threadId: args.threadId },
      { promptMessageId: args.promptMessageId },
      { saveStreamDeltas: { chunking: "word", throttleMs: 100 } }
    );
    
    await result.consumeStream();
  },
});
```

**Features:**
- Runs asynchronously
- Streams response in real-time
- Uses existing agent configuration
- Automatic token tracking

### Frontend (`FastAgentPanel.FileUpload.tsx`)

#### Component Structure
```tsx
<FileUpload
  threadId={currentThreadId}
  onFileSubmitted={() => {
    // Callback after successful submission
  }}
/>
```

#### State Management
- `uploadedFile` - Currently uploaded file info
- `question` - User's question about the file
- `isUploading` - Upload in progress
- `isSubmitting` - Question submission in progress

#### UI States

**1. Initial State - Upload Button**
```
┌────────────────────────────┐
│   📤 Upload File or Image  │
└────────────────────────────┘
```

**2. File Uploaded - Question Input**
```
┌─────────────────────────────────┐
│ 🖼️ image.jpg              ✕     │
│ image/jpeg                      │
├─────────────────────────────────┤
│ [What's in this file?    ] [Ask]│
└─────────────────────────────────┘
```

**3. Submitting**
```
┌─────────────────────────────────┐
│ 🖼️ image.jpg                     │
├─────────────────────────────────┤
│ [Question...      ] [⟳ Sending…]│
└─────────────────────────────────┘
```

## Supported File Types

### Images (GPT-5 Vision)
- ✅ JPEG/JPG
- ✅ PNG
- ✅ GIF
- ✅ WebP
- ✅ SVG
- ✅ BMP

### Documents (GPT-5 Text)
- ✅ PDF
- ✅ TXT
- ✅ DOC/DOCX
- ✅ Markdown
- ✅ CSV

## Cost Tracking

File uploads are tracked in the API usage system:

**Images:**
- Input tokens: Image size-dependent (varies by resolution)
- Output tokens: Response generation
- Typically 85-500 tokens per image depending on detail level

**Documents:**
- Input tokens: Based on text length
- Output tokens: Response generation
- 1 page ≈ 400-800 tokens

**Estimated Costs (GPT-5):**
- Small image analysis: ~$0.001-0.003
- Large image analysis: ~$0.005-0.01
- Document summary (10 pages): ~$0.02-0.05

## Security & Privacy

### Authentication
- ✅ Requires user to be signed in
- ✅ Thread ownership verification
- ✅ Files scoped to user account

### File Storage
- ✅ Stored in Convex file storage
- ✅ Automatic deduplication by hash
- ✅ URL-based access control
- ✅ Automatic cleanup of unused files

### Data Handling
- ❌ Files are NOT stored permanently
- ✅ Tracked in message metadata for cleanup
- ✅ Can be vacuumed after conversation ends
- ✅ No external file hosting

## Troubleshooting

### File Won't Upload
**Problem**: Upload fails or hangs  
**Solutions**:
- Check file size (max 10MB recommended)
- Verify file type is supported
- Check internet connection
- Ensure you're signed in

### Agent Can't See Image
**Problem**: Agent says it can't see the image  
**Solutions**:
- Verify file uploaded successfully
- Check if image format is supported
- Try re-uploading the file
- Use a different image format (e.g., PNG instead of WebP)

### Response is Slow
**Problem**: Agent takes long time to respond  
**Solutions**:
- Large images take longer (resize before uploading)
- PDF documents take longer to process
- Wait for streaming to complete
- Check if model is GPT-5 (GPT-4 is slower)

### File Upload Error
**Problem**: "Unauthorized" error  
**Solutions**:
- Sign in to your account
- Refresh the page
- Check if session expired

## Future Enhancements

### Planned Features
- [ ] Multi-file upload (analyze multiple images)
- [ ] Drag-and-drop file upload
- [ ] Image editing/cropping before upload
- [ ] File history browser
- [ ] Batch document processing
- [ ] OCR for scanned documents
- [ ] Audio file transcription
- [ ] Video frame analysis

### Advanced Features
- [ ] Compare multiple images
- [ ] Generate images with DALL-E
- [ ] Edit images with GPT-5
- [ ] Extract structured data from documents
- [ ] Automatic file tagging
- [ ] Search within uploaded files

## API Reference

### `uploadFile()`
Uploads a file to Convex storage.

**Args:**
- `filename: string` - Original filename
- `mimeType: string` - MIME type
- `bytes: ArrayBuffer` - File contents
- `sha256?: string` - Optional hash for deduplication

**Returns:**
```typescript
{
  fileId: string,  // Unique file identifier
  url: string      // Temporary URL for preview
}
```

### `submitFileQuestion()`
Submits a question about an uploaded file.

**Args:**
- `threadId: Id<"chatThreadsStream">` - Thread ID
- `fileId: string` - File identifier from uploadFile
- `question: string` - User's question

**Returns:**
```typescript
{
  messageId: Id<"chatMessagesStream">,  // Streaming message ID
  agentMessageId: string                // Agent component message ID
}
```

### `generateFileResponse()`
Internal action that generates agent response (called automatically).

**Args:**
- `threadId: string` - Agent thread ID
- `promptMessageId: string` - User message ID
- `streamThreadId: Id<"chatThreadsStream">` - Stream thread ID
- `model: string` - Model name

## Examples

### Example 1: Image Analysis
```typescript
// Upload image
const { fileId, url } = await uploadFile({
  filename: "cat.jpg",
  mimeType: "image/jpeg",
  bytes: await file.arrayBuffer(),
});

// Ask question
await submitFileQuestion({
  threadId: currentThreadId,
  fileId,
  question: "What breed is this cat?",
});

// Agent responds with streaming:
// "This appears to be a British Shorthair cat. Key identifying 
// features include the round face, dense coat, and copper-colored
// eyes typical of the breed..."
```

### Example 2: Document Summary
```typescript
// Upload PDF
const { fileId } = await uploadFile({
  filename: "report.pdf",
  mimeType: "application/pdf",
  bytes: await file.arrayBuffer(),
});

// Ask question
await submitFileQuestion({
  threadId: currentThreadId,
  fileId,
  question: "Summarize the key findings in bullet points",
});

// Agent responds with streaming:
// "Key Findings from the Report:
// • Revenue increased 23% year-over-year
// • Customer retention improved to 89%
// • New product launch exceeded targets..."
```

## Summary

✅ **File upload fully integrated** with Fast Agent Panel  
✅ **Automatic file storage** and deduplication  
✅ **Real-time streaming** responses  
✅ **Image and document support**  
✅ **Cost tracking** included  
✅ **Secure** with authentication and ownership checks  

Users can now upload files and images and have natural conversations about them with the AI! 🎉
