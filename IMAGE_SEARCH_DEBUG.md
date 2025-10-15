# Image Search Debugging Guide

## Changes Made

### 1. Enhanced Tool Description
- Updated `linkupSearch` tool description to explicitly tell the AI to use `includeImages: true` for visual content
- Made parameter descriptions more explicit (using "CRITICAL" and "IMPORTANT" keywords)

### 2. Added Detailed Logging
The tool now logs:
- ✅ Response summary (counts of sources, images, videos, audios)
- 📸 First image URL and description (if images exist)
- ⚠️ Warning if `includeImages` was true but API returned 0 images

### 3. Improved Image Display
- Images are now displayed in a dedicated "## Images" section
- Shows up to 10 images (increased from 5)
- Each image uses markdown syntax: `![description](url)`

## How to Test

1. **Try an image search query:**
   ```
   find images about cats
   ```

2. **Check the Convex logs** (in your terminal running `npm run dev`):
   - Look for `[linkupSearch]` entries
   - Check if `includeImages: true` is being passed
   - See the response summary with image counts
   - Look for warnings

3. **Expected log output for successful image search:**
   ```
   [linkupSearch] Searching for: "cats" (depth: standard, images: true)
   [linkupSearch] ✅ Response received: {
     sourcesCount: 10,
     imagesCount: 50,
     videosCount: 0,
     audiosCount: 0,
     answerLength: 450
   }
   [linkupSearch] 📸 First image URL: https://example.com/cat1.jpg
   [linkupSearch] 📸 First image description: Orange cat sitting
   ```

4. **Expected chat output:**
   ```
   Here are some cat images:
   
   ## Images
   
   ![Orange cat sitting](https://example.com/cat1.jpg)
   
   ![Gray cat playing](https://example.com/cat2.jpg)
   
   ...
   ```

## Troubleshooting

### Issue: No images displayed in chat

**Check 1: Is the agent setting includeImages correctly?**
- Look in console for: `images: true` or `images: false`
- If `false`, the AI didn't understand the request
- Solution: Use more explicit language like "show me images of X" or "I want to see pictures of X"

**Check 2: Is the API returning images?**
- Look for: `imagesCount: 0` in the response
- If 0, either:
  - Linkup API doesn't support images for this query
  - Your API key doesn't have image access
  - The query type doesn't support images

**Check 3: Are images being formatted correctly?**
- Check if you see `## Images` in the tool output
- Verify URLs are valid (start with `https://`)
- Make sure ReactMarkdown is configured with `rehype-raw`

### Issue: Images show as broken links

**Possible causes:**
1. Image URLs are expired or invalid
2. CORS issues (images blocked by browser)
3. ReactMarkdown not configured correctly

**Fix:**
- Verify `AIChatPanel.Messages.tsx` has:
  ```tsx
  import rehypeRaw from 'rehype-raw';
  import rehypeSanitize from 'rehype-sanitize';
  
  <ReactMarkdown 
    rehypePlugins={[rehypeRaw, rehypeSanitize]}
  >
    {message.content}
  </ReactMarkdown>
  ```

### Issue: Text descriptions instead of images

This means the Linkup API is returning descriptions in the `answer` field but not populating the `images` array. This could be:

1. **API behavior:** Linkup might format image results as text when they can't provide direct URLs
2. **Query type:** Some queries return image references instead of actual images
3. **Plan limitation:** Your Linkup plan might not include image URLs

**Current behavior observed:**
```
- Labrador puppies over the fence (#1)
- Woman playing with puppies (#2)
```

This is coming from `data.answer`, not `data.images[]`.

**To fix:**
- Check Linkup documentation for your plan's image support
- Try different query formats
- Contact Linkup support about image URL access

## Current Status

✅ ReactMarkdown configured for HTML5 media
✅ Tool description updated for better AI understanding  
✅ Detailed logging added
✅ Image display code ready
⏳ Waiting to test if Linkup API returns actual image URLs

## Next Steps

1. Test with the new tool description
2. Check console logs to see what Linkup returns
3. If `imagesCount: 0`, investigate Linkup API plan/settings
4. If images exist but don't display, check ReactMarkdown configuration
