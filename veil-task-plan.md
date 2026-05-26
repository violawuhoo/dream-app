# Veil — Task Plan & Prompt Guide
**Stack:** React Native (Expo) · Clerk Auth · Supabase · Kimi LLM · iOS
**Date:** May 11, 2026

---

## How to Use This Document

1. Open a Claude Code session
2. Paste the **Session Opening Brief** (below) first — every session, every time
3. Copy just the **prompt for the current task** — one task at a time
4. Attach only the files listed under **Attach** for that task
5. Claude Code will execute, commit, and output a Task Report
6. Paste the Task Report back into Claude Chat for verification before moving on

---

## Session Opening Brief
*Paste this at the start of every Claude Code session, before any task prompt.*

```
You are helping me build "Veil" — an AI-native dream journaling iOS app.
Stack: React Native (Expo) + Clerk Auth + Supabase + Kimi LLM.

Rules:
- Execute exactly what the task asks. Do not add unrequested features.
- After completing each task, run: git add . && git commit -m "[commit message]"
- Do NOT git push. I will push manually.
- After committing, output a task report in this exact format and nothing else after it:

---TASK REPORT---
TASK: [id and name]
STATUS: [COMPLETE / PARTIAL / BLOCKED]
FILES CREATED: [list, one per line]
FILES MODIFIED: [list, one per line]
COMMIT: [exact commit message used]
DONE-WHEN CHECK:
  - [criterion]: [PASS / FAIL / UNTESTED]
ISSUES: [problems encountered, or "None"]
NEXT TASK: [id and name]
---END REPORT---
```

---

## Pre-Flight Checklist
*Complete these before starting Task 1.1. None of them are Claude Code tasks.*

- [ ] Supabase project created (free tier) — copy `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- [ ] Clerk account created — copy `PUBLISHABLE_KEY`, enable Apple + Google OAuth in dashboard
- [ ] Kimi API key confirmed working
- [ ] Xcode installed with iOS 16+ simulator
- [ ] Node.js 20+ installed: `node --version`
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Git repo initialised and `phase/1-bootstrap` branch created

---

# PHASE 1 — Project Bootstrap
**Goal:** Expo project running, Clerk wired, Supabase schema ready, LLM client streaming.
**Branch:** `phase/1-bootstrap`

---

## Task 1.1 — Initialize Expo Project
**Attach:** nothing

```
Create a new Expo managed workflow project called "veil" using the TypeScript template.

Steps:
- Run: npx create-expo-app@latest veil --template expo-template-blank-typescript
- Install dependencies:
    expo-router@^4
    expo-status-bar
    expo-font
    expo-splash-screen
    expo-secure-store
    @expo/vector-icons
    react-native-safe-area-context
    react-native-screens
    react-native-gesture-handler
    react-native-reanimated
    nativewind@^4
    tailwindcss

- Set up NativeWind v4: tailwind.config.js + babel.config.js + global.css
- Set up expo-router with app/ directory
- Configure app.json:
    name: "Veil"
    slug: "veil"
    ios.bundleIdentifier: "com.veil.dreamapp"
    ios.supportsTablet: false
    orientation: "portrait"

When done: git add . && git commit -m "task 1.1: init expo project with NativeWind and expo-router"
Output the task report.
```

**Done when:**
- `npx expo start` runs without errors
- Blank screen visible on iOS simulator
- `app.json` has `bundleIdentifier: com.veil.dreamapp`
- Orientation locked to portrait

---

## Task 1.2 — Fix Tarot Data
**Attach:** `tarot-data.ts` (from original Next.js project)

```
Port and fix the tarot data file from the attached tarot-data.ts.

1. Audit the card array — must have exactly 22 entries (The Fool through The World, 0–21)
2. Remove any duplicate or extra card
3. Place file at: src/data/tarot-data.ts
4. Keep same card shape: { id, name, meaning }
5. Keep getRandomTarotCard() export unchanged
6. Add at the bottom: console.assert(cards.length === 22, "Tarot must have 22 cards")

When done: git add . && git commit -m "task 1.2: port tarot data, fix to exactly 22 Major Arcana"
Output the task report.
```

**Done when:**
- `src/data/tarot-data.ts` exists with exactly 22 cards
- `getRandomTarotCard()` returns one of the 22 named cards
- `console.assert` passes without error

---

## Task 1.3 — Port Dream Model
**Attach:** `dream-model.ts` (from original Next.js project)

```
Port dream-model.ts to the Expo project from the attached file.

- Place at: src/lib/dream-model.ts
- Zero logic changes
- Remove any Next.js-specific imports if present
- Keep DreamFlowState, DreamFlowStateType, createDreamRecord, createSession exactly as-is
- Add one new export: export type DreamRecord = ReturnType<typeof createDreamRecord>

When done: git add . && git commit -m "task 1.3: port dream-model.ts, add DreamRecord type export"
Output the task report.
```

**Done when:**
- File imports cleanly with no TypeScript errors
- `DreamRecord` type is exported
- All 11 `DreamFlowState` values present

---

## Task 1.4 — Port LLM Prompts
**Attach:** `llm-prompts.ts` (from original Next.js project)

```
Port llm-prompts.ts to the Expo project from the attached file.

- Place at: src/lib/llm-prompts.ts
- Absolutely zero changes to any prompt content or logic
- Only remove Next.js-specific imports if any exist
- Nothing else

When done: git add . && git commit -m "task 1.4: port llm-prompts.ts, no content changes"
Output the task report.
```

**Done when:**
- File imports cleanly with no errors
- All prompt builder functions present and unchanged

---

## Task 1.5 — Supabase Schema & Client
**Attach:** `dream-model.ts` (ported version from Task 1.3)

```
Set up Supabase schema and client.

1. Create supabase/migrations/001_dream_records.sql:

   CREATE TABLE dream_records (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     session_id uuid UNIQUE NOT NULL,
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     created_at timestamptz DEFAULT now(),
     raw_input text,
     narrative text,
     title text,
     keywords text[],
     emotions text[],
     interpretation text,
     life_connection_interpretation text,
     tarot_card jsonb,
     tarot_interpretation text,
     status text DEFAULT 'DONE'
   );

   ALTER TABLE dream_records ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users own their records" ON dream_records
     FOR ALL USING (auth.uid() = user_id);

   CREATE INDEX idx_dream_records_user_date
     ON dream_records (user_id, created_at DESC);

2. Create src/lib/supabase.ts:
   - createClient from @supabase/supabase-js
   - Uses EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
   - Export the typed client

3. Create .env.local with placeholders (do not fill real values):
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

When done: git add . && git commit -m "task 1.5: supabase migration schema and typed client"
Output the task report.
```

**Done when:**
- SQL migration file exists and is valid
- `supabase.ts` exports a typed client
- `.env.local` exists with placeholder keys
- Running migration in Supabase SQL editor succeeds with no errors (do this manually)

---

## Task 1.6 — Clerk Authentication
**Attach:** nothing

```
Set up Clerk authentication in the Expo project.

Install: @clerk/clerk-expo expo-web-browser expo-auth-session

1. Update app/_layout.tsx:
   Wrap entire app with <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
   Also wrap with SafeAreaProvider and GestureHandlerRootView.

2. Create app/(auth)/_layout.tsx:
   - If useAuth().isSignedIn → redirect to /(tabs)
   - Otherwise render children (Slot)

3. Create app/(auth)/sign-in.tsx:
   Placeholder only — dark background (#0A0A0F), centered text "Veil".
   Two OAuth buttons (Apple Sign-In + Google — both required, even as placeholders).
   Guest text link. Full UI is built in Task 4.1.

4. Create app/(tabs)/_layout.tsx:
   - If !useAuth().isSignedIn → redirect to /(auth)/sign-in
   - Otherwise render Tabs with 3 placeholder tabs: index, archive, profile

5. Add to .env.local:
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key

Apple Sign-In button MUST be present — App Store requirement.

When done: git add . && git commit -m "task 1.6: clerk auth with Apple+Google OAuth routing"
Output the task report.
```

**Done when:**
- Visiting a tab route while unauthenticated redirects to sign-in
- Sign-in screen renders with both Apple and Google buttons
- Root layout has ClerkProvider wrapping everything

---

## Task 1.7 — Streaming LLM Client
**Attach:** `route.ts` (from original Next.js project)

```
Create the secure streaming LLM client for Expo, based on the attached route.ts.

1. Create app/api/dream-chat+api.ts:
   - POST handler — same core logic as the attached route.ts
   - Reads KIMI_API_KEY from process.env (server-side only, NOT EXPO_PUBLIC_)
   - Calls https://api.moonshot.cn/v1/chat/completions with stream: true
   - Returns response as a ReadableStream (streaming passthrough)
   - On any error: return 500 with { error: "Something went wrong" } — never expose raw API errors
   - Add KIMI_API_KEY=your_kimi_key to .env.local as a placeholder

2. Create src/lib/llm-client.ts:
   - async function* callLLM(messages, temperature, getToken): AsyncGenerator<string>
     POST to /api/dream-chat with Clerk token in Authorization: Bearer header
     Parse SSE stream and yield each text chunk as it arrives
     Timeout: 30s. On network error: retry once after 1s delay, then throw.
   
   - async function callLLMFull(messages, temperature, getToken): Promise<string>
     Calls callLLM and accumulates all chunks into one string, returns it

When done: git add . && git commit -m "task 1.7: streaming LLM client, API key server-side only"
Output the task report.
```

**Done when:**
- `KIMI_API_KEY` is only read in the API route, not in any client file
- `callLLM` returns an `AsyncGenerator`
- `callLLMFull` returns a complete string
- No raw Kimi API errors are forwarded to the client

---

# PHASE 2 — Core Logic
**Goal:** Orchestrator fully ported with streaming, Supabase persistence, and offline drafts.
**Branch:** `phase/2-logic`

---

## Task 2.1 — Port useOrchestrator
**Attach:** `useOrchestrator.ts` (original), `dream-model.ts`, `llm-client.ts`, `supabase.ts`

```
Port useOrchestrator.ts to src/lib/useOrchestrator.ts from the attached original file.

ALL existing logic is preserved exactly:
- DONE_PATTERNS, CONTINUE_PATTERNS arrays — unchanged
- sleep() helper — unchanged
- checkIntent() — unchanged
- All state transitions and DreamFlowState handling — unchanged
- nextCheckTurn logic, 4-turn minimum — unchanged
- askFollowUp, proceedToStructuring, generateInterpretation — unchanged
- handleLifeConnection, drawTarot, skipTarot, skipInterpretation — unchanged
- resetSession — unchanged

Only these THREE things change:

CHANGE 1 — Hook signature:
  export function useOrchestrator(userId: string, getToken: () => Promise<string | null>)
  Both params come from Clerk: userId from useUser(), getToken from useAuth()

CHANGE 2 — Streaming LLM calls:
  Replace every: const response = await callLLM(prompts, temp)
  With this pattern:
    let response = ""
    const baseMessages = [...currentSession.messages]
    for await (const chunk of callLLM(prompts, temp, getToken)) {
      response += chunk
      updateSession({
        messages: [...baseMessages, { role: "assistant", content: response }]
      })
    }

CHANGE 3 — saveRecord() storage:
  Remove all localStorage calls.
  Replace with:
    const { error } = await supabase
      .from('dream_records')
      .upsert({ ...record, user_id: userId }, { onConflict: 'session_id' })
    if (error) throw error

  Also add loadRecords():
    const loadRecords = async (): Promise<DreamRecord[]> => {
      const { data, error } = await supabase
        .from('dream_records')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    }
  Export loadRecords alongside all existing exports.

When done: git add . && git commit -m "task 2.1: orchestrator — streaming LLM, supabase save, remove localStorage"
Output the task report.
```

**Done when:**
- TypeScript compiles with no errors (`tsc --noEmit`)
- All 11 `DreamFlowState` transitions intact
- No `localStorage` references remain
- `loadRecords` is exported

---

## Task 2.2 — Offline Draft Queue
**Attach:** `useOrchestrator.ts` (from Task 2.1)

```
Add offline draft persistence to the Veil project.

1. Create src/lib/useDraftRestore.ts:
   Uses expo-secure-store, key: "veil_draft_session"

   State to export:
   {
     hasDraft: boolean,
     draftAge: number,          // hours since draft was saved
     draftSession: Session | null,
     restoreDraft: () => void,  // loads draft into orchestrator
     discardDraft: () => void   // deletes from SecureStore + resets session
   }

   Behavior:
   - On mount: read SecureStore. If draft exists and created_at < 24h ago → set hasDraft true
   - Auto-save: useEffect watching session changes → debounced 1000ms write to SecureStore
   - restoreDraft: parse stored JSON → call updateSession with restored session
   - discardDraft: SecureStore.deleteItemAsync("veil_draft_session") + resetSession()

2. Update src/lib/useOrchestrator.ts:
   - Accept optional initialSession?: Session parameter
     If provided, use it as the initial state instead of createSession()
   - In saveRecord(), after successful Supabase upsert, add:
     await SecureStore.deleteItemAsync("veil_draft_session")

When done: git add . && git commit -m "task 2.2: offline draft auto-save and restore via SecureStore"
Output the task report.
```

**Done when:**
- Force-quit app mid-session → reopen → `hasDraft` is true
- `restoreDraft()` restores session state correctly
- Completing and saving a session clears the draft from SecureStore

---

# PHASE 3 — Screen Architecture
**Goal:** All screens exist, navigation works, design system established.
**Branch:** `phase/3-architecture`

---

## Task 3.1 — Design Tokens & Theme
**Attach:** nothing

```
Create the Veil design token system.

1. Create src/theme/tokens.ts:

   Colors:
     background: '#0A0A0F'
     surface: '#12121A'
     surfaceElevated: '#1A1A26'
     border: '#2A2A3F'
     textPrimary: '#E8E8F0'
     textSecondary: '#8888AA'
     textMuted: '#55556A'
     accent: '#7B6EF6'
     accentSoft: '#2D2847'
     gold: '#C9A84C'
     goldSoft: '#2A2415'
     error: '#E57373'
     success: '#81C784'

   Typography:
     fontSizes: { xs:11, sm:13, base:15, md:17, lg:20, xl:24, '2xl':30, '3xl':38 }
     lineHeights: { tight:1.2, normal:1.5, relaxed:1.8 }
     letterSpacing: { tight:-0.5, normal:0, wide:1.5, widest:3 }

   Spacing: [4,8,12,16,20,24,32,40,48,64]
   BorderRadius: { sm:8, md:12, lg:16, xl:24, full:999 }

2. Create src/theme/index.ts — re-exports all tokens

3. Create src/theme/styles.ts — common StyleSheet objects:
   screen: { flex:1, backgroundColor: tokens.colors.background }
   card: { backgroundColor: tokens.colors.surfaceElevated, borderRadius: tokens.borderRadius.md, borderWidth:1, borderColor: tokens.colors.border }
   heading, body, caption using token fontSizes and lineHeights

4. Extend tailwind.config.js with custom token classes:
   bg-veil-background, bg-veil-surface, bg-veil-surfaceElevated,
   bg-veil-accent, bg-veil-accentSoft, bg-veil-gold,
   text-veil-primary, text-veil-secondary, text-veil-muted,
   text-veil-accent, text-veil-gold, text-veil-error

When done: git add . && git commit -m "task 3.1: design tokens, theme styles, tailwind token classes"
Output the task report.
```

**Done when:**
- `className="bg-veil-background text-veil-accent"` works without error on any component
- All 13 color tokens defined
- `styles.screen`, `styles.card`, `styles.heading`, `styles.body`, `styles.caption` usable

---

## Task 3.2 — Navigation Structure
**Attach:** nothing

```
Create the complete Expo Router v4 navigation structure for Veil.

Create these files (placeholder screens — full UI in Phase 4):

app/_layout.tsx
  ClerkProvider + SafeAreaProvider + GestureHandlerRootView
  On mount: check AsyncStorage key 'veil_onboarded'
    If not set → router.replace('/onboarding')
    If set → normal auth routing proceeds

app/onboarding.tsx
  Placeholder: dark background, "Onboarding" text centered

app/(auth)/_layout.tsx
  Redirect to /(tabs) if signed in

app/(auth)/sign-in.tsx
  Keep existing placeholder from Task 1.6

app/(tabs)/_layout.tsx
  Bottom tab bar, 3 tabs, icon-only (no labels):
    Tab 1: Ionicons 'moon-outline' → index
    Tab 2: Ionicons 'journal-outline' → archive
    Tab 3: Ionicons 'person-outline' → profile
  Tab bar style:
    backgroundColor: tokens.surface
    Active tint: tokens.accent
    Inactive tint: tokens.textMuted
    borderTopColor: tokens.border

app/(tabs)/index.tsx        placeholder
app/(tabs)/archive.tsx      placeholder
app/(tabs)/profile.tsx      placeholder
app/dream/capture.tsx       placeholder
app/dream/[id].tsx          placeholder
app/dream/tarot.tsx         placeholder

All placeholders: tokens.background fill + screen name in white text centered.
StatusBar style: light on all screens.

When done: git add . && git commit -m "task 3.2: full navigation structure with expo-router v4"
Output the task report.
```

**Done when:**
- All 10 routes navigate without errors
- Tab bar shows on tab screens, hidden on dream/ screens
- First-launch check redirects to onboarding
- Unauthenticated access redirects to sign-in

---

## Task 3.3 — Shared UI Components
**Attach:** `tokens.ts` (from Task 3.1)

```
Create 7 shared UI components in src/components/ui/.
All must use design tokens — no hardcoded color or size values.

1. VeilText.tsx
   Props: variant ('display'|'heading'|'body'|'caption'|'muted'), color?, style?, children
   Maps variants to token fontSizes and lineHeights.

2. VeilButton.tsx
   Props: label, onPress, variant ('primary'|'ghost'|'danger'), loading?, disabled?, icon?
   Primary: accent bg, white text.
   Ghost: transparent bg, accent border and text.
   Danger: error color text, ghost style.
   Press animation: scale 0.96 → 1.0 with react-native-reanimated (100ms).
   Loading state: ActivityIndicator replaces label.

3. VeilInput.tsx
   Props: value, onChangeText, placeholder, multiline?, maxLength?, onSubmit?, autoFocus?
   Style: surface bg, border, textPrimary text, textMuted placeholder.
   Multiline: minHeight 120, grows to max 300.
   Shows character count when within 20 chars of maxLength.

4. VeilCard.tsx
   Props: children, style?, onPress?
   surfaceElevated bg, md borderRadius, 1px border.
   If onPress: adds scale press animation.

5. LoadingDots.tsx
   3 dots (6px circles, textMuted).
   Pulses sequentially with 200ms stagger using react-native-reanimated.
   Loops infinitely.

6. StreamingText.tsx
   Props: text (full string), chunkSize? (default 3 chars per frame), onComplete?
   Reveals text progressively using requestAnimationFrame.
   When text prop grows (new content added), continues from where it stopped.
   Uses VeilText body variant internally.

7. Toast.tsx
   Props: message, type ('error'|'success'), visible, onDismiss
   Slides in from top, auto-dismisses after 4000ms.
   Error: error bg. Success: success bg.
   Uses react-native-reanimated for slide animation.

When done: git add . && git commit -m "task 3.3: shared UI components — VeilText, Button, Input, Card, LoadingDots, StreamingText, Toast"
Output the task report.
```

**Done when:**
- All 7 components exist with no TypeScript errors
- `StreamingText` progressively reveals text when given a string prop
- `VeilButton` shows ActivityIndicator when `loading={true}`
- `LoadingDots` animates without errors on simulator

---

# PHASE 4 — Screen Implementation
**Goal:** All 7 screens fully functional with real data.
**Branch:** `phase/4-screens`

---

## Task 4.1 — Sign-In Screen
**Attach:** `tokens.ts`, all components from Task 3.3

```
Build the full Veil sign-in screen at app/(auth)/sign-in.tsx.
Replace the placeholder from Task 1.6.

Layout (full screen, background tokens.background):

TOP 40% — Animated star field:
  80 dots, 1–2px radius, white, opacity 0.2–0.7, randomly positioned.
  All drift upward slowly (react-native-reanimated translateY, speed 0.3–0.8px per frame).
  When a dot reaches the top, wrap it to the bottom. Loop forever.

CENTER:
  "Veil" — 3xl fontSize, textPrimary, letterSpacing widest, textAlign center
  "A quiet place to reconstruct a dream before it fades."
    caption, textMuted, textAlign center, maxWidth 240, marginTop 12

BOTTOM (safe area padding):
  "Continue with Apple" button
    backgroundColor #000, white text, Ionicons logo-apple icon (left)
    Calls: useSSO().startSSOFlow({ strategy: 'oauth_apple' })
    
  "Continue with Google" button (ghost variant, marginTop 12)
    Calls: useSSO().startSSOFlow({ strategy: 'oauth_google' })

  Divider: 1px horizontal line (tokens.border) with "or" (caption textMuted) centered, marginVertical 20

  "Enter as a Guest" — Pressable, caption, textMuted, textAlign center
    Sets AsyncStorage key 'veil_guest' = 'true', then router.replace('/(tabs)')

On OAuth success: router.replace('/(tabs)')
On error: show <Toast> component with error message

When done: git add . && git commit -m "task 4.1: sign-in screen with Apple+Google OAuth and star field animation"
Output the task report.
```

**Done when:**
- Star field animation runs continuously
- Apple OAuth flow opens on tap
- Google OAuth flow opens on tap
- Guest option navigates to tabs
- Error toast appears on OAuth failure

---

## Task 4.2 — Home Screen
**Attach:** `tokens.ts`, `useDraftRestore.ts`, all UI components

```
Build the home screen at app/(tabs)/index.tsx.
Replace the placeholder.

STATE A — No draft (default):
  Background: tokens.background

  Animated orb:
    View with width/height 280, borderRadius 140, backgroundColor tokens.accentSoft, opacity 0.4
    Wrapped in expo-blur BlurView for soft glow effect
    Positioned in top 55% of screen, centered horizontally
    Pulses: scale 1.0 → 1.08 → 1.0 every 4000ms using react-native-reanimated, loops forever

  Greeting (heading, textPrimary, textAlign center, position absolute centered):
    getGreeting() function:
      hour 0–5: "What did you dream?"
      hour 6–11: "Good morning. A dream to record?"
      all others: "A space for your dreams."

  Moon button (centered, marginTop 48 below greeting):
    Ionicons moon-outline, size 52, color tokens.accent
    "Begin" text below, caption, textMuted
    Entire area is Pressable → router.push('/dream/capture')
    Press: scale 0.95 → 1.0 animation

  If user has dreams (load count from Supabase on mount, query: count from dream_records where user_id = current user):
    Bottom row: "Last dream: [latest title]" caption textMuted + Ionicons chevron-forward
    Pressable → router.push('/dream/[latestId]')

STATE B — Draft exists (useDraftRestore().hasDraft is true):
  VeilCard above the moon button:
    "Unfinished dream · [X] hours ago" caption textMuted
    Two buttons: VeilButton primary "Continue" | VeilButton ghost "Start fresh"
    Continue → restoreDraft() + router.push('/dream/capture')
    Start fresh → discardDraft() (card disappears)

When done: git add . && git commit -m "task 4.2: home screen with animated orb, greeting, draft restore card"
Output the task report.
```

**Done when:**
- Greeting text matches current time
- Orb animation runs continuously
- Draft card appears when a draft exists
- "Continue" restores draft and navigates to capture

---

## Task 4.3 — Dream Capture Screen
**Attach:** `useOrchestrator.ts`, `useDraftRestore.ts`, all UI components, `tokens.ts`

```
Build the dream capture screen at app/dream/capture.tsx.
This is the core flow screen. Wire everything to useOrchestrator().

Get userId and getToken from Clerk:
  const { userId } = useAuth()
  const { getToken } = useAuth()
  const orchestrator = useOrchestrator(userId, getToken)

LAYOUT — KeyboardAvoidingView behavior="padding", flex 1, background tokens.background:

HEADER (safe area top, paddingHorizontal 20, paddingVertical 12):
  Left: "Veil" caption textMuted
  Right: Ionicons close-outline (24px, textMuted)
    On press: Alert.alert("Exit?", "Your draft is saved automatically.", [Cancel, Exit])
    Exit → router.back()

MESSAGE LIST (FlatList, flex 1, paddingHorizontal 16):
  ref={flatListRef}, onContentSizeChange → scrollToEnd
  
  Render each message:
  - User messages: alignSelf flex-end, backgroundColor accentSoft,
    borderRadius md, paddingH 14 paddingV 10, maxWidth '78%'
    VeilText body textPrimary
  - Veil messages: alignSelf flex-start, paddingH 4, maxWidth '88%'
    If it's the last message AND isProcessing: use <StreamingText>
    Otherwise: VeilText body textSecondary lineHeight relaxed
  
  After all messages, if isProcessing AND last message was from user:
    Show <LoadingDots> left-aligned

STATE CARDS (between message list and input, animated slideInUp when state changes):

  state === STRUCTURED:
    VeilCard: "Your dream has taken shape."
    VeilButton primary "Interpret this dream" → generateInterpretation()
    VeilButton ghost "Just save it" → skipInterpretation() → saveAndNavigate()

  state === AWAITING_TAROT_DECISION:
    VeilCard with borderColor tokens.gold:
      Ionicons diamond-outline (24px, tokens.gold)
      "Draw a card for final insight" body textPrimary
    VeilButton primary "Draw the Oracle" → router.push('/dream/tarot')
    VeilButton ghost "I'm done" → skipTarot() → saveAndNavigate()

  state === DONE:
    VeilCard: "Your dream is preserved."
    VeilButton primary "Save & view" → saveAndNavigate()
    VeilButton ghost "Discard" → Alert confirm → resetSession() → router.replace('/(tabs)')

  saveAndNavigate = async () => {
    const success = await saveRecord()
    if (success && session.completedRecord?.id) {
      router.replace(`/dream/${session.completedRecord.id}`)
    }
  }

INPUT AREA (paddingHorizontal 16, paddingBottom safe area):
  VeilInput multiline, flex 1
  Ionicons arrow-up-circle-outline (32px, tokens.accent) send button
  Both disabled when isProcessing
  On send: handleUserMessage(inputText) + clear input

When done: git add . && git commit -m "task 4.3: dream capture screen — full conversational flow with streaming"
Output the task report.
```

**Done when:**
- Can type a dream and receive streamed AI responses
- State cards appear at STRUCTURED, AWAITING_TAROT_DECISION, and DONE states
- Keyboard avoiding keeps input above keyboard on iPhone
- Exit dialog appears with "draft saved" message
- `saveAndNavigate()` navigates to the dream detail screen

---

## Task 4.4 — Tarot Drawing Screen
**Attach:** `tokens.ts`, `tarot-data.ts`, `useOrchestrator.ts`, all UI components

```
Build the tarot drawing screen at app/dream/tarot.tsx.

This screen is navigated to from the capture screen when the user taps "Draw the Oracle".
It calls drawTarot() from the orchestrator (pass via React Context or Expo Router shared state).

ANIMATION SEQUENCE using react-native-reanimated:

STEP 1 — FAN ENTRY (on mount):
  Render 22 cards in a semicircular fan arc across the full screen width.
  Each card: width 56, height 90, borderRadius sm.
  Face-down style: backgroundColor surfaceElevated, borderColor border, borderWidth 1.
  Rotations spread evenly from -50deg to +50deg across all 22 cards.
  Cards enter: translateY from screen height to final position, staggered 25ms apart.

STEP 2 — FLOAT (after entry completes, 1500ms delay):
  Each card bobs up and down independently.
  Amplitude: 6px, period: 3000ms. Each card has a random phase offset (0–2π).
  Use withRepeat(withSequence(...)) for each card.

STEP 3 — CARD SELECTED (user taps any card):
  a. All other cards: opacity → 0 + translateY → 60 over 300ms
  b. Selected card:
     - Moves to screen center (layout animation spring)
     - Scales to width 110, height 176 over 400ms
     - Flips: rotateY 0 → 90deg (280ms ease-in)
       Then: swap to face-up content (gold border, card name, arcana number)
       Then: rotateY 90 → 0deg (280ms ease-out)

STEP 4 — REVEAL (after flip):
  Selected card slides to top 32% of screen over 500ms.
  Below card (bottom half):
    Card name: xl, tokens.gold, textAlign center
    Thin horizontal line: width 80, height 1, backgroundColor tokens.gold, marginVertical 16
    StreamingText: tarot interpretation (body, textSecondary, lineHeight relaxed)

  VeilButton primary "Complete" appears after StreamingText onComplete fires.
  On press: router.back()

Connect to orchestrator:
  On mount: call drawTarot() from useOrchestrator (pass via Context).
  drawTarot() sets tarotCard and tarotInterpretation on session.
  Listen to session.tarotCard and session.tarotInterpretation for when to start reveal.

When done: git add . && git commit -m "task 4.4: tarot drawing screen with fan animation and card flip reveal"
Output the task report.
```

**Done when:**
- 22 cards fan in on mount
- Cards float continuously after entry
- Tapping a card triggers flip animation
- Interpretation streams in below the revealed card
- "Complete" button appears only after streaming finishes

---

## Task 4.5 — Dream Detail Screen
**Attach:** `tokens.ts`, `supabase.ts`, all UI components

```
Build the dream detail screen at app/dream/[id].tsx.

DATA:
  const { id } = useLocalSearchParams()
  const [dream, setDream] = useState<DreamRecord | null>(null)
  const [loading, setLoading] = useState(true)
  On mount: supabase.from('dream_records').select('*').eq('id', id).single()
  Loading state: show skeleton (3 animated shimmer rectangles, surfaceElevated bg)
  Error state: VeilText "Dream not found" + VeilButton "Return home" → router.replace('/(tabs)')

LAYOUT (ScrollView, paddingHorizontal 20, paddingBottom 100):

BACK BUTTON: top-left, Ionicons chevron-back, textPrimary, safe area padding

1. HEADER:
   Title: 2xl textPrimary, marginTop 8
   Date: caption textMuted — format as "Thursday, 8 May · 2:34am" using date-fns
   Emotions: horizontal ScrollView, showsHorizontalScrollIndicator false
     Each tag: pill shape, accentSoft bg, accent text, paddingH 10 paddingV 4, borderRadius full

2. NARRATIVE:
   Section label component (reuse): caption textMuted letterSpacing wide marginBottom 8
   narrative text: body textSecondary lineHeight relaxed

3. INTERPRETATION (if interpretation field is non-empty):
   Section label: "Interpretation"
   Parse interpretation into 3 sections by looking for these signal words in the text:
     Jungian / psychological / unconscious → icon: Ionicons layers-outline
     life / waking / connection → icon: Ionicons pulse-outline
     eastern / I Ching / taoism / energy → icon: Ionicons infinite-outline
   Each subsection → VeilCard with icon (20px textMuted) + text (body textSecondary)

4. LIFE CONNECTION (if life_connection_interpretation is non-empty):
   Section label: "Waking Life"
   VeilCard with life_connection_interpretation text

5. TAROT (if tarot_card is non-null):
   Section label: "The Oracle"
   Row: small card (width 72, height 115, gold border) left | card name + interpretation text right
   Card name: body tokens.gold

STICKY BOTTOM BAR (absolute, bottom 0, surface bg, safe area paddingBottom):
  Left: Ionicons share-outline (24px, textSecondary) → share poster (Task 5.2 placeholder for now: Alert "Coming soon")
  Right: Ionicons trash-outline (24px, tokens.error) → Alert confirm → supabase delete → router.replace('/(tabs)/archive')

When done: git add . && git commit -m "task 4.5: dream detail screen with all sections and Supabase data"
Output the task report.
```

**Done when:**
- All sections render correctly from a real Supabase record
- Loading skeleton shows before data arrives
- Delete navigates back to archive
- Screen handles missing optional fields gracefully (no crash if no tarot card)

---

## Task 4.6 — Archive Screen
**Attach:** `tokens.ts`, `supabase.ts`, all UI components

```
Build the archive screen at app/(tabs)/archive.tsx.
Replace the placeholder.

DATA:
  Load dreams on mount and on useFocusEffect (tab re-focus).
  Query: select id, title, created_at, narrative, emotions, tarot_card
         from dream_records where user_id = [current user id]
         order by created_at desc
  Group results by month ("May 2026", "April 2026") for SectionList.

LAYOUT:

HEADER (paddingHorizontal 20, paddingTop safe area):
  "Archive" heading textPrimary left
  Ionicons search-outline (20px, textSecondary) right → toggles search bar

SEARCH BAR (animated height 0 → 48, slide down when search toggled):
  VeilInput autoFocus placeholder "Search your dreams..."
  Filter dreams client-side: title.includes(query) || narrative.includes(query)
  Case-insensitive

DREAM LIST (SectionList):
  Section headers: caption textMuted letterSpacing wide, paddingTop 24 paddingBottom 8
  
  Each dream item (Pressable → router.push('/dream/[id]')):
    VeilCard marginVertical 4:
      Title: body textPrimary
      Date: caption textMuted — "Thu 8 May · 2:34am"
      Narrative preview: caption textMuted, first 70 chars, numberOfLines 1
      Bottom row:
        Emotion chips (first 2 only, small pills accentSoft/accent)
        If tarot_card non-null: small gold dot (6px circle, tokens.gold) aligned right
    Long press → Alert with "Delete" option
      → supabase delete + remove from local state

EMPTY STATE (no dreams at all):
  Ionicons moon-outline 56px textMuted centered
  VeilText "Your dreams will live here." body textMuted
  VeilButton ghost "Record your first dream" → router.push('/dream/capture')

LOADING STATE: 4 skeleton cards (animated shimmer)

When done: git add . && git commit -m "task 4.6: archive screen — grouped list, search, delete, empty state"
Output the task report.
```

**Done when:**
- Dreams load and display grouped by month
- Search filters correctly in real time
- Long-press delete works and updates the list
- Empty state shows when no dreams exist
- Screen re-fetches on tab focus

---

## Task 4.7 — Profile Screen
**Attach:** `tokens.ts`, `supabase.ts`, all UI components

```
Build the profile screen at app/(tabs)/profile.tsx.
Replace the placeholder.

DATA (load on mount):
  Supabase aggregate query:
    select
      count(*) as total,
      count(*) filter (where created_at >= date_trunc('month', now())) as this_month,
      count(*) filter (where tarot_card is not null) as with_tarot
    from dream_records where user_id = [current user id]

SECTIONS (ScrollView paddingHorizontal 20):

1. USER HEADER (paddingTop safe area + 24, paddingBottom 24):
   Avatar: 64px circle
     If Clerk user has profileImageUrl → show Image
     Else → circle with accentSoft bg, first letter of name in accent color (heading size)
   Display name: heading textPrimary, marginTop 12
   Email or "Guest": caption textMuted
   If guest (check AsyncStorage 'veil_guest'): VeilButton primary "Create Account" → sign-in

2. STATS ROW (3 equal-width VeilCards in a row, marginBottom 32):
   Card 1: total count (2xl textPrimary) + "dreams" (caption textMuted)
   Card 2: this_month count + "this month"
   Card 3: with_tarot count + "with oracle"

3. SETTINGS (VeilCard, each row borderBottom tokens.border):
   Row: "Notifications" left + "Coming soon" (caption textMuted) right
   Row: "Privacy Policy" left + Ionicons chevron-forward right
     → Linking.openURL('https://your-privacy-policy-url') placeholder
   Row: "Export dreams" left + Ionicons download-outline right
     → Fetch all records → JSON.stringify → expo-sharing shareAsync as "veil-dreams.json"

4. ACCOUNT (marginTop 32):
   VeilButton ghost "Sign out" → Clerk signOut() → router.replace('/(auth)/sign-in')
   Pressable "Delete account" caption tokens.error centered marginTop 20
     → Alert confirm "This will permanently delete all your dreams."
     → supabase delete all records for user → Clerk user.delete() → router.replace('/(auth)/sign-in')

5. FOOTER (marginTop 40 marginBottom 40):
   "Veil · v1.0.0" caption textMuted centered
   "Dreams are personal echoes. Veil provides reflections, not diagnoses." caption textMuted centered marginTop 6

When done: git add . && git commit -m "task 4.7: profile screen — stats, settings, export, sign out, delete account"
Output the task report.
```

**Done when:**
- Stats load from Supabase and display correctly
- Export produces a downloadable JSON file
- Sign out clears auth and navigates to sign-in
- Delete account confirmation dialog appears before any destructive action

---

# PHASE 5 — Polish, Security & App Store Prep
**Goal:** Production-ready. Secure. Nothing causes App Store rejection.
**Branch:** `phase/5-polish`

---

## Task 5.1 — API Rate Limiting & Security
**Attach:** `app/api/dream-chat+api.ts` (from Task 1.7)

```
Harden the LLM API route at app/api/dream-chat+api.ts.

Install: @clerk/backend

Add these 4 layers in order at the top of the POST handler:

1. AUTH CHECK:
   const authHeader = request.headers.get('Authorization')
   const token = authHeader?.replace('Bearer ', '')
   if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
   
   const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
   try {
     const payload = await clerk.verifyToken(token)
     userId = payload.sub
   } catch {
     return Response.json({ error: 'Unauthorized' }, { status: 401 })
   }

2. RATE LIMITING (in-memory Map, resets on server restart — acceptable for now):
   const rateLimit = new Map<string, { count: number; resetAt: number }>()
   MAX_REQUESTS = 30 per hour per userId
   Check and increment on each request.
   If exceeded: return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
   Add headers: X-RateLimit-Remaining, X-RateLimit-Reset

3. INPUT VALIDATION:
   messages: must be array, max 50 items, each content max 2000 chars
   temperature: clamp to [0, 1] with Math.min/Math.max
   If invalid: return Response.json({ error: 'Invalid request' }, { status: 400 })

4. ERROR SAFETY:
   Entire Kimi API call in try/catch.
   Log full error server-side (console.error).
   Return only: Response.json({ error: 'Something went wrong' }, { status: 500 })
   Never forward raw API error to client.

Also add CLERK_SECRET_KEY=your_clerk_secret to .env.local as a placeholder.

When done: git add . && git commit -m "task 5.1: API route hardening — auth check, rate limiting, input validation"
Output the task report.
```

**Done when:**
- Missing/invalid token → 401
- 31st request in an hour → 429
- messages array with 51 items → 400
- Raw Kimi error never reaches the client response

---

## Task 5.2 — Share Poster (Server-Side)
**Attach:** `tokens.ts`, `app/dream/[id].tsx`

```
Create a server-side share poster generator.

Install: satori @resvg/resvg-js

1. Create app/api/generate-poster+api.ts:
   POST accepts: { title, narrative, tarotCard, emotions, date }
   
   Use satori to render this layout at 1080x1920px:
     Background rect: #0A0A0F fill
     10–15 small white circles (2–4px radius) at random positions: opacity 0.1–0.25
     Top-left: "Veil" text — white, 28px, letterSpacing 6
     Top-right: date string — #55556A, 18px
     Center (y: 35–65% of height):
       Title — white, 52px, textAlign center, maxWidth 900
       Narrative preview (first 120 chars) — #8888AA, 24px, maxWidth 820, lineHeight 1.6, marginTop 20
     If tarotCard provided:
       Horizontal line: width 120, height 1, fill #C9A84C, y: 68%
       Card name: #C9A84C, 22px, letterSpacing 3, textTransform uppercase
     Bottom center: "veil" — #2A2A3F, 14px
   
   Convert SVG → PNG using resvg.
   Return: Response with PNG buffer, Content-Type: image/png

2. Update app/dream/[id].tsx share button:
   Replace "Coming soon" Alert with:
   a. Set share button to loading state
   b. POST to /api/generate-poster with dream data
   c. Write PNG to cache: expo-file-system FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' })
   d. Request permission: expo-media-library MediaLibrary.requestPermissionsAsync()
   e. Save to camera roll: MediaLibrary.saveToLibraryAsync(filePath)
   f. Share: expo-sharing Sharing.shareAsync(filePath)
   g. Clear loading state

When done: git add . && git commit -m "task 5.2: server-side share poster with satori, saves to camera roll"
Output the task report.
```

**Done when:**
- Tapping Share on a dream generates a poster
- Poster saves to Camera Roll on a real iPhone
- Share sheet opens with the image
- Loading state shows on share button during generation

---

## Task 5.3 — Onboarding Flow
**Attach:** `tokens.ts`, all UI components

```
Build the onboarding screen at app/onboarding.tsx.
Shown only on first launch (AsyncStorage 'veil_onboarded' not set).

Use react-native-pager-view for 3 pages.

PAGE 1:
  Animated pulsing circle: width/height 120, borderRadius 60,
  backgroundColor tokens.accent, opacity 0.6
  Scale 1.0 → 1.1 → 1.0 every 3000ms, loops (react-native-reanimated)
  "Capture before it fades" — heading textPrimary, textAlign center, marginTop 32
  "Describe whatever fragments remain. Veil asks gentle questions to help you reconstruct."
    body textSecondary, maxWidth 280, textAlign center, marginTop 12

PAGE 2:
  Ionicons diamond-outline, 64px, tokens.gold, centered
  "Understand what it means" — heading textPrimary
  "Jungian analysis, life connections, and Tarot guidance — layered interpretation, not diagnosis."
    body textSecondary, maxWidth 280, textAlign center

PAGE 3:
  Ionicons lock-closed-outline, 64px, tokens.accent
  "Your dreams, privately kept" — heading textPrimary
  "Everything stays in your private account. We never read your dreams."
    body textSecondary, maxWidth 280
  VeilButton primary "Begin" marginTop 32
    → AsyncStorage.setItem('veil_onboarded', 'true')
    → router.replace('/(auth)/sign-in')

UI CHROME (all pages):
  Skip button top-right (pages 1 and 2 only): caption textMuted → jumps to page 3
  3 progress dots bottom-center:
    8px circles, tokens.accent if active, tokens.textMuted if inactive
    Tappable (navigate to that page)
  Background: tokens.background all pages

When done: git add . && git commit -m "task 5.3: 3-page onboarding with pager, animations, first-launch gate"
Output the task report.
```

**Done when:**
- Shows on first launch only
- Skip button works on pages 1 and 2
- Progress dots update on page change
- "Begin" sets the AsyncStorage flag
- Never appears again after "Begin" is tapped

---

## Task 5.4 — Error Boundaries & Crash Handling
**Attach:** `tokens.ts`, all UI components, `useOrchestrator.ts`

```
Add error handling throughout the app.

1. Create src/components/ErrorBoundary.tsx (class component — required for error boundaries):
   getDerivedStateFromError: set hasError = true
   componentDidCatch: console.error the error
   Fallback render:
     tokens.background fill, flex 1, centered content
     Ionicons moon-outline 48px textMuted
     "Something went quiet." — heading textPrimary marginTop 20
     "Veil encountered an unexpected issue." — body textSecondary marginTop 8
     VeilButton primary "Return home" marginTop 32
       → this.setState({ hasError: false }) + router.replace('/(tabs)')

2. Wrap entire app in app/_layout.tsx:
   <ErrorBoundary>
     <ClerkProvider>...
   </ErrorBoundary>

3. Update src/lib/useOrchestrator.ts:
   Add to session state: error: string | null (default null)
   In every existing catch block, replace console.error with:
     updateSession({ error: 'The connection wavered. Please try again.' })
   Export: clearError: () => updateSession({ error: null })

4. Update app/dream/capture.tsx:
   useEffect watching session.error:
     When non-null → show <Toast type="error" message={session.error} visible={true}
       onDismiss={clearError} />
   
   After LoadingDots: if isProcessing is false AND last message contains "went wrong":
     Show small "Try again" Pressable (caption tokens.accent)
     On press: retry the appropriate orchestrator function based on current session.state

When done: git add . && git commit -m "task 5.4: error boundary, orchestrator error state, capture screen error toast"
Output the task report.
```

**Done when:**
- Forcing a render crash shows the friendly error screen (test by throwing in a child component)
- A failed API call shows the error toast in capture screen
- Toast dismisses and clears error state
- "Try again" appears after a failed AI response

---

## Task 5.5 — App Store Config & Build Setup
**Attach:** nothing

```
Configure Veil for App Store submission.

1. Update app.json ios section:
   bundleIdentifier: "com.veil.dreamapp"
   buildNumber: "1"
   supportsTablet: false
   requiresFullScreen: true
   infoPlist:
     NSFaceIDUsageDescription: "Face ID is used to securely authenticate your account."
     NSPhotoLibraryAddUsageDescription: "Veil saves your dream posters to your photo library."
     UIStatusBarStyle: "UIStatusBarStyleLightContent"
     UIViewControllerBasedStatusBarAppearance: false
   minimumOsVersion: "16.0"

2. Create eas.json:
   {
     "cli": { "version": ">= 10.0.0" },
     "build": {
       "preview": {
         "distribution": "internal",
         "ios": { "simulator": false }
       },
       "production": {
         "ios": { "autoIncrement": true }
       }
     },
     "submit": { "production": {} }
   }

3. Update package.json:
   name: "veil"
   version: "1.0.0"
   description: "An AI-native dream journaling app"

4. Create .env.production (template only — no real values, never commit real keys):
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_ANON_KEY=
   KIMI_API_KEY=
   CLERK_SECRET_KEY=

5. Ensure .gitignore includes: .env.local .env.production

When done: git add . && git commit -m "task 5.5: app.json iOS config, eas.json build profiles, package metadata"
Output the task report.
```

**Done when:**
- `package.json` name is "veil"
- `app.json` has all `infoPlist` privacy strings
- `eas.json` has preview and production profiles
- `.env.production` exists with empty placeholders
- `.gitignore` covers both env files

---

## Task 5.6 — Final Cleanup
**Attach:** nothing (Claude Code reads project files directly)

```
Final cleanup pass across the entire Veil project.

1. Fix tarot count: verify src/data/tarot-data.ts has exactly 22 cards.
   Run: node -e "const d = require('./src/data/tarot-data'); console.log(d.cards.length)"
   If not 22, fix it.

2. TypeScript: run tsc --noEmit and fix ALL type errors. Zero errors required.

3. ESLint: run npx eslint src/ app/ and fix all warnings in production code paths.

4. TODO audit: grep -r "TODO\|FIXME\|PLACEHOLDER\|Coming soon" src/ app/
   For each hit:
   - If it's a stub that should be working code by now: implement it
   - If it's intentionally deferred: convert to a code comment: // DEFERRED: [reason]

5. Update README.md:
   - Title: "Veil — A Space for Your Dreams"
   - Accurate tech stack: Expo (React Native), Clerk, Supabase, Kimi LLM
   - Remove all references to Next.js
   - Environment variables table
   - Local dev setup: clone → npm install → fill .env.local → npx expo start
   - iOS build: eas build --platform ios --profile preview
   - "Dreams are personal echoes. Veil provides reflections, not diagnoses."

When done: git add . && git commit -m "task 5.6: final cleanup — tsc clean, eslint clean, README updated"
Output the task report.
```

**Done when:**
- `tsc --noEmit` produces zero errors
- No TODO/FIXME in production code paths
- README accurately describes the Expo stack
- Tarot count confirmed as 22

---

# PHASE 6 — Pre-Submission Checklist
*Verification only — no Claude Code prompts. Do these manually.*

## App Store Compliance
- [ ] Apple Sign-In present and working end-to-end
- [ ] Privacy Policy page exists (Notion / GitHub Pages) — URL added to Profile screen + App Store Connect
- [ ] App Privacy Nutrition Label filled in App Store Connect (dreams = linked to user, no tracking)
- [ ] No placeholder text visible in any screen (grep for "placeholder", "TODO", "coming soon")
- [ ] iOS minimum 16.0 set ✓
- [ ] `supportsTablet: false` ✓
- [ ] App name "Veil" not trademarked in Health & Fitness category — verify at trademarkia.com
- [ ] 6.7" and 6.1" screenshots ready (iPhone 15 Pro Max + iPhone 15)
- [ ] Age rating: 4+ — note in App Review Notes

## Real Device Testing
- [ ] Full dream capture flow on physical iPhone
- [ ] Tarot animation smooth at 60fps on device (not just simulator)
- [ ] Keyboard avoiding correct on iPhone SE (smallest screen)
- [ ] Draft restores after force-quit
- [ ] Share poster generates, saves to Photos, share sheet opens
- [ ] Sign in with Apple works end-to-end
- [ ] Sign out → sign back in → archive restores from Supabase
- [ ] App captures dream with no internet connection (offline mode)
- [ ] App resumes correctly after 30 minutes in background

---

## Git Strategy

```
main
├── phase/1-bootstrap   → merge → tag v0.1.0
├── phase/2-logic       → merge → tag v0.2.0
├── phase/3-architecture → merge → tag v0.3.0
├── phase/4-screens     → merge → tag v0.4.0
└── phase/5-polish      → merge → tag v1.0.0-rc
```

Push each phase branch after all tasks pass. Merge to main after phase is verified. Never push directly to main.

---

*Last updated: May 11, 2026*
*Based on: github.com/violawuhoo/dream-app — useOrchestrator.ts · dream-model.ts · route.ts*
