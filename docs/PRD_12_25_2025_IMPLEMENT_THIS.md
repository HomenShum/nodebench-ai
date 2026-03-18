Product Requirements Document (PRD)
Comprehensive Home Page Enhancement Suite
Project: Nodebench AI - Complete Home Page Transformation
Status: Planning
Priority: P0 (Critical User Experience Overhaul)
Timeline: 8-12 weeks (phased rollout)
Owner: Engineering Team

Executive Summary
Transform Nodebench AI's home page from a static information hub into an intelligent, adaptive, and highly interactive workspace that anticipates user needs, surfaces critical insights, and streamlines productivity workflows through AI-powered personalization and modern UX patterns.

Success Metrics:

40% increase in daily active users
60% reduction in time-to-task completion
50% increase in feature discovery
90% user satisfaction score on home page experience
Table of Contents
User Journeys & Personas
UI/UX Audit Findings
Phase 1: Foundation & Core Infrastructure
Phase 2: Intelligent Features
Phase 3: Advanced Interactions
Phase 4: Polish & Optimization
Technical Architecture
Implementation Guide
Testing Strategy
Rollout Plan
<a name="user-journeys"></a>

User Journeys & Personas
Purpose: Ensure the home page, Research Hub, Strategic Workspace, and Agentic Systems support the 10 priority personas with clear, outcome-driven flows.

1. Techie
Core objective: Track emergent tech and coding patterns
Journey:
Starts in Research Hub scanning Signal Highlights for new repos (e.g., TurboDiffusion)
Uses Fast Agent (Claude Haiku 4.5) to generate docs or explain code snippets from File Explorer
Tracks system performance via Live Telemetry core activity graphs

2. Banker
Core objective: Market intelligence and reporting
Journey:
Reviews Today's Intelligence Brief for market-moving news (e.g., Nvidia/Groq licensing)
Uploads annual reports to Documents Hub and uses Analyst Agent to extract key ratios
Monitors Global Sentiment graphs for macro-trend shifts

3. VC Person
Core objective: Deal sourcing and thesis building
Journey:
Deploys Sourcing Agent in Agents Hub to identify high-potential startups
Uses Tag Radar to visualize trending investment themes
Tracks portfolio catalysts and board meetings in the Workspace Calendar

4. Founder
Core objective: Product execution and sales
Journey:
Starts on Dashboard (Home) checking Active Tasks and system status
Uses Roadmap in Strategic Workspace to align product milestones
Uses Sourcing Agent to generate lead lists for potential enterprise customers

5. Academic
Core objective: Literature review and synthesis
Journey:
Uses Research Agent to aggregate papers from ArXiv and other sources
Relies on Executive Synthesis to summarize multiple papers into a cohesive abstract
Organizes references and citations in Documents Hub

6. Executive
Core objective: High-level strategy and pulse check
Journey:
Logs in to view Executive Synthesis for a 30-second read on company health and market position
Checks Capability vs. Reliability Index to ensure AI operations are stable
Uses Fast Agent to dictate quick strategic memos or emails

7. Partner
Core objective: Relationship management
Journey:
Manages deal flow by coordinating Institutional Agents
Uses Briefings tool to prepare for partner meetings by reviewing Signal Highlights
Tracks key networking dates in Weekly Outlook

8. Data Analyst
Core objective: Data validation and insight
Journey:
Deep dives into metadata via Tag Radar and Source Mix visualizations
Uses Analyst Agent to process uploaded CSVs and generate insights
Inspects Temporal Drift metrics to detect data anomalies over time

9. Product Designer
Core objective: Trend spotting and specs
Journey:
Browses Signal Highlights for new UX patterns (e.g., Paper2Slides)
Organizes design specifications and mood boards in Strategic Workspace
Uses Fast Agent to brainstorm copy variations for new UI elements

10. Sales Engineer
Core objective: Technical demos and competitive intel
Journey:
Reviews Briefings for competitor vulnerabilities (e.g., CVEs) to address in pitches
Uses Fast Agent to troubleshoot technical questions during live demos
Archives successful POC configurations in My Workspace

<a name="ui-ux-audit"></a>

UI/UX Audit Findings (Local instance on 12/26)
Problems and Bugs
Data Latency: Today's Intelligence Brief displays Dec 25 while system time is Dec 26
Conflicting State: Executive Synthesis claims 0 topics tracked yet Tag Radar shows trending hashtags
Incorrect Branding: Browser tab title reads Chef instead of NodeBench AI
Navigation Ambiguity: Clicking Research and Live Dossiers in the sidebar does not update the main view until Enter Archive is clicked on the Dashboard
Broken List View: Sources for Today claims 40 sources but only about 13 are visible and there is no View All or scroll

Duplicate Content
Executive Synthesis label appears twice (main section header and sub-header within Research Hub)

Non-Useful or Unclear Visuals
Temporal Context dots have no labels or interaction, unclear if they are filters or decoration
Metrics without units or context:
- Avg Heat: 2771
- Gap Width: 20 pts
- Reasoning: 0.8636...
Dashboard Enter Archive button is buried at the bottom of the dashboard, making the primary feature (Research Hub) hard to access
<a name="phase-1"></a>

Phase 1: Foundation & Core Infrastructure (Weeks 1-3)
1.1 User Personalization System ✅ COMPLETED
Status: Implemented
Files Created:

convex/domains/auth/userStats.ts - Backend statistics aggregation
Updated CinematicHome.tsx - Personalized welcome & stats
Features:

✅ User activity statistics (documents, tasks, streaks)
✅ Time-based greeting messages
✅ Productivity insights notifications
✅ Personalized metrics dashboard
Data Schema:

// No schema changes - uses existing documents & tasks tables
// Computed on-demand via Convex queries

1.2 Command Palette (Cmd/Ctrl+K) 🔄 IN PROGRESS
Priority: P0
Effort: 2 weeks
Dependencies: None

Objective: Universal search and navigation interface accessible from anywhere in the application.

User Stories:

As a power user, I want to quickly navigate between views without using mouse
As a new user, I want to discover available commands through search
As any user, I want to access recent documents/tasks instantly
Technical Spec:

Files to Create:

src/
├── components/
│   ├── CommandPalette.tsx ✅ CREATED
│   └── CommandPaletteProvider.tsx (NEW - global state)
├── hooks/
│   └── useCommandPalette.ts (NEW - keyboard shortcut handler)
└── types/
    └── commands.ts (NEW - command action types)

Implementation Details:

// src/hooks/useCommandPalette.ts
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return { isOpen, setIsOpen };
}

Integration Points:

MainLayout.tsx - Add global keyboard listener
All view components - Register custom commands
Fast Agent Panel - Quick AI actions
Settings Modal - Settings search
Features:

Fuzzy Search - Fuse.js integration for intelligent matching
Recent Items - Last 10 docs/tasks/views accessed
Command Sections:
Navigation (Go to X)
Create New (Document, Task, Event)
AI Actions (Summarize, Generate, Analyze)
Search Results (Documents, Tasks, Content)
Settings
Keyboard Navigation - Arrow keys, Enter, Escape
Command Shortcuts - Display keyboard shortcuts next to commands
History - Remember frequently used commands
Acceptance Criteria:

 Cmd/Ctrl+K opens palette from any view
 Search returns results within 100ms
 Arrow keys navigate, Enter executes
 Recent items appear when search is empty
 Supports custom commands per view
 Mobile-friendly (swipe up gesture)
1.3 Theme Customization System
Priority: P1
Effort: 1.5 weeks
Dependencies: None

Objective: Allow users to customize appearance (colors, density, fonts) with persistence across sessions.

Technical Spec:

Database Schema:

// convex/schema.ts - Add to userPreferences table
{
  theme: {
    mode: 'light' | 'dark' | 'auto',
    accentColor: string,        // hex color
    density: 'compact' | 'comfortable' | 'spacious',
    fontFamily: 'serif' | 'sans' | 'mono',
    backgroundPattern: 'none' | 'dots' | 'grid' | 'gradient'
  }
}

Files to Create:

src/
├── contexts/
│   └── ThemeContext.tsx (NEW)
├── hooks/
│   ├── useTheme.ts (NEW)
│   └── useThemePresets.ts (NEW)
├── components/
│   ├── ThemeCustomizer.tsx (NEW - settings UI)
│   └── ThemePreview.tsx (NEW - live preview)
└── styles/
    ├── themes.ts (NEW - theme definitions)
    └── cssVariables.ts (NEW - CSS custom properties)

Color Palette System:

const themes = {
  light: {
    primary: '#10b981',      // emerald-500
    background: '#faf9f6',   // warm white
    surface: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280'
  },
  dark: {
    primary: '#34d399',      // emerald-400
    background: '#0f172a',   // slate-900
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8'
  },
  // Custom themes with accent color variations
};

Implementation:

// ThemeContext.tsx
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>();
  const userPrefs = useQuery(api.domains.auth.userPreferences.getUserPreferences);
  
  useEffect(() => {
    if (userPrefs?.theme) {
      applyTheme(userPrefs.theme);
    }
  }, [userPrefs]);
  
  const applyTheme = (config: ThemeConfig) => {
    // Set CSS custom properties
    document.documentElement.style.setProperty('--color-primary', config.primary);
    document.documentElement.style.setProperty('--density-scale', densityScale[config.density]);
    // ... apply all theme properties
  };
};

Features:

Theme Modes: Light, Dark, Auto (system preference)
Accent Colors: 12 preset colors + custom picker
Density Levels:
Compact: 80% spacing
Comfortable: 100% spacing (default)
Spacious: 120% spacing
Font Families:
Serif (elegant, default for headings)
Sans-serif (clean, modern)
Monospace (code-focused)
Background Patterns: Subtle textures for visual interest
Live Preview: See changes before applying
Theme Presets: "Minimal Dark", "Vibrant Light", "Focus Mode"
Acceptance Criteria:

 Theme persists across sessions
 Switch between light/dark instantly
 Custom accent colors apply to all UI elements
 Density changes affect spacing globally
 Font changes apply to all text
 Export/import theme configs
1.4 Accessibility Foundation
Priority: P0 (Legal compliance)
Effort: 2 weeks
Dependencies: None

Objective: Ensure WCAG 2.1 AA compliance for all new features.

Technical Spec:

Files to Create:

src/
├── utils/
│   └── a11y.ts (NEW - accessibility helpers)
├── hooks/
│   ├── useKeyboardNavigation.ts (NEW)
│   ├── useFocusTrap.ts (NEW)
│   └── useAriaAnnouncements.ts (NEW)
└── components/
    ├── SkipLinks.tsx (NEW)
    └── LiveRegion.tsx (NEW - screen reader announcements)

Implementation Details:

// useKeyboardNavigation.ts
export function useKeyboardNavigation(config: {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowDown?: () => void;
  onArrowUp?: () => void;
  onTab?: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          config.onEnter?.();
          break;
        case 'Escape':
          config.onEscape?.();
          break;
        // ... handle all keys
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [config]);
}

Checklist:

 Keyboard Navigation:
Tab through all interactive elements
Visible focus indicators (2px outline)
Focus trap in modals
Logical tab order
Escape closes modals
 Screen Readers:
ARIA labels on all buttons/inputs
ARIA live regions for dynamic content
Semantic HTML (nav, main, article, aside)
Alt text on all images
Hidden text for icon-only buttons
 Color Contrast:
Minimum 4.5:1 for normal text
Minimum 3:1 for large text
Minimum 3:1 for UI components
Color-blind safe palettes
 Motion:
Respect prefers-reduced-motion
Disable animations when requested
No auto-playing videos
 Forms:
Labels associated with inputs
Error messages linked via aria-describedby
Required fields marked
Validation feedback announced
Testing Tools:

axe DevTools
NVDA/JAWS screen readers
Keyboard-only navigation test
Color contrast analyzer
<a name="phase-2"></a>

Phase 2: Intelligent Features (Weeks 4-6)
2.1 Quick Capture Widget
Priority: P0
Effort: 2 weeks
Dependencies: Phase 1.2 (Command Palette)

Objective: Capture thoughts, tasks, and ideas instantly without disrupting flow.

Technical Spec:

Database Schema:

// convex/schema.ts
{
  quickCaptures: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("note"),
      v.literal("task"),
      v.literal("voice"),
      v.literal("screenshot")
    ),
    content: v.string(),
    audioUrl: v.optional(v.string()),      // For voice memos
    screenshotUrl: v.optional(v.string()), // For screenshots
    annotations: v.optional(v.any()),      // Screenshot annotations
    transcription: v.optional(v.string()), // Voice memo transcription
    processed: v.boolean(),                // Has AI processed it?
    linkedDocumentId: v.optional(v.id("documents")),
    createdAt: v.number(),
    metadata: v.optional(v.any())
  })
}

Files to Create:

src/
├── components/
│   ├── QuickCapture/
│   │   ├── QuickCaptureWidget.tsx (NEW - main component)
│   │   ├── VoiceMemoRecorder.tsx (NEW - audio recording)
│   │   ├── ScreenshotCapture.tsx (NEW - screen capture)
│   │   ├── ClipboardMonitor.tsx (NEW - clipboard watching)
│   │   └── QuickNoteEditor.tsx (NEW - text input)
├── hooks/
│   ├── useVoiceRecording.ts (NEW)
│   ├── useScreenCapture.ts (NEW)
│   └── useClipboardMonitor.ts (NEW)
└── utils/
    ├── audioProcessing.ts (NEW - Web Audio API)
    ├── screenshotUtils.ts (NEW - Screen Capture API)
    └── aiTranscription.ts (NEW - Whisper API integration)

Features:

2.1.1 Sticky Note (Text Capture)
Floating widget always accessible (bottom-right corner)
Markdown support
Auto-save drafts
Quick formatting toolbar
Tag suggestions based on content
// QuickNoteEditor.tsx
export function QuickNoteEditor() {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const saveNote = useMutation(api.domains.quickCapture.saveNote);
  
  const handleSave = async () => {
    await saveNote({
      content,
      tags,
      type: 'note'
    });
    toast.success('Note saved!');
    setContent('');
  };
  
  return (
    <div className="quick-note-editor">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Capture a thought..."
      />
      <TagSuggestions onSelect={(tag) => setTags([...tags, tag])} />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}

2.1.2 Voice Memo
One-click recording (hotkey: Ctrl+Shift+V)
Real-time waveform visualization
Auto-transcription via OpenAI Whisper
AI-powered title generation
Convert to task/document
// useVoiceRecording.ts
export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setAudioBlob(blob);
    };
    
    mediaRecorder.start();
    setIsRecording(true);
    mediaRecorderRef.current = mediaRecorder;
  };
  
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };
  
  return { isRecording, audioBlob, startRecording, stopRecording };
}

Backend Processing:

// convex/domains/quickCapture/voiceMemos.ts
export const transcribeVoiceMemo = internalAction({
  args: { captureId: v.id("quickCaptures") },
  handler: async (ctx, { captureId }) => {
    const capture = await ctx.runQuery(/* get capture */);
    
    // Download audio from storage
    const audioBuffer = await downloadAudio(capture.audioUrl);
    
    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: "whisper-1",
      language: "en"
    });
    
    // Generate title with GPT
    const titleResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Generate a concise title (5 words max) for this voice memo."
      }, {
        role: "user",
        content: transcription.text
      }]
    });
    
    // Update capture
    await ctx.runMutation(/* update capture */, {
      id: captureId,
      transcription: transcription.text,
      title: titleResponse.choices[0].message.content,
      processed: true
    });
  }
});

2.1.3 Screenshot Annotator
Capture full screen, window, or selection
Drawing tools (arrow, rectangle, text, highlight)
Blur sensitive information
Save to documents or clipboard
OCR text extraction
// useScreenCapture.ts
export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  
  const captureScreen = async () => {
    try {
      // Request screen capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' }
      });
      
      // Capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      stream.getTracks().forEach(track => track.stop());
      
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Screen capture failed:', err);
      return null;
    }
  };
  
  return { isCapturing, captureScreen };
}

Annotation UI:

// ScreenshotCapture.tsx
export function ScreenshotCapture({ imageData }: { imageData: string }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [tool, setTool] = useState<'arrow' | 'rectangle' | 'text' | 'blur'>('arrow');
  
  return (
    <div className="screenshot-annotator">
      <Toolbar>
        <button onClick={() => setTool('arrow')}>Arrow</button>
        <button onClick={() => setTool('rectangle')}>Rectangle</button>
        <button onClick={() => setTool('text')}>Text</button>
        <button onClick={() => setTool('blur')}>Blur</button>
      </Toolbar>
      
      <Canvas
        image={imageData}
        annotations={annotations}
        onAnnotate={(annotation) => setAnnotations([...annotations, annotation])}
        tool={tool}
      />
      
      <button onClick={saveScreenshot}>Save</button>
    </div>
  );
}

2.1.4 Clipboard Monitor
Watch clipboard for copied text
Suggest creating note/task
Auto-link URLs
Extract structured data (emails, phone numbers, dates)
// useClipboardMonitor.ts
export function useClipboardMonitor() {
  const [clipboardContent, setClipboardContent] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  
  useEffect(() => {
    let lastContent = '';
    
    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        
        if (text !== lastContent && text.length > 10) {
          lastContent = text;
          setClipboardContent(text);
          setShowSuggestion(true);
          
          // Auto-hide after 10 seconds
          setTimeout(() => setShowSuggestion(false), 10000);
        }
      } catch (err) {
        // Clipboard access denied
      }
    };
    
    // Check every 2 seconds
    const interval = setInterval(checkClipboard, 2000);
    return () => clearInterval(interval);
  }, []);
  
  return { clipboardContent, showSuggestion, dismissSuggestion: () => setShowSuggestion(false) };
}

Acceptance Criteria:

 Quick capture widget accessible from all views
 Voice recording works in Chrome, Safari, Firefox
 Transcription accuracy >90% for clear audio
 Screenshot annotations save and export
 Clipboard monitoring suggests note creation
 All captures searchable via Command Palette
 Mobile-friendly alternative (simplified capture)
2.2 Smart Recommendations Engine
Priority: P1
Effort: 2.5 weeks
Dependencies: Phase 1.1 (User Stats)

Objective: AI-powered suggestions based on user behavior patterns, time of day, and content analysis.

Technical Spec:

Database Schema:

// convex/schema.ts
{
  userBehaviorEvents: defineTable({
    userId: v.id("users"),
    eventType: v.union(
      v.literal("document_created"),
      v.literal("document_viewed"),
      v.literal("task_completed"),
      v.literal("agent_interaction"),
      v.literal("search_performed")
    ),
    entityId: v.optional(v.string()),
    metadata: v.any(),
    timestamp: v.number(),
    timeOfDay: v.string(),         // "morning" | "afternoon" | "evening"
    dayOfWeek: v.string(),          // "monday" | "tuesday" ...
  }).index("by_user_time", ["userId", "timestamp"]),
  
  recommendations: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("pattern"),          // "You usually create notes after meetings"
      v.literal("idle_content"),     // "Document X hasn't been updated"
      v.literal("collaboration"),    // "3 people viewed this doc"
      v.literal("external_trigger"), // "New article about [topic]"
      v.literal("smart_suggestion")  // AI-generated recommendation
    ),
    priority: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    message: v.string(),
    actionLabel: v.string(),
    actionData: v.any(),
    icon: v.string(),
    dismissed: v.boolean(),
    createdAt: v.number(),
    expiresAt: v.number()
  }).index("by_user_active", ["userId", "dismissed", "expiresAt"])
}

Files to Create:

convex/
├── domains/
│   └── recommendations/
│       ├── patternRecognition.ts (NEW - behavior analysis)
│       ├── contentAnalysis.ts (NEW - document similarity)
│       ├── collaborationTracking.ts (NEW - team activity)
│       └── recommendationEngine.ts (NEW - main engine)

src/
├── components/
│   ├── RecommendationPanel.tsx (NEW - sidebar widget)
│   ├── RecommendationCard.tsx (NEW - individual recommendation)
│   └── RecommendationToast.tsx (NEW - notification)
└── hooks/
    └── useRecommendations.ts (NEW - fetch & manage)

Pattern Recognition Algorithm:

// convex/domains/recommendations/patternRecognition.ts
export const analyzeUserPatterns = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Get last 30 days of events
    const events = await ctx.db
      .query("userBehaviorEvents")
      .withIndex("by_user_time", (q) =>
        q.eq("userId", userId)
          .gte("timestamp", Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
      .collect();
    
    // Pattern 1: Post-meeting note creation
    const meetingFollowUps = events.filter((e, i) => {
      if (e.eventType !== "document_created") return false;
      
      // Check if there was a calendar event in the last 30 minutes
      const recentEvents = events.slice(Math.max(0, i - 10), i);
      return recentEvents.some(prev => 
        prev.eventType === "calendar_event_ended" &&
        e.timestamp - prev.timestamp < 30 * 60 * 1000
      );
    });
    
    if (meetingFollowUps.length >= 3) {
      return {
        pattern: "post_meeting_notes",
        confidence: 0.8,
        suggestion: "You typically create notes after meetings. Create one now?"
      };
    }
    
    // Pattern 2: Morning review ritual
    const morningReviews = events.filter(e =>
      e.eventType === "document_viewed" &&
      e.timeOfDay === "morning" &&
      e.metadata?.viewDuration > 60000 // More than 1 minute
    );
    
    if (morningReviews.length >= 5) {
      return {
        pattern: "morning_review",
        confidence: 0.9,
        suggestion: "Start your morning review with yesterday's highlights?"
      };
    }
    
    // Pattern 3: Weekly planning on Sundays
    const sundayPlanning = events.filter(e =>
      e.dayOfWeek === "sunday" &&
      e.eventType === "task_created" &&
      e.timeOfDay === "evening"
    );
    
    if (sundayPlanning.length >= 2) {
      return {
        pattern: "sunday_planning",
        confidence: 0.85,
        suggestion: "Time for your weekly planning session?"
      };
    }
    
    return null;
  }
});

Recommendation Types:

2.2.1 Pattern-Based Recommendations
const patternRecommendations = [
  {
    trigger: "After completing 3+ tasks",
    message: "Great progress! You've completed 5 tasks today.",
    action: "Review completed items",
    priority: "low"
  },
  {
    trigger: "Every Monday 9am",
    message: "Start your week by reviewing open tasks",
    action: "Open task board",
    priority: "medium"
  },
  {
    trigger: "After viewing document >3 times in a day",
    message: "You've visited this document 4 times. Ready to finalize?",
    action: "Mark as complete",
    priority: "medium"
  }
];

2.2.2 Idle Content Alerts
// convex/domains/recommendations/contentAnalysis.ts
export const detectStaleContent = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    
    const staleDocs = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) =>
        q.and(
          q.lt(q.field("_creationTime"), twoWeeksAgo),
          q.or(
            q.eq(q.field("updatedAt"), undefined),
            q.lt(q.field("updatedAt"), twoWeeksAgo)
          )
        )
      )
      .collect();
    
    return staleDocs.map(doc => ({
      type: "idle_content",
      message: `"${doc.title}" hasn't been updated in 2 weeks`,
      action: "Review document",
      actionData: { documentId: doc._id },
      priority: "low"
    }));
  }
});

2.2.3 Collaboration Signals
// Track document views from other users
export const detectCollaborationActivity = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const userDocs = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const doc of userDocs) {
      // Check view events from other users
      const recentViews = await ctx.db
        .query("userBehaviorEvents")
        .filter((q) =>
          q.and(
            q.eq(q.field("eventType"), "document_viewed"),
            q.eq(q.field("entityId"), doc._id),
            q.neq(q.field("userId"), userId),
            q.gte(q.field("timestamp"), last24Hours)
          )
        )
        .collect();
      
      if (recentViews.length >= 3) {
        return {
          type: "collaboration",
          message: `${recentViews.length} people viewed "${doc.title}" today`,
          action: "View activity",
          priority: "medium"
        };
      }
    }
    
    return null;
  }
});

2.2.4 AI-Powered Smart Suggestions
// Use OpenAI to generate contextual suggestions
export const generateSmartSuggestions = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Get user's recent activity summary
    const recentDocs = await ctx.runQuery(/* get recent docs */);
    const recentTasks = await ctx.runQuery(/* get recent tasks */);
    const patterns = await ctx.runQuery(/* get behavior patterns */);
    
    const prompt = `
Based on this user's activity, suggest 3 productive actions:

Recent Documents:
${recentDocs.map(d => `- ${d.title}`).join('\n')}

Recent Tasks:
${recentTasks.map(t => `- ${t.title} (${t.status})`).join('\n')}

Patterns:
${patterns.map(p => p.description).join('\n')}

Generate 3 specific, actionable suggestions in JSON format:
[{
  "message": "suggestion text",
  "action": "action label",
  "reasoning": "why this suggestion"
}]
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
});

UI Component:

// src/components/RecommendationPanel.tsx
export function RecommendationPanel() {
  const recommendations = useQuery(api.domains.recommendations.getRecommendations);
  const dismissRecommendation = useMutation(api.domains.recommendations.dismiss);
  
  if (!recommendations || recommendations.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-96 space-y-2 z-50">
      <AnimatePresence>
        {recommendations.slice(0, 3).map((rec) => (
          <motion.div
            key={rec._id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`
              p-4 rounded-lg shadow-lg border backdrop-blur-md
              ${rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                rec.priority === 'medium' ? 'bg-amber-50 border-amber-200' :
                'bg-blue-50 border-blue-200'}
            `}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{rec.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{rec.message}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleAction(rec.actionData)}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {rec.actionLabel}
                  </button>
                  <button
                    onClick={() => dismissRecommendation({ id: rec._id })}
                    className="text-xs px-3 py-1 border rounded hover:bg-gray-100"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

Acceptance Criteria:

 Recommendations appear based on user patterns
 At most 3 recommendations shown at once
 Dismissed recommendations don't reappear
 High-priority recommendations shown prominently
 Pattern recognition accuracy >70%
 AI suggestions are contextually relevant
 Recommendations expire after 24 hours
 Mobile-friendly notification cards
2.3 Context-Aware Widgets (Time-Based Adaptation)
Priority: P1
Effort: 1.5 weeks
Dependencies: Phase 2.2 (Recommendations)

Objective: Dynamically adapt UI based on time of day, day of week, and user context.

Technical Spec:

Files to Create:

src/
├── hooks/
│   ├── useTimeContext.ts (NEW - time-based logic)
│   └── useAdaptiveLayout.ts (NEW - layout switching)
└── components/
    ├── AdaptiveWidget.tsx (NEW - base widget)
    └── widgets/
        ├── MorningDigestWidget.tsx (NEW)
        ├── AfternoonProductivityWidget.tsx (NEW)
        ├── EveningReviewWidget.tsx (NEW)
        └── WeekendPlannerWidget.tsx (NEW)

Time Context Hook:

// useTimeContext.ts
export function useTimeContext() {
  const [context, setContext] = useState<TimeContext>();
  
  useEffect(() => {
    const updateContext = () => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay(); // 0-6 (Sunday-Saturday)
      
      let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      const isWeekend = day === 0 || day === 6;
      const isWorkHours = hour >= 9 && hour < 17 && !isWeekend;
      
      setContext({
        timeOfDay,
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        isWeekend,
        isWorkHours,
        hour
      });
    };
    
    updateContext();
    const interval = setInterval(updateContext, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  return context;
}

Adaptive Widget Examples:

Morning (6 AM - 12 PM)
// MorningDigestWidget.tsx
export function MorningDigestWidget() {
  const dailyBrief = useQuery(api.domains.research.getDailyBrief);
  const tasksToday = useQuery(api.domains.tasks.getTasksForToday);
  const upcomingMeetings = useQuery(api.domains.calendar.getTodaysMeetings);
  
  return (
    <div className="morning-digest p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        ☀️ Good Morning
      </h2>
      
      {/* Daily Brief Summary */}
      <section className="mb-6">
        <h3 className="font-semibold mb-2">Today's Intelligence Brief</h3>
        <p className="text-sm text-gray-700">{dailyBrief?.summary}</p>
        <button className="text-blue-600 text-sm mt-2">Read full brief →</button>
      </section>
      
      {/* Today's Priorities */}
      <section className="mb-6">
        <h3 className="font-semibold mb-2">Your Priorities</h3>
        <ul className="space-y-2">
          {tasksToday?.slice(0, 3).map(task => (
            <li key={task._id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" />
              <span>{task.title}</span>
            </li>
          ))}
        </ul>
      </section>
      
      {/* Meetings Overview */}
      <section>
        <h3 className="font-semibold mb-2">Upcoming Meetings ({upcomingMeetings?.length || 0})</h3>
        {upcomingMeetings?.slice(0, 2).map(meeting => (
          <div key={meeting._id} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
            <div className="font-medium">{meeting.title}</div>
            <div className="text-gray-600">{formatTime(meeting.startTime)}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

Afternoon (12 PM - 6 PM)
// AfternoonProductivityWidget.tsx
export function AfternoonProductivityWidget() {
  const todayProgress = useQuery(api.domains.tasks.getTodayProgress);
  const focusSessionActive = useQuery(api.domains.focus.getActiveSession);
  
  return (
    <div className="afternoon-widget p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        ⚡ Stay Focused
      </h2>
      
      {/* Progress So Far */}
      <section className="mb-6">
        <h3 className="font-semibold mb-2">Today's Progress</h3>
        <div className="flex items-center gap-4">
          <CircularProgress value={todayProgress?.percentage || 0} />
          <div>
            <div className="text-2xl font-bold">{todayProgress?.completed || 0}/{todayProgress?.total || 0}</div>
            <div className="text-sm text-gray-600">tasks completed</div>
          </div>
        </div>
      </section>
      
      {/* Focus Timer */}
      <section>
        <h3 className="font-semibold mb-2">Deep Work Session</h3>
        {focusSessionActive ? (
          <FocusTimer session={focusSessionActive} />
        ) : (
          <button className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Start 25-min Focus Session
          </button>
        )}
      </section>
      
      {/* Pending Reviews */}
      <section className="mt-6">
        <h3 className="font-semibold mb-2">Pending Reviews</h3>
        <div className="text-sm text-gray-600">
          2 documents waiting for your review
        </div>
        <button className="text-blue-600 text-sm mt-1">Review now →</button>
      </section>
    </div>
  );
}

Evening (6 PM - 12 AM)
// EveningReviewWidget.tsx
export function EveningReviewWidget() {
  const todayAccomplishments = useQuery(api.domains.tasks.getTodayCompleted);
  const tomorrowPreview = useQuery(api.domains.tasks.getTomorrowsTasks);
  
  return (
    <div className="evening-widget p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🌆 Daily Reflection
      </h2>
      
      {/* Today's Wins */}
      <section className="mb-6">
        <h3 className="font-semibold mb-2">What You Accomplished</h3>
        <ul className="space-y-2">
          {todayAccomplishments?.map(task => (
            <li key={task._id} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>{task.title}</span>
            </li>
          ))}
        </ul>
        {todayAccomplishments?.length === 0 && (
          <p className="text-sm text-gray-500">No tasks completed today</p>
        )}
      </section>
      
      {/* Tomorrow Preview */}
      <section className="mb-6">
        <h3 className="font-semibold mb-2">Tomorrow's Agenda</h3>
        <ul className="space-y-2">
          {tomorrowPreview?.slice(0, 3).map(task => (
            <li key={task._id} className="text-sm border-l-2 border-purple-500 pl-3 py-1">
              {task.title}
            </li>
          ))}
        </ul>
      </section>
      
      {/* Journal Prompt */}
      <section>
        <h3 className="font-semibold mb-2">Evening Reflection</h3>
        <textarea
          className="w-full p-3 border rounded-lg text-sm"
          placeholder="What went well today? What could be better tomorrow?"
          rows={3}
        />
        <button className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
          Save Reflection
        </button>
      </section>
    </div>
  );
}

Weekend
// WeekendPlannerWidget.tsx
export function WeekendPlannerWidget() {
  const nextWeekPreview = useQuery(api.domains.tasks.getNextWeekTasks);
  const weeklyReview = useQuery(api.domains.analytics.getWeeklySummary);
  
  return (
    <div className="weekend-widget p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🌿 Weekly Planning
      </h2>
      
      {/* Last Week Review */}
      <section className="mb-6">
        <h3 className="font-semibold mb-2">Last Week's Highlights</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-green-600">{weeklyReview?.tasksCompleted}</div>
            <div className="text-xs text-gray-600">Tasks Done</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">{weeklyReview?.docsCreated}</div>
            <div className="text-xs text-gray-600">Docs Created</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600">{weeklyReview?.focusHours}h</div>
            <div className="text-xs text-gray-600">Focus Time</div>
          </div>
        </div>
      </section>
      
      {/* Week Ahead */}
      <section>
        <h3 className="font-semibold mb-2">Plan Your Week</h3>
        <div className="space-y-2">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
            <div key={day} className="p-2 border rounded hover:bg-white cursor-pointer">
              <div className="font-medium text-sm">{day}</div>
              <div className="text-xs text-gray-600">
                {nextWeekPreview?.filter(t => t.day === day).length || 0} tasks planned
              </div>
            </div>
          ))}
        </div>
        <button className="mt-4 w-full py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Schedule This Week
        </button>
      </section>
    </div>
  );
}

Adaptive Layout Manager:

// useAdaptiveLayout.ts
export function useAdaptiveLayout() {
  const timeContext = useTimeContext();
  const userPrefs = useQuery(api.domains.auth.userPreferences.getUserPreferences);
  
  const getLayoutConfig = useCallback(() => {
    if (!timeContext) return null;
    
    const { timeOfDay, isWeekend, isWorkHours } = timeContext;
    
    // Weekend layout
    if (isWeekend) {
      return {
        primaryWidget: 'WeekendPlannerWidget',
        secondaryWidgets: ['WeeklySummaryWidget', 'PersonalProjectsWidget'],
        hideWorkFeatures: true
      };
    }
    
    // Weekday layouts based on time
    switch (timeOfDay) {
      case 'morning':
        return {
          primaryWidget: 'MorningDigestWidget',
          secondaryWidgets: ['TodayTasksWidget', 'UpcomingMeetingsWidget'],
          emphasizeFeatures: ['briefing', 'calendar']
        };
      
      case 'afternoon':
        return {
          primaryWidget: 'AfternoonProductivityWidget',
          secondaryWidgets: ['FocusTimerWidget', 'TaskProgressWidget'],
          emphasizeFeatures: ['tasks', 'focus']
        };
      
      case 'evening':
        return {
          primaryWidget: 'EveningReviewWidget',
          secondaryWidgets: ['TomorrowPreviewWidget', 'ReflectionWidget'],
          emphasizeFeatures: ['review', 'planning']
        };
      
      default:
        return {
          primaryWidget: 'DefaultDashboard',
          secondaryWidgets: [],
          emphasizeFeatures: []
        };
    }
  }, [timeContext]);
  
  return getLayoutConfig();
}

Acceptance Criteria:

 UI adapts automatically based on time of day
 Weekend mode hides work-related features
 Morning shows daily briefing prominently
 Afternoon emphasizes productivity tools
 Evening shows daily review & tomorrow preview
 Users can override auto-adaptation
 Transitions between modes are smooth
 Respects user's timezone preference
<a name="phase-3"></a>

Phase 3: Advanced Interactions (Weeks 7-9)
3.1 Enhanced Timeline Strip
Priority: P1
Effort: 2 weeks
Dependencies: None

Objective: Transform static timeline into interactive, filterable, and navigable event stream.

3.2 Act-Aware Dashboard Interactivity
Priority: P1
Effort: 1.5 weeks

3.3 Personal Pulse Enhancements
Priority: P1
Effort: 1 week

3.4 Workspace Grid Upgrades
Priority: P2
Effort: 2 weeks

<a name="phase-4"></a>

Phase 4: Polish & Optimization (Weeks 10-12)
4.1 Micro-Interactions & Animations
Priority: P2
Effort: 1.5 weeks

4.2 Personal Analytics Dashboard
Priority: P1
Effort: 2 weeks

4.3 Interactive Onboarding
Priority: P1
Effort: 1.5 weeks

4.4 Empty States & Error Handling
Priority: P2
Effort: 1 week

<a name="technical-architecture"></a>

Technical Architecture
System Diagram
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Command   │  │   Quick    │  │   Theme    │            │
│  │  Palette   │  │  Capture   │  │  System    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │Recommenda- │  │ Adaptive   │  │ Analytics  │            │
│  │   tions    │  │  Widgets   │  │ Dashboard  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
                    Convex Realtime
                           │
┌──────────────────────────┼────────────────────────────────────┐
│                    Backend (Convex)                           │
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   User     │  │  Behavior  │  │    Quick   │            │
│  │   Stats    │  │  Tracking  │  │  Captures  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │Recommenda- │  │  Pattern   │  │   Theme    │            │
│  │   tions    │  │Recognition │  │   Prefs    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
                  External Services
                           │
         ┌─────────────────┴─────────────────┐
         │                                    │
    ┌────────┐                          ┌─────────┐
    │ OpenAI │                          │ Resend  │
    │ (GPT-4)│                          │ (Email) │
    └────────┘                          └─────────┘
    - Whisper (transcription)           - Notifications
    - Recommendations                    - Alerts
    - Smart suggestions

Data Flow
User Activity → Pattern Recognition → Recommendations

// 1. User performs action (e.g., creates document)
const createDocument = useMutation(api.domains.documents.create);

// 2. Track behavior event
await ctx.db.insert("userBehaviorEvents", {
  userId,
  eventType: "document_created",
  entityId: documentId,
  timestamp: Date.now(),
  timeOfDay: getTimeOfDay(),
  dayOfWeek: getDayOfWeek()
});

// 3. Pattern recognition runs periodically (cron)
// Analyzes events and generates recommendations

// 4. Recommendations surface in UI
const recommendations = useQuery(api.domains.recommendations.list);

<a name="implementation-guide"></a>

Implementation Guide
Step-by-Step Implementation Order
Week 1-3: Foundation
✅ Complete user personalization (DONE)
Finish Command Palette integration
Build theme system
Implement accessibility foundation
Week 4-6: Intelligence
Quick Capture Widget (voice, screenshot, clipboard)
Smart Recommendations Engine
Context-aware widgets
Week 7-9: Interactions
Timeline enhancements
Dashboard interactivity
Personal Pulse improvements
Workspace grid upgrades
Week 10-12: Polish
Micro-interactions & animations
Analytics dashboard
Interactive onboarding
Empty states & error handling
<a name="testing-strategy"></a>

Testing Strategy
Unit Tests
All utility functions (>80% coverage)
Custom hooks (100% coverage)
Data transformations
Integration Tests
Command Palette navigation flow
Quick Capture → Document creation
Recommendation generation → Dismissal
Theme switching → Persistence
E2E Tests (Playwright)
test('Command Palette workflow', async ({ page }) => {
  // Open app
  await page.goto('/');
  
  // Press Cmd+K
  await page.keyboard.press('Meta+K');
  
  // Search for "calendar"
  await page.fill('[placeholder="Type a command..."]', 'calendar');
  
  // Select first result
  await page.keyboard.press('Enter');
  
  // Verify navigation
  await expect(page).toHaveURL(/.*calendar/);
});

Performance Tests
Command Palette opens in <100ms
Search results update in <50ms
Theme switching completes in <200ms
Recommendations load in <300ms
<a name="rollout-plan"></a>

Rollout Plan
Beta Testing (Week 11)
10% of users (invite-only)
Collect feedback via in-app surveys
Monitor error rates & performance metrics
Gradual Rollout (Week 12)
Day 1: 25% of users
Day 3: 50% of users
Day 5: 75% of users
Day 7: 100% of users
Feature Flags
const featureFlags = {
  commandPalette: true,
  quickCapture: false,        // Rollout later
  smartRecommendations: true,
  adaptiveWidgets: false,     // Beta testing
  analytics: false            // Coming soon
};

Monitoring
Error tracking (Sentry)
Performance monitoring (Web Vitals)
User analytics (PostHog)
A/B testing (split.io)
Success Criteria
Quantitative
 Command Palette used by 60%+ of active users
 Quick Capture creates 1000+ notes/week
 Theme customization adopted by 40%+ users
 Recommendation click-through rate >25%
 Analytics dashboard viewed 3x/week avg
Qualitative
 NPS score >50
 User satisfaction surveys >4.5/5
 Support tickets decrease by 30%
 Feature requests align with roadmap
This PRD is a living document. Update as requirements evolve.
