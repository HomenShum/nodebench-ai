# YouTube Search Tool Setup

## Overview
The YouTube search tool allows users to search for and watch YouTube videos directly in the chat interface using embedded video players.

## Setup Instructions

### 1. Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**:
   - Go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy your API key

### 2. Add API Key to Convex

Add the YouTube API key to your Convex environment:

```bash
npx convex env set YOUTUBE_API_KEY your_api_key_here
```

Or add it via the Convex Dashboard:
1. Go to your Convex project dashboard
2. Click "Settings" → "Environment Variables"
3. Add `YOUTUBE_API_KEY` with your API key value

### 3. Test the Tool

Try these queries in your Fast Agent Panel:

```
find videos about cooking pasta
show me videos on machine learning
watch videos about cute cats
find tutorial videos for react
```

## Features

### Search Parameters

**Query**: What to search for
- Example: "python tutorial", "funny cats", "cooking recipes"

**Max Results**: Number of videos (1-10)
- Default: 5 videos

**Order**: How to sort results
- `relevance` (default) - Most relevant first
- `date` - Newest first
- `rating` - Highest rated first
- `viewCount` - Most viewed first

**Video Duration**: Filter by length
- `any` (default) - All durations
- `short` - Under 4 minutes
- `medium` - 4-20 minutes
- `long` - Over 20 minutes

### Display Features

✅ **Embedded Players** - Watch videos directly in chat  
✅ **Video Info** - Title, channel, description  
✅ **Direct Links** - Open in YouTube app/website  
✅ **Responsive** - Works on all screen sizes  
✅ **Full Controls** - Play, pause, volume, fullscreen  

## How Videos Display

When you search for videos, each result shows:

1. **Video Title** (as heading)
2. **Channel Name**
3. **Embedded Video Player** (560x315)
   - Full YouTube controls
   - Click to play
   - Fullscreen option
4. **Description Preview** (first 150 characters)
5. **"Watch on YouTube" link**

### Example Output

```markdown
Found 5 videos:

## Videos

### 1. How to Make Perfect Pasta

**Channel:** Chef John

[Embedded video player]

Learn the secrets to cooking perfect pasta every time...

[Watch on YouTube](https://youtube.com/watch?v=...) 🔗

---

### 2. Italian Pasta Recipe

[continues...]
```

## YouTube Embeds in Chat

The tool uses HTML5 `<iframe>` tags to embed videos:

```html
<iframe 
  width="560" 
  height="315" 
  src="https://www.youtube.com/embed/{videoId}" 
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
  allowfullscreen>
</iframe>
```

These are rendered by ReactMarkdown with `rehype-raw` plugin.

## API Quota Limits

YouTube Data API v3 has daily quota limits:
- **Free tier**: 10,000 units/day
- **Search request**: 100 units each
- **Limit**: ~100 searches per day

To check your quota:
1. Go to Google Cloud Console
2. Navigate to "APIs & Services" → "Dashboard"
3. Click on "YouTube Data API v3"
4. View quota usage

## Usage Examples

### Basic Search
```
User: "find videos about python"
Agent: Uses youtubeSearch({ query: "python" })
Result: 5 embedded Python tutorial videos
```

### Filtered Search
```
User: "show me short videos about cats"
Agent: Uses youtubeSearch({ 
  query: "cats", 
  videoDuration: "short",
  maxResults: 5 
})
Result: 5 short cat videos (<4 min each)
```

### Most Viewed
```
User: "what are the most popular cooking videos"
Agent: Uses youtubeSearch({ 
  query: "cooking", 
  order: "viewCount",
  maxResults: 10 
})
Result: 10 most-viewed cooking videos
```

## Troubleshooting

### "YOUTUBE_API_KEY environment variable is not set"
**Solution**: Add your API key to Convex environment variables (see step 2 above)

### "YouTube API error: 403"
**Solutions**:
- Check if YouTube Data API v3 is enabled in your project
- Verify your API key is correct
- Check if you've exceeded your daily quota

### "YouTube API error: 400"
**Solution**: The search query might be malformed. Try a different query.

### Videos not displaying
**Solutions**:
- Check browser console for errors
- Verify ReactMarkdown has `rehype-raw` plugin enabled
- Check if iframes are blocked by browser settings
- Try different browser (some block iframe embeds)

### Quota exceeded
**Solutions**:
- Wait for quota to reset (daily at midnight Pacific Time)
- Request quota increase in Google Cloud Console
- Cache results to reduce API calls

## Security Notes

🔒 **API Key Security**:
- Never commit API keys to git
- Use environment variables only
- Restrict API key to YouTube Data API v3
- Set HTTP referrer restrictions if deploying publicly

🔒 **Content Safety**:
- YouTube embeds respect YouTube's community guidelines
- Age-restricted content requires YouTube sign-in
- Videos can be removed/made private by uploader

## Advanced: Customizing Video Display

To change video dimensions, edit `youtubeSearch.ts`:

```typescript
// Current: 560x315 (16:9 aspect ratio)
result += `<iframe width="560" height="315" ...

// Larger: 800x450
result += `<iframe width="800" height="450" ...

// Smaller: 400x225
result += `<iframe width="400" height="225" ...
```

## Integration with Other Tools

The YouTube search tool works alongside:
- **linkupSearch** - For web images and general web search
- **searchMedia** - For local media files
- Works in same chat flow - AI automatically picks the right tool

Example multi-tool conversation:
```
User: "find images of cats and videos about cats"
Agent: 
1. Uses linkupSearch({ query: "cats", includeImages: true })
   → Shows cat images
2. Uses youtubeSearch({ query: "cats" })
   → Shows cat videos
```

## Cost Considerations

YouTube Data API is **free** with quotas:
- Free tier: 10,000 units/day
- Each search: 100 units
- ~100 searches/day free

Linkup API (for images) is **paid**:
- Check pricing at https://linkup.so/pricing
- Consider usage patterns for both APIs

## Future Enhancements

Potential improvements:
- [ ] Video thumbnails in gallery view
- [ ] Playlist search support
- [ ] Channel-specific searches
- [ ] Video duration display
- [ ] View count and rating display
- [ ] Published date display
- [ ] Transcript search integration
- [ ] Save favorite videos feature
