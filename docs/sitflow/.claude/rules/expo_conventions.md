# Expo & React Native Conventions

## Navigation
- **File-based routing** via Expo Router 6. Route segments map to `app/` directory structure.
- **Tabs:** 4 tabs defined in `app/(tabs)/_layout.tsx` — Inbox, Calendar, Clients, Agent.
- **Stack screens:** `request/[id]`, `meetgreet/[id]`, `clients/[id]`, `clients/new`, `message-draft`, `oauth/callback`.
- **Headers:** Hidden by default (`headerShown: false`). Explicitly enable with human-readable titles when needed.
- **Modal presentation:** Use `presentation: "fullScreenModal"` for login flows (iOS tab switching compatibility).

## Styling
- **NativeWind 4** (Tailwind CSS for React Native). Use `className` prop.
- **StyleSheet** for complex/dynamic styles that can't be expressed in Tailwind.
- **Dark theme constants:**
  - Background: `#0F0F1A`
  - Card/section: `#1A1A2E`
  - Border: `#2A2A40`
  - Purple accent: `#A78BFA`
  - Muted text: `#8E8EA0`
  - Success: `#34D399`
  - Warning: `#F59E0B`
  - Error: `#EF4444`

## Platform Guards
- Always check `Platform.OS !== 'web'` before using native-only APIs:
  - `expo-haptics` (haptic feedback)
  - `expo-secure-store` (token storage — falls back to AsyncStorage on web)
  - Native gesture handlers
- Use `@/lib/_core/manus-runtime.ts` for Manus platform bridge (safe area insets via postMessage on web).

## State Management
- **AppContext** (`lib/app-context.tsx`) — Single provider for all domain state. Wraps the entire app.
- **AsyncStorage** — Local persistence layer. Keys prefixed with `sitflow:`.
- **tRPC + React Query** — Server state. `refetchOnWindowFocus: false` (mobile). Retry: 1.
- **Do not** introduce Redux, Zustand, or Jotai unless explicitly discussed. The current Context + AsyncStorage + tRPC pattern is intentional.

## Component Patterns
- **ScreenContainer** (`components/screen-container.tsx`) — Standard screen wrapper. Use for all screens.
- **HapticTab** (`components/haptic-tab.tsx`) — Tab bar button with haptic feedback on press.
- **IconSymbol** (`components/ui/icon-symbol.tsx`) — SF Symbols (iOS) / MaterialIcons (Android/web) abstraction.

## Performance
- **QueryClient defaults:** `refetchOnWindowFocus: false`, `retry: 1`.
- **Image loading:** Use `expo-image` (not React Native `Image`).
- **Lists:** Use `FlatList` with proper `keyExtractor`, not `.map()` for long lists.
- **Memoization:** `useMemo`/`useCallback` for expensive computations in AppContext.

## Testing
- **Vitest** runner. Test files in `__tests__/` and `tests/`.
- **No Detox/Maestro** currently — tests are logic-level, not E2E.
