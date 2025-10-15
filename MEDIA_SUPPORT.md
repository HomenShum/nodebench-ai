# Media Support Documentation

## Overview
This document describes the media recording, upload, and rendering capabilities added to the Fast Agent Panel.

## Features Implemented

### 1. HTML5 Media Rendering Support
**Files Modified:**
- `src/components/AIChatPanel/AIChatPanel.Messages.tsx`

**What Changed:**
- Installed and configured `rehype-raw` and `rehype-sanitize` plugins
- ReactMarkdown now supports rendering HTML5 `<video>` and `<audio>` tags
- Images continue to work with markdown syntax `![alt](url)`

**Usage:**
Messages can now include:
```markdown
![Image description](https://example.com/image.jpg)

<video controls width="400">
  <source src="https://example.com/video.mp4" type="video/mp4" />
</video>

<audio controls>
  <source src="https://example.com/audio.mp3" type="audio/mpeg" />
</audio>
```

### 2. Audio & Video Recording
**New Component:**
- `src/components/FastAgentPanel/FastAgentPanel.MediaRecorder.tsx`

**Features:**
- **Audio Recording:** Records audio from the user's microphone
- **Video Recording:** Records video from the user's webcam with audio
- Permission requests for camera/microphone access
- Real-time preview for video recording
- Visual feedback with pulse animation for audio recording
- Recording timer display
- WebM format output (widely supported)

**How to Use:**
1. Click the microphone icon (🎤) in the input bar to record audio
2. Click the video icon (🎥) in the input bar to record video
3. Click "Start Recording" to begin
4. Click "Stop & Save" to finish and attach the recording

### 3. Drag & Drop Media Upload
**File Modified:**
- `src/components/FastAgentPanel/FastAgentPanel.InputBar.tsx`

**Features:**
- Drag and drop images, audio, or video files directly into the input area
- Visual overlay when dragging files
- Automatic filtering for media files only
- Image preview thumbnails for attached files
- Icon indicators for audio/video files

**Supported File Types:**
- **Images:** JPG, PNG, GIF, WebP, SVG, etc. (any `image/*`)
- **Audio:** MP3, WAV, WebM, OGG, etc. (any `audio/*`)
- **Video:** MP4, WebM, AVI, MOV, etc. (any `video/*`)

**How to Use:**
1. Drag media files from your file system
2. Drop them onto the input area
3. Files will be attached and show preview/icon
4. Click X button to remove individual files
5. Send message with attached files

### 4. Enhanced Input Bar
**New Buttons:**
- 📎 **Attach File:** Opens file picker (filters for media files only)
- 🎤 **Record Audio:** Opens audio recording modal
- 🎥 **Record Video:** Opens video recording modal

**Updated Behavior:**
- Can send messages with files only (no text required)
- Multiple files can be attached at once
- Files persist until message is sent or manually removed
- All media controls are disabled while recording is in progress

### 5. Future-Proof Linkup Search Integration
**File Modified:**
- `convex/tools/linkupSearch.ts`

**What Changed:**
- Extended `LinkupSearchResult` interface to support `videos` and `audios`
- Added handling logic for video and audio search results
- Videos rendered with HTML5 `<video>` tag with poster support
- Audio rendered with HTML5 `<audio>` tag
- Logging updated to show video/audio counts

**Current Status:**
- ✅ Images: **Fully working** (Linkup API supports this now)
- ⏳ Videos: **Ready to use** (waiting for Linkup API support)
- ⏳ Audio: **Ready to use** (waiting for Linkup API support)

When Linkup adds video/audio search results, they will automatically display in chat without any code changes needed.

## Technical Details

### Dependencies Added
```json
{
  "rehype-raw": "^7.0.0",
  "rehype-sanitize": "^6.0.0"
}
```

### Browser APIs Used
- **MediaDevices API:** For camera/microphone access
- **MediaRecorder API:** For recording audio/video
- **Drag and Drop API:** For file uploads
- **URL.createObjectURL:** For file previews

### Security
- `rehype-sanitize` sanitizes HTML to prevent XSS attacks
- Only media file types are accepted for uploads
- Recording permissions are requested explicitly
- Media streams are properly cleaned up on component unmount

## Usage Examples

### Recording Audio Message
```typescript
// User clicks microphone button
// -> Modal opens requesting microphone permission
// -> User clicks "Start Recording"
// -> Audio recording begins with visual feedback
// -> User clicks "Stop & Save"
// -> Audio file attached to message as "audio-1234567890.webm"
```

### Drag & Drop Multiple Images
```typescript
// User drags 3 image files from desktop
// -> Overlay shows "Drop media files here"
// -> Files dropped onto input area
// -> All 3 images attached with thumbnail previews
// -> User types message (optional)
// -> Send button enabled
```

### Linkup Search with Images (Current)
```typescript
// Agent uses: linkupSearch({ query: "show me puppies", includeImages: true })
// -> Returns markdown with images:
//    ![Labrador puppies](https://example.com/image1.jpg)
//    *Cute labrador puppies playing*
// -> ReactMarkdown renders actual images in chat
```

### Linkup Search with Videos (Future)
```typescript
// Agent uses: linkupSearch({ query: "how to cook pasta", includeVideos: true })
// -> When Linkup adds video support, will return:
//    <video controls width="400">
//      <source src="https://example.com/cooking.mp4" type="video/mp4" />
//    </video>
// -> ReactMarkdown with rehype-raw will render video player
```

## Browser Compatibility

### Recording Features
- ✅ Chrome/Edge (Chromium): Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (requires HTTPS)
- ❌ IE11: Not supported (MediaRecorder API unavailable)

### Drag & Drop
- ✅ All modern browsers

### HTML5 Media Tags
- ✅ All modern browsers

## Known Limitations

1. **Recording Format:** WebM is used for cross-browser compatibility, but not all devices support all codecs
2. **File Size:** Large video files may impact performance - consider adding size limits
3. **HTTPS Required:** Recording features require HTTPS in production (except localhost)
4. **Mobile Recording:** Video recording on mobile may have different UI/permissions

## Future Enhancements

- [ ] Add file size limits and warnings
- [ ] Support for more recording formats based on browser capabilities
- [ ] Video/audio trimming before sending
- [ ] Webcam source selection (front/back camera)
- [ ] Audio/video quality settings
- [ ] Recording time limit
- [ ] Visual waveform for audio recording
- [ ] File compression before upload

## Testing

To test the new features:

1. **Test Image Rendering:**
   - Use linkupSearch with images enabled
   - Verify images display in chat messages

2. **Test Audio Recording:**
   - Click microphone button
   - Allow permissions
   - Record 5 seconds of audio
   - Verify file is attached

3. **Test Video Recording:**
   - Click video button
   - Allow camera/microphone permissions
   - Record 5 seconds of video
   - Verify preview shows and file is attached

4. **Test Drag & Drop:**
   - Drag image file onto input area
   - Verify thumbnail preview appears
   - Drag audio file
   - Verify icon appears
   - Try dragging non-media file
   - Verify it's filtered out

5. **Test File Upload:**
   - Click paperclip button
   - Select multiple media files
   - Verify all are attached
   - Remove individual files
   - Verify removal works

## Support

For issues or questions about media features, check:
- Browser console for permission errors
- Network tab for file upload issues
- Device settings for camera/microphone permissions
