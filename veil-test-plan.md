# Veil — Test Plan (Phases 1–5)
**App:** Veil — AI-native dream journaling iOS app  
**Stack:** React Native (Expo) · Clerk Auth · Supabase · Kimi LLM  
**Codebase:** `veil/` in the worktree at `.claude/worktrees/ecstatic-wright-f35d5a/veil/`  
**Test environment:** Live credentials (Clerk + Supabase + Kimi). Simulator first; real device for device-only features.  
**Coverage types:** Jest unit tests · API/security (curl) · Detox E2E · Manual exploratory

---

## Prerequisites

Before running anything, confirm these are ready:

- `.env.local` has real values for all five keys (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `KIMI_API_KEY`, `CLERK_SECRET_KEY`)
- `npx expo start` runs without errors on an iOS 16+ simulator
- A test Supabase user exists (or can be created via Clerk OAuth in the simulator)
- Jest and Detox are installed (`npm install --save-dev jest @testing-library/react-native detox`)
- A valid Clerk short-lived token is available for API tests (obtain via the running app or Clerk dashboard)

---

## Section 1 — Jest Unit Tests

> **Run with:** `npx jest --testPathPattern="src/"` from `veil/`
> 
> Create test files under `src/__tests__/` unless noted otherwise.

---

### 1.1 Tarot Data (`src/data/tarot-data.ts`)

**File:** `src/__tests__/tarot-data.test.ts`

| # | Test name | What to assert |
|---|-----------|----------------|
| 1.1.1 | Card count is exactly 22 | `cards.length === 22` |
| 1.1.2 | No duplicate IDs | All `card.id` values are unique |
| 1.1.3 | Cards span IDs 0–21 | IDs sorted equal `[0,1,…,21]` |
| 1.1.4 | Each card has id, name, meaning | Every entry has non-empty strings for all three fields |
| 1.1.5 | `getRandomTarotCard()` returns a valid card | Return value is one of the 22 named cards; call 100 times, all results are valid |
| 1.1.6 | `console.assert` at module load does not fire | No assertion error thrown when module is imported |

---

### 1.2 Dream Model (`src/lib/dream-model.ts`)

**File:** `src/__tests__/dream-model.test.ts`

| # | Test name | What to assert |
|---|-----------|----------------|
| 1.2.1 | `DreamFlowState` has exactly 11 values | `Object.keys(DreamFlowState).length === 11` |
| 1.2.2 | `createSession()` default state is `RAW` | `session.state === 'RAW'` |
| 1.2.3 | `createSession()` generates a unique `sessionID` each call | Two calls produce different `sessionID` values |
| 1.2.4 | `createSession()` initialises arrays as empty | `messages`, `rawEntries`, `askedQuestions` are `[]` |
| 1.2.5 | `createSession()` sets `nextCheckTurn` to 5 | `session.nextCheckTurn === 5` |
| 1.2.6 | `createDreamRecord()` maps `summary` → `narrative` | Pass `{ summary: "foo" }`, expect `record.narrative === "foo"` |
| 1.2.7 | `createDreamRecord()` maps `lifeConnectionInterpretation` | Pass the camelCase key, expect snake_case key populated |
| 1.2.8 | `createDreamRecord()` maps `tarotCard` → `tarot_card` | Pass `tarotCard: { id: 0, name: "The Fool" }`, expect `record.tarot_card` set |
| 1.2.9 | `createDreamRecord()` generates a UUID `id` when omitted | `record.id` matches UUID regex |
| 1.2.10 | `DreamRecord` type is exported | TypeScript: `import type { DreamRecord }` compiles without error |

---

### 1.3 LLM Client (`src/lib/llm-client.ts`)

**File:** `src/__tests__/llm-client.test.ts`  
**Setup:** Mock `global.fetch` for all tests in this file.

| # | Test name | What to assert |
|---|-----------|----------------|
| 1.3.1 | `callLLM` sends Authorization header | `fetch` called with `Authorization: Bearer <token>` |
| 1.3.2 | `callLLM` sends messages and temperature in body | Request body JSON parsed; `messages` and `temperature` present |
| 1.3.3 | `callLLM` yields text from SSE chunks | Mock a ReadableStream with two `data:` lines + `data: [DONE]`; assert two chunks yielded |
| 1.3.4 | `callLLM` skips malformed SSE lines | Include a non-JSON `data:` line; generator should not throw, continues to next valid chunk |
| 1.3.5 | `callLLM` retries once on first failure | First fetch throws; second fetch succeeds; assert `fetch` called twice |
| 1.3.6 | `callLLM` throws after two failures | Both fetches throw; assert generator throws on iteration |
| 1.3.7 | `callLLMFull` accumulates all chunks | Three mock chunks yield `"abc"`; `callLLMFull` returns `"abc"` |
| 1.3.8 | Temperature is passed through correctly | Call `callLLM(msgs, 0.3, getToken)`; assert body `temperature === 0.3` |

---

### 1.4 Orchestrator State Machine (`src/lib/useOrchestrator.ts`)

**File:** `src/__tests__/useOrchestrator.test.ts`  
**Setup:** Use `@testing-library/react-hooks` (or `renderHook` from `@testing-library/react-native`). Mock `callLLM` and `callLLMFull` to resolve instantly. Mock `supabase.from().upsert()` to resolve `{ error: null }`. Mock `SecureStore.deleteItemAsync` to resolve.

| # | Test name | What to assert |
|---|-----------|----------------|
| 1.4.1 | Initial state is `RAW`, `userTurnCount` is 0 | `session.state === 'RAW'`, `session.userTurnCount === 0` |
| 1.4.2 | `handleUserMessage` increments `userTurnCount` | After one call, `session.userTurnCount === 1` |
| 1.4.3 | Empty string message is ignored | `handleUserMessage("")` does not change `messages` |
| 1.4.4 | `isProcessing` is true during processing | Set to `true` when `handleUserMessage` is awaited; `false` after |
| 1.4.5 | State transitions RAW → EXPANDING on first follow-up | After first message, mock LLM returns; `session.state === 'EXPANDING'` |
| 1.4.6 | `nextCheckTurn` gate: no continue-check before turn 5 | Send 3 messages, assert state is NOT `AWAITING_CONTINUE_DECISION` |
| 1.4.7 | State transitions to `AWAITING_CONTINUE_DECISION` at turn 5 | Send 4 messages, then send a short non-done phrase; mock `checkIntent` to return `false`; state becomes `AWAITING_CONTINUE_DECISION` |
| 1.4.8 | "Done" keyword at turn ≥ 4 calls `checkIntent` | Mock `callLLMFull` for intent classification; send "done" as 5th message; assert `callLLMFull` called |
| 1.4.9 | `proceedToStructuring` sets state to `STRUCTURED` | Call directly; assert `session.state === 'STRUCTURED'` |
| 1.4.10 | `generateInterpretation` sets state to `INTERPRETING` then `AWAITING_LIFE_CONNECTION` | Call, await; assert final state |
| 1.4.11 | `handleLifeConnection` sets state to `AWAITING_TAROT_DECISION` | Provide a life connection string; assert final state |
| 1.4.12 | `drawTarot` sets state to `DONE` | Call, await; assert `session.state === 'DONE'` and `session.tarotCard` non-null |
| 1.4.13 | `skipTarot` sets state to `DONE` immediately | Synchronous; no LLM call |
| 1.4.14 | `skipInterpretation` sets state to `DONE` immediately | Synchronous; no LLM call |
| 1.4.15 | `saveRecord` calls Supabase upsert with `user_id` | Assert `supabase.from('dream_records').upsert` called with `user_id` matching the param |
| 1.4.16 | `saveRecord` deletes SecureStore draft on success | Assert `SecureStore.deleteItemAsync('veil_draft_session')` called |
| 1.4.17 | `saveRecord` returns `false` on Supabase error | Mock `upsert` to return `{ error: new Error("db error") }`; assert `saveRecord()` resolves to `false` |
| 1.4.18 | `resetSession` returns state to `RAW` with fresh ID | `session.state === 'RAW'`, new `sessionID` |
| 1.4.19 | LLM error sets `error` state string | Mock `callLLM` to throw; assert `session.error` is non-null |
| 1.4.20 | `clearError` sets `error` to null | After LLM error, call `clearError()`; assert `error === null` |
| 1.4.21 | `initialSession` param is used as initial state | Pass a pre-built session; assert `session.sessionID` matches |

---

### 1.5 Draft Restore (`src/lib/useDraftRestore.ts`)

**File:** `src/__tests__/useDraftRestore.test.ts`  
**Setup:** Mock `expo-secure-store`.

| # | Test name | What to assert |
|---|-----------|----------------|
| 1.5.1 | `hasDraft` is false when SecureStore is empty | Mock `getItemAsync` to return `null`; assert `hasDraft === false` |
| 1.5.2 | `hasDraft` is true for a draft < 24h old | Mock `getItemAsync` to return a session JSON with `created_at = now - 1h`; assert `hasDraft === true` |
| 1.5.3 | `hasDraft` is false for a draft > 24h old | `created_at = now - 25h`; assert `hasDraft === false` |
| 1.5.4 | `discardDraft` calls `deleteItemAsync` | Call `discardDraft()`; assert `SecureStore.deleteItemAsync('veil_draft_session')` called |

---

### 1.6 Theme Tokens (`src/theme/tokens.ts`)

**File:** `src/__tests__/tokens.test.ts`

| # | Test name | What to assert |
|---|-----------|----------------|
| 1.6.1 | All 13 color tokens exist | Check `background`, `surface`, `surfaceElevated`, `border`, `textPrimary`, `textSecondary`, `textMuted`, `accent`, `accentSoft`, `gold`, `goldSoft`, `error`, `success` |
| 1.6.2 | All color values are valid hex strings | Each color matches `/^#[0-9A-Fa-f]{6}$/` |
| 1.6.3 | Font size scale has 8 entries | `xs sm base md lg xl 2xl 3xl` all present |
| 1.6.4 | Spacing array has 10 values | `tokens.spacing.length === 10` |

---

## Section 2 — API & Security Tests

> **Run with:** `curl` or a script. The Expo dev server must be running (`npx expo start`) with a valid `.env.local`.  
> Replace `<VALID_TOKEN>` with a real Clerk session token obtained from a signed-in app session.  
> Replace `<SERVER>` with the local dev server URL (e.g., `http://localhost:8081`).

---

### 2.1 Authentication (`POST /api/dream-chat`)

| # | Test | Command | Expected |
|---|------|---------|----------|
| 2.1.1 | No auth header → 401 | `curl -s -o /dev/null -w "%{http_code}" -X POST <SERVER>/api/dream-chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"hello"}]}'` | `401` |
| 2.1.2 | Malformed token → 401 | Same as above but add `-H "Authorization: Bearer not-a-real-token"` | `401` |
| 2.1.3 | Valid token → 200 / streaming response | Use `<VALID_TOKEN>`; add short messages array | `200`, `Content-Type: text/event-stream` |
| 2.1.4 | Raw Kimi error never leaks | Break KIMI_API_KEY temporarily; make valid authenticated request | Response body is `{"error":"Something went wrong"}`, NOT a Kimi error string |

---

### 2.2 Rate Limiting (`POST /api/dream-chat`)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.2.1 | 30th request succeeds | Send 30 valid requests with the same user token (automate with a loop) | All 30 return `200`; `X-RateLimit-Remaining: 0` on the 30th |
| 2.2.2 | 31st request returns 429 | Send one more request immediately after | `429`, body `{"error":"Rate limit exceeded"}` |
| 2.2.3 | Rate-limit headers present on every response | Inspect headers on request #1 | `X-RateLimit-Remaining` and `X-RateLimit-Reset` both present |

---

### 2.3 Input Validation (`POST /api/dream-chat`)

| # | Test | Payload | Expected |
|---|------|---------|----------|
| 2.3.1 | messages array with 51 items → 400 | `{ "messages": [ ...51 items... ] }` | `400`, `{"error":"Invalid request"}` |
| 2.3.2 | messages is a string, not an array → 400 | `{ "messages": "hello" }` | `400` |
| 2.3.3 | One message content exceeds 2000 chars → 400 | Single message with 2001-char content string | `400` |
| 2.3.4 | temperature clamped: pass 5 → clamp to 1 | `{ "messages": [...], "temperature": 5 }` with valid auth | `200` (no error); verify upstream receives `temperature: 1` via server log |
| 2.3.5 | temperature clamped: pass -1 → clamp to 0 | `"temperature": -1` | `200` |
| 2.3.6 | Malformed JSON body → 400 | Send `Content-Type: application/json` with body `{bad json}` | `400` |

---

### 2.4 Poster Generation (`POST /api/generate-poster`)

| # | Test | Notes | Expected |
|---|------|-------|----------|
| 2.4.1 | Valid payload returns PNG | `{ title, narrative, date, emotions }` with auth | `200`, `Content-Type: image/png`, non-empty body |
| 2.4.2 | No auth → 401 | Same payload, no Authorization header | `401` |
| 2.4.3 | Payload without tarotCard still succeeds | Omit `tarotCard` field entirely | `200`, PNG rendered without gold line |
| 2.4.4 | Very long narrative truncated, no crash | Send 500+ char narrative | `200`, valid PNG |

---

## Section 3 — Detox E2E Tests

> **Setup:**  
> 1. `npx detox build --configuration ios.sim.debug`  
> 2. `npx detox test --configuration ios.sim.debug`  
> All tests run on the iOS 16+ simulator.  
> The app must be freshly installed (clear AsyncStorage / SecureStore) before each suite via `device.clearKeychain()` and a fresh install.

---

### 3.1 First Launch & Onboarding

**File:** `e2e/onboarding.test.ts`

| # | Test | Steps | Assert |
|---|------|-------|--------|
| 3.1.1 | Onboarding appears on first launch | Fresh install, launch app | Screen with pulsing circle and "Capture before it fades" is visible |
| 3.1.2 | Skip button jumps to page 3 | Tap "Skip" on page 1 | Page 3 content ("Your dreams, privately kept") is visible |
| 3.1.3 | Progress dots update on swipe | Swipe to page 2 | Dot 2 is active (accent color) |
| 3.1.4 | "Begin" sets onboarded flag and navigates to sign-in | Navigate to page 3, tap "Begin" | Sign-in screen appears |
| 3.1.5 | Onboarding does not appear on second launch | Tap "Begin", force-quit, relaunch | Sign-in screen shown directly (no onboarding) |

---

### 3.2 Authentication

**File:** `e2e/auth.test.ts`

| # | Test | Steps | Assert |
|---|------|-------|--------|
| 3.2.1 | Sign-in screen shows Apple and Google buttons | Navigate to sign-in | Both buttons visible |
| 3.2.2 | Guest mode navigates to tabs | Tap "Enter as a Guest" | Bottom tab bar with 3 tabs visible |
| 3.2.3 | Unauthenticated deep-link to `/dream/capture` redirects to sign-in | Launch with deep link while not signed in | Sign-in screen shown |
| 3.2.4 | Sign-out navigates to sign-in | Profile → "Sign out" | Sign-in screen appears; tab bar hidden |
| 3.2.5 | Star field animation is rendering | Sign-in screen loaded | At least one animated element visible in the top 40% of screen |

---

### 3.3 Dream Capture Flow (Happy Path)

**File:** `e2e/capture.test.ts`

This suite requires a signed-in user (set up in `beforeAll` via Guest mode).

| # | Test | Steps | Assert |
|---|------|-------|--------|
| 3.3.1 | Tap moon button navigates to capture screen | Home → tap moon | Capture screen header "Veil" visible |
| 3.3.2 | Typing and sending a message adds user bubble | Type "I was flying over a city", tap send | User bubble with that text appears |
| 3.3.3 | AI response appears (streaming) | After sending first message | Assistant bubble appears within 15s (use `waitFor` with 15000ms timeout) |
| 3.3.4 | Send button is disabled while processing | Tap send, immediately inspect send button | Send button is disabled / not tappable |
| 3.3.5 | State card appears at STRUCTURED | Continue conversation until "Your dream has taken shape" card appears | Card with "Interpret this dream" button visible |
| 3.3.6 | "Just save it" → DONE state card | Tap "Just save it" | "Your dream is preserved" card visible |
| 3.3.7 | "Save & view" navigates to dream detail | Tap "Save & view" | Dream detail screen with a title visible |
| 3.3.8 | Exit dialog warns about draft | Tap close icon | Alert "Exit? Your draft is saved automatically." appears |
| 3.3.9 | Cancelling exit stays on capture | Tap "Cancel" in alert | Capture screen still shown |

---

### 3.4 Tarot Drawing Flow

**File:** `e2e/tarot.test.ts`

| # | Test | Steps | Assert |
|---|------|-------|--------|
| 3.4.1 | 22 card elements are rendered on mount | Navigate to tarot screen (after reaching `AWAITING_TAROT_DECISION`) | 22 card elements present in the fan |
| 3.4.2 | Tapping a card hides the other 21 | Tap the 5th card | Only 1 card remains visible (others opacity 0) |
| 3.4.3 | Card name appears after flip | Wait for flip animation (1500ms) | Gold text with a tarot card name visible |
| 3.4.4 | Streaming interpretation text appears | After card flip | Body text below card is non-empty and growing |
| 3.4.5 | "Complete" button only appears after streaming ends | During streaming | Button NOT visible; after streaming finishes — button IS visible |
| 3.4.6 | "Complete" returns to capture screen | Tap "Complete" | Capture screen shown with DONE state card |

---

### 3.5 Archive Screen

**File:** `e2e/archive.test.ts`  
Precondition: At least one dream saved.

| # | Test | Steps | Assert |
|---|------|-------|--------|
| 3.5.1 | Dreams listed grouped by month | Navigate to Archive tab | Section header with current month ("May 2026") visible |
| 3.5.2 | Tapping a dream opens detail | Tap the first dream card | Dream detail screen opens |
| 3.5.3 | Search filters results | Tap search icon, type a word from a dream title | Only matching dreams visible |
| 3.5.4 | Search with no match shows empty list | Type a nonsense string | All dream cards hidden (empty or "no results") |
| 3.5.5 | Long-press delete shows alert | Long-press a dream card | Alert with "Delete" option appears |
| 3.5.6 | Confirming delete removes card from list | Tap "Delete" in alert | Card no longer present in list |
| 3.5.7 | Empty state shows on fresh account | Delete all dreams | Moon icon + "Your dreams will live here." text visible |

---

### 3.6 Dream Detail Screen

**File:** `e2e/dreamDetail.test.ts`

| # | Test | Steps | Assert |
|---|------|-------|--------|
| 3.6.1 | All content sections render | Open a dream that went through full flow (interpretation + life connection + tarot) | Title, date, emotions, Narrative, Interpretation, Waking Life, and Oracle sections all visible |
| 3.6.2 | Missing tarot section handled gracefully | Open a dream saved with "Just save it" (no tarot) | Screen renders without crash; no Oracle section |
| 3.6.3 | Delete navigates to archive | Tap trash icon, confirm | Archive screen shown; deleted dream absent from list |
| 3.6.4 | Back button returns to previous screen | Tap chevron-back | Previous screen (archive or capture) visible |
| 3.6.5 | Loading skeleton appears before data | Navigate to dream detail | Shimmer rectangles visible briefly before content |

---

### 3.7 Profile Screen

**File:** `e2e/profile.test.ts`

| # | Test | Steps | Assert |
|---|------|-------|--------|
| 3.7.1 | Stats row shows 3 metric cards | Navigate to Profile | Three VeilCards with numeric values visible |
| 3.7.2 | Guest user sees "Create Account" button | Sign in as guest, go to Profile | "Create Account" button visible |
| 3.7.3 | Sign out clears session | Tap "Sign out" | Sign-in screen shown |
| 3.7.4 | Delete account confirmation shown | Tap "Delete account" | Alert "This will permanently delete all your dreams." appears |
| 3.7.5 | Export dreams button is accessible | Tap "Export dreams" | Share sheet or file-save dialog appears (no crash) |

---

### 3.8 Offline Draft Restore

**File:** `e2e/draft.test.ts`

| # | Test | Steps | Assert |
|---|------|-------|--------|
| 3.8.1 | Draft saved after partial session | Start a capture, type 2 messages, force-quit (`device.terminateApp()`), relaunch | Home screen shows draft restore card |
| 3.8.2 | Draft age shown correctly | Draft is < 1h old | Card shows "0 hours ago" or "less than an hour ago" |
| 3.8.3 | "Continue" restores session messages | Tap "Continue" on draft card | Capture screen opens with previous messages visible |
| 3.8.4 | "Start fresh" discards draft | Tap "Start fresh" | Draft card disappears; capture screen fresh if opened |
| 3.8.5 | Completing a session clears draft | Save a dream after continuing from draft | Home screen shows no draft card after save |

---

## Section 4 — Manual Exploratory Testing

> **Format:** Each item is a checklist step. Tick off when passing.  
> Simulator: items marked (SIM). Physical iPhone only: items marked (DEVICE).

---

### 4.1 Animations & Visual Polish

| # | Item | Platform |
|---|------|----------|
| 4.1.1 | Sign-in star field: dots drift upward continuously and wrap to bottom | SIM |
| 4.1.2 | Home orb: pulsing scale animation runs at steady pace, no jank | SIM |
| 4.1.3 | Onboarding page 1: circle pulses gently | SIM |
| 4.1.4 | `LoadingDots` component animates three dots sequentially when LLM is processing | SIM |
| 4.1.5 | `StreamingText` reveals text gradually (not all at once) in capture screen | SIM |
| 4.1.6 | `VeilButton` press animates to scale 0.96 and back | SIM |
| 4.1.7 | `VeilCard` press (when `onPress` provided) animates scale | SIM |
| 4.1.8 | Toast slides in from top and auto-dismisses after 4 seconds | SIM |
| 4.1.9 | State cards on capture screen slide in with animation on state change | SIM |
| 4.1.10 | Tarot fan entry: 22 cards stagger in from bottom | SIM |
| 4.1.11 | Tarot float: all 22 cards bob with independent phase offsets | SIM |
| 4.1.12 | Tarot card flip: rotateY 0→90→0 is smooth with face-down / face-up swap midpoint | SIM |
| 4.1.13 | Tarot animation is smooth at 60fps (no dropped frames visible) | DEVICE |

---

### 4.2 Keyboard & Layout

| # | Item | Platform |
|---|------|----------|
| 4.2.1 | Capture screen: keyboard pushes input above the keyboard (not hidden behind it) on iPhone 15 | SIM |
| 4.2.2 | Capture screen: same behavior on iPhone SE 3rd gen (smallest screen) | SIM |
| 4.2.3 | `VeilInput` multiline: grows from 120px minimum, stops at 300px maximum | SIM |
| 4.2.4 | Character count appears within 20 chars of `maxLength` | SIM |
| 4.2.5 | Archive search bar animates down when tapped, collapses on close | SIM |
| 4.2.6 | Status bar is light (white icons) on all dark screens | SIM |
| 4.2.7 | Safe area respected on all screens (nothing clipped under notch or home indicator) | SIM |

---

### 4.3 Navigation

| # | Item | Platform |
|---|------|----------|
| 4.3.1 | Tab bar hidden on `dream/capture`, `dream/[id]`, `dream/tarot` | SIM |
| 4.3.2 | Tab bar visible on all `(tabs)/` screens | SIM |
| 4.3.3 | Bottom tab icons: moon-outline / journal-outline / person-outline — no label text | SIM |
| 4.3.4 | Active tab icon color is `tokens.accent` (#7B6EF6) | SIM |
| 4.3.5 | Back navigation from `dream/[id]` returns to archive (when opened from there) | SIM |
| 4.3.6 | `saveAndNavigate` after saving a dream goes to `dream/[id]` (not home) | SIM |

---

### 4.4 Data & Persistence

| # | Item | Platform |
|---|------|----------|
| 4.4.1 | Dream saved by "full path" appears in Supabase dashboard with all fields populated | SIM |
| 4.4.2 | Dream saved by "Just save it" has empty `interpretation` and null `tarot_card` in Supabase | SIM |
| 4.4.3 | Signing out and back in restores archive from Supabase | SIM |
| 4.4.4 | Profile stats (total, this month, with oracle) match Supabase row count | SIM |
| 4.4.5 | Duplicate session save (upsert on `session_id`) does not create two rows | SIM |
| 4.4.6 | Deleting account removes all dream rows from Supabase `dream_records` | SIM |

---

### 4.5 Error Handling

| # | Item | Platform |
|---|------|----------|
| 4.5.1 | Error toast appears in capture screen when LLM call fails (test by temporarily revoking `KIMI_API_KEY`) | SIM |
| 4.5.2 | "Try again" link appears below last message after an LLM error | SIM |
| 4.5.3 | Tapping "Try again" retries the appropriate orchestrator function | SIM |
| 4.5.4 | Toast dismisses and `clearError` resets state when `onDismiss` called | SIM |
| 4.5.5 | Throwing inside a child component shows the `ErrorBoundary` fallback ("Something went quiet.") | SIM |
| 4.5.6 | "Return home" in `ErrorBoundary` navigates to tabs and clears error state | SIM |
| 4.5.7 | Dream detail with invalid `id` shows "Dream not found" + "Return home" button | SIM |

---

### 4.6 Device-Only Features (Physical iPhone Required)

| # | Item | Platform |
|---|------|----------|
| 4.6.1 | Sign in with Apple opens the native Apple ID sheet | DEVICE |
| 4.6.2 | Apple Sign-In completes and user lands on home tab | DEVICE |
| 4.6.3 | Sign in with Google opens the browser/OAuth sheet | DEVICE |
| 4.6.4 | Share poster: tapping Share generates a PNG (loading spinner shown during generation) | DEVICE |
| 4.6.5 | Share poster: photo library permission prompt appears on first use | DEVICE |
| 4.6.6 | Share poster: image saved to Camera Roll (confirm in Photos app) | DEVICE |
| 4.6.7 | Share poster: iOS share sheet opens with the image | DEVICE |
| 4.6.8 | Force-quit mid-capture, relaunch → draft restore card appears on home screen | DEVICE |
| 4.6.9 | App resumes correctly after 30 minutes in background (no blank screen, no crash) | DEVICE |
| 4.6.10 | Tarot card fan animation runs at 60fps with no stutter on device | DEVICE |

---

## Section 5 — Regression & Edge Cases

Run these manually or as targeted Jest tests.

| # | Area | Scenario | Expected |
|---|------|----------|----------|
| 5.1 | Tarot | `getRandomTarotCard()` called 1000 times | All 1000 results have `id` in range 0–21; no crash |
| 5.2 | Orchestrator | `handleUserMessage` called while `isProcessing === true` | Message queue is serialised; no duplicate LLM calls |
| 5.3 | LLM Client | API responds with `[DONE]` immediately (empty response) | `callLLMFull` returns `""`, no crash |
| 5.4 | Capture screen | User sends a very long message (1999 chars) | Sends successfully; UI handles long content without overflow |
| 5.5 | Archive | 50+ dreams in list | SectionList scrolls smoothly; no re-render jank |
| 5.6 | Dream detail | `tarot_card` in Supabase is `null` | No Oracle section rendered; no crash |
| 5.7 | Dream detail | `interpretation` is empty string | No Interpretation section rendered; no crash |
| 5.8 | Profile | User has 0 dreams | Stats show `0 / 0 / 0`; no divide-by-zero crash |
| 5.9 | Rate limiter | Server restarts mid-session | In-memory `rateLimit` Map resets; user gets fresh quota |
| 5.10 | Onboarding | AsyncStorage read fails on launch | App falls through to sign-in; no crash |
| 5.11 | TypeScript | `tsc --noEmit` from `veil/` | Zero type errors |
| 5.12 | Tarot count | `node -e "const d = require('./src/data/tarot-data'); console.log(d.cards.length)"` | Prints `22` |

---

## Appendix: Test Session Opening Brief (for Cowork)

### Division of work

| Who | Sections | What |
|-----|----------|------|
| **Claude Code (this session)** | §1, §2, §3, §5.1–5.4, §5.11–5.12 | Jest unit tests, API/curl security checks, Detox E2E on simulator, regression scripts |
| **Human — simulator** | §4.1–4.5, §5.5, §5.9–5.10 | Visual animations, keyboard layout, data persistence spot-checks |
| **Human — physical iPhone** | §4.6 | Apple Sign-In, Camera Roll, share sheet, 60fps tarot |

Claude Code runs first and produces a full failure report. The human sections happen after.

---

### Opening brief — paste this at the start of the Cowork session

```
You are running the automated portions of the test plan for "Veil" — an AI-native dream journaling iOS app.
Codebase: /Users/violawu/Desktop/Playground/.claude/worktrees/ecstatic-wright-f35d5a/veil/
Stack: React Native (Expo) + Clerk Auth + Supabase + Kimi LLM.
Test plan file: /Users/violawu/Desktop/Playground/veil-test-plan.md

YOUR SCOPE — run these sections in order:
  1. §1  Jest unit tests
  2. §2  API / security tests (curl)
  3. §3  Detox E2E (simulator)
  4. §5  Regression items 5.1–5.4, 5.11, 5.12

DO NOT attempt §4 (manual/visual) or §4.6 (device-only). Stop after §5 and hand off.

Setup steps before starting:
  a. cd into the codebase: cd /Users/violawu/Desktop/Playground/.claude/worktrees/ecstatic-wright-f35d5a/veil/
  b. Confirm .env.local has real values for all 5 keys (EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
     EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, KIMI_API_KEY, CLERK_SECRET_KEY).
     If any key is a placeholder, stop and report which keys are missing.
  c. Run: npx expo start &   (leave running in background — required for §2 API tests)
  d. Install test deps if not present: npm install --save-dev jest @testing-library/react-native detox

Rules:
  - Run each section fully before moving to the next.
  - For each failing test, record: test ID · failure message · one-line hypothesis.
  - Do NOT fix bugs. Document and continue.
  - If a whole section is blocked (e.g. Detox build fails), record the blocker and skip to the next section.
  - After each section, output a report in this exact format and nothing else after it:

---SECTION REPORT---
SECTION: [number and name]
TOTAL: [pass] / [total]
FAILURES:
  - [test id]: [failure message] — [hypothesis]
BLOCKERS: [anything that prevented full execution, or "None"]
NOTES: [any observations worth flagging]
---END REPORT---

After all automated sections are done, output a final summary:

---FINAL REPORT---
AUTOMATED SECTIONS COMPLETE: [list]
TOTAL PASS: [n] / [total automated]
TOP ISSUES: [up to 5 most important failures, ranked by likely severity]
HAND-OFF NOTE: Remaining sections for human — §4.1–4.5 (simulator) and §4.6 (physical device).
---END FINAL REPORT---
```

---

*Generated: May 19, 2026*  
*Covers: Phases 1–5 of veil-task-plan.md*
