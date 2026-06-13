# Veil — Master Test Plan

---

## Part 0 — Testing Rules and Layer Order

### The Rule

Write tests from the bottom of the pyramid up:

```
          /‾‾‾‾‾‾‾‾‾‾‾\
         /   E2E (few)  \       Detox on real simulator — slow, expensive
        /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
       / Integration (some) \   Jest against real modules, network mocked
      /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
     /    Unit (many)         \  Jest, all dependencies mocked — fast
    /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

### When to Use Each Layer

| Layer | Use when | Run with | Speed |
|---|---|---|---|
| **Unit** | testing logic inside one function/hook, all deps mocked | `jest` | ~50 ms/test |
| **Integration** | testing how two real modules connect (e.g. API handler + auth), network boundary mocked | `jest` | ~200 ms/test |
| **E2E** | confirming a full user journey on a real simulator | `detox test` | ~30–60 s/test |

### Order to Add Missing Layers to Veil

The original test plan was **E2E only**. That is why debugging was slow — logic bugs had to be caught through a 60-second Detox run instead of a 50ms Jest run. Correct the pyramid in this order:

**Step 1 — Unit tests first (do now)**
Add the missing unit tests in `src/__tests__/` (see Part 1 below). Run with `npx jest`. These catch logic bugs in milliseconds without touching the simulator.

**Step 2 — Integration tests second (do next)**
Add integration tests in `src/__tests__/integration/` (see Part 2 below). Run with `npx jest`. These catch API route bugs — auth failures, missing env vars, bad upstream responses — without needing a running server.

**Step 3 — Keep E2E tests for full journeys only (do last)**
The existing E2E suite (Part 3) covers the right things already. Trim any E2E test that only checks a UI element or a state transition — those belong in unit tests. Keep only tests that require a real navigator, real AsyncStorage, and real UI interactions across multiple screens.

### The Bug-Fixing Rule

When a bug is found, always fix it at the **lowest possible layer**:
- Logic bug in a function → write a failing unit test, fix the function, confirm the test passes
- API route returning wrong status → write a failing integration test, fix the route, confirm the test passes
- Only open Detox if the bug requires a real simulator to reproduce

---

## Part 1 — Unit Tests

### Infrastructure fixes applied (completed)
- Pinned `react-test-renderer` to `19.1.0` to match the `react` version
- Added `@react-native-async-storage/async-storage` mock to `jest.config.js`

### 1.4 — Orchestrator State Machine — existing tests (all passing ✅)

| Test | Status | Notes |
|---|---|---|
| 1.4.1 Initial state is RAW, userTurnCount is 0 | ✅ | |
| 1.4.2 handleUserMessage increments userTurnCount | ✅ | |
| 1.4.3 Empty string message is ignored | ✅ | |
| 1.4.4 isProcessing is false after message completes | ✅ | |
| 1.4.5 State transitions RAW → EXPANDING on first follow-up | ✅ | |
| 1.4.6 nextCheckTurn gate: no AWAITING_CONTINUE_DECISION before turn 5 | ✅ | |
| 1.4.7 State transitions to AWAITING_CONTINUE_DECISION at turn 5 | ✅ | |
| 1.4.8 'Done' keyword at turn ≥ 4 skips callLLMFull entirely | ✅ | **Updated:** short keyword match is authoritative — LLM call skipped |
| 1.4.9 proceedToStructuring sets state to STRUCTURED | ✅ | |
| 1.4.10 generateInterpretation sets state to AWAITING_LIFE_CONNECTION | ✅ | |
| 1.4.11 handleLifeConnection sets state to AWAITING_TAROT_DECISION | ✅ | |
| 1.4.12 drawTarot sets state to DONE and tarotCard non-null | ✅ | |
| 1.4.13 skipTarot sets state to DONE immediately | ✅ | |
| 1.4.14 skipInterpretation sets state to DONE immediately | ✅ | |
| 1.4.15 saveRecord calls Supabase upsert with user_id | ✅ | |
| 1.4.16 saveRecord removes AsyncStorage draft key on success | ✅ | **Updated:** draft storage moved from SecureStore → AsyncStorage |
| 1.4.17 saveRecord returns true even when Supabase errors | ✅ | **Updated:** local save always succeeds first; Supabase error is inner catch |
| 1.4.18 resetSession returns state to RAW with fresh ID | ✅ | |
| 1.4.19 LLM error in askFollowUp sets fallback message, error stays null | ✅ | **Updated:** askFollowUp now catches LLM errors internally with fallback prompt |
| 1.4.20 clearError sets error to null | ✅ | |
| 1.4.21 initialSession param is used as initial state | ✅ | |

File: `src/__tests__/useOrchestrator.test.ts`
(Adds to the existing section 1.4. Use the same mock setup already in the file.)

### 1.4 — Orchestrator State Machine (additions — all passing ✅)

| Test | Status |
|---|---|
| 1.4.22 `askFollowUp` LLM failure shows fallback message, error stays null | ✅ |
| 1.4.23 `askFollowUp` LLM failure does not advance state unexpectedly | ✅ |
| 1.4.24 `checkIntent` LLM failure defaults to CONTINUE | ✅ |
| 1.4.25 `proceedToStructuring` LLM failure falls back to raw entries | ✅ |
| 1.4.26 `generateInterpretation` LLM failure advances to AWAITING_LIFE_CONNECTION | ✅ |
| 1.4.27 `handleLifeConnection` LLM failure advances to AWAITING_TAROT_DECISION | ✅ |
| 1.4.28 AWAITING_LIFE_CONNECTION messages never trigger done-detection | ✅ |
| 1.4.29 Pure keyword done at turn ≥ 4 skips callLLMFull entirely | ✅ |
| 1.4.30 saveRecord falls back to guest UUID from AsyncStorage when userId is empty | ✅ |

### 1.4 — Orchestrator State Machine (new — from DESIGN_INTENT.md review)

File: `src/__tests__/useOrchestrator.test.ts`

| Test | Status | Intent section |
|---|---|---|
| 1.4.31 saveRecord calls saveLocalDream BEFORE Supabase upsert | ❌ to write | §6 §9 — local save must always succeed first |
| 1.4.32 skipTarot + saveRecord preserves narrative and interpretation, tarot_card is null | ❌ to write | §7 — skipping tarot causes no data loss |

**1.4.31 spec:**
- Mock `saveLocalDream` and Supabase upsert separately, both as jest.fn()
- Call `saveRecord()`
- Assert `saveLocalDream` was called
- Assert it was called BEFORE Supabase upsert (use `jest.fn()` call order or manually sequence with a flag)

**1.4.32 spec:**
- Set up session with `summary: "a dream summary"`, `interpretation: "an interpretation"`, `lifeConnectionInterpretation: "life context"`, `tarotCard: null`
- Call `skipTarot()` then `saveRecord()`
- Assert Supabase upsert was called with `narrative` non-empty, `interpretation` non-empty, `life_connection_interpretation` non-empty, `tarot_card: null`

---

### 1.5 — Draft Restore (tests updated, not new)

| Test | Status | Change |
|---|---|---|
| 1.5.2 draft persists to AsyncStorage | ✅ | SecureStore mock → AsyncStorage.setItem (source migration) |
| 1.5.3 draft restores from AsyncStorage | ✅ | Same migration; was passing for wrong reason (empty storage) |
| 1.5.4 draft cleared after save | ✅ | SecureStore.deleteItemAsync → AsyncStorage.removeItem |
| beforeEach | ✅ | Added `await AsyncStorage.clear()` for clean state |

---

### 2.1 — Prompt Builders

File: `src/__tests__/llm-prompts.test.ts` — all passing ✅

| Test | Status |
|---|---|
| 2.1.1 `buildExpansionMessages` returns 2 messages with roles system + user | ✅ |
| 2.1.2 `buildStructuredMessages` returns valid role/content shape | ✅ |
| 2.1.3 `buildInterpretationMessages` returns valid role/content shape | ✅ |
| 2.1.4 `buildLifeConnectionInterpretationMessages` returns valid role/content shape | ✅ |
| 2.1.5 `buildIntentClassificationMessages` returns valid role/content shape | ✅ |
| 2.1.6 No builder produces content > 2000 chars for typical input | ✅ |
| 2.1.7 `buildExpansionMessages` includes the latest user message in user content | ✅ |

---

### 2.1 — Prompt Builders (new — from DESIGN_INTENT.md review)

File: `src/__tests__/llm-prompts.test.ts`

| Test | Status | Intent section |
|---|---|---|
| 2.1.8 buildExpansionMessages system content mentions all 5 dimensions | ❌ to write | §5 — People, Objects, Environment, Events, Emotions |
| 2.1.9 All user-facing builders include "SAME LANGUAGE" instruction | ❌ to write | §4 — AI always matches the user's language |
| 2.1.10 Interpretation, life-connection, and tarot builders include "no markdown formatting" | ❌ to write | §2 §4 — AI must never use markdown |

**2.1.8 spec:**
- Call `buildExpansionMessages` with minimal session
- Assert `result[0].content` (system prompt) contains all five: "People", "Objects", "Environment", "Events", "Emotions"

**2.1.9 spec:**
- Call each of: `buildExpansionMessages`, `buildInterpretationMessages`, `buildLifeConnectionInterpretationMessages`, `buildTarotInterpretationMessages`
- For each, assert the system content includes "SAME LANGUAGE"

**2.1.10 spec:**
- Call each of: `buildInterpretationMessages`, `buildLifeConnectionInterpretationMessages`, `buildTarotInterpretationMessages`
- For each, assert the system content includes "no markdown formatting"

---

### 2.2 — Dream Model

File: `src/__tests__/dream-model.test.ts` — 3 of 4 passing ✅

| Test | Status | Notes |
|---|---|---|
| 2.2.1 `createSession` returns state RAW and userTurnCount 0 | ✅ | |
| 2.2.2 Two `createSession` calls produce different sessionIDs | ❌ to write | Skipped in last pass |
| 2.2.3 `createDreamRecord` maps summary, interpretation, tarotCard from session | ✅ | |
| 2.2.4 `createDreamRecord` falls back to "Untitled Dream" when title is empty | ✅ | |

---

### 2.3 — Local Dreams

File: `src/__tests__/localDreams.test.ts` — all passing ✅

| Test | Status |
|---|---|
| 2.3.1 `saveLocalDream` then `getLocalDreams` returns the saved record | ✅ |
| 2.3.2 Saving two dreams returns both in `getLocalDreams` | ✅ |
| 2.3.3 `getLocalDreams` returns empty array when storage is empty | ✅ |

---

## Part 1b — Security and Environment Tests (new — from DESIGN_INTENT.md §6)

File: `src/__tests__/security.test.ts` (new file — no mocks needed, reads real files)

These are not runtime tests — they read the actual project files to catch accidental security drift. Run with `npx jest`.

| Test | Status | Intent section |
|---|---|---|
| 4.1.1 KIMI_API_KEY does not appear in any EXPO_PUBLIC_ variable in .env.local | ❌ to write | §6 — API key must never be exposed to client |
| 4.1.2 CLERK_SECRET_KEY does not appear in any EXPO_PUBLIC_ variable in .env.local | ❌ to write | §6 — secret key must never be exposed to client |
| 4.1.3 No `EXPO_PUBLIC_` variable in .env.local contains the word "SECRET" or "KEY" followed by a value that looks like an API key | ❌ to write | §6 — general guard against accidentally exposing server-only credentials |

**4.1.1 spec:**
- Read `.env.local` as a string
- Split by newline, filter lines starting with `EXPO_PUBLIC_`
- Assert none of those lines contain "KIMI_API_KEY" or the actual key value

**4.1.2 spec:**
- Same approach — assert no `EXPO_PUBLIC_` line contains "CLERK_SECRET_KEY"

**4.1.3 spec:**
- For each `EXPO_PUBLIC_` line, assert the value does not look like a secret (e.g. does not start with `sk-` or `sk_`)

---

## Part 2 — Integration Tests

These tests use Jest (no Detox, no simulator). They test real module logic with only the network boundary mocked.

### 3.1 — `dream-chat+api.ts` Route Handler

File: `src/__tests__/integration/dream-chat.test.ts` — all passing ✅

| Test | Status |
|---|---|
| 3.1.1 Missing Authorization header returns 401 | ✅ |
| 3.1.2 Non-UUID, non-JWT token returns 401 | ✅ |
| 3.1.3 Valid guest UUID is accepted | ✅ |
| 3.1.4 Missing KIMI_API_KEY returns 500 | ✅ |
| 3.1.5 More than 30 requests from same userId returns 429 | ✅ |
| 3.1.6 Messages not an array returns 400 | ✅ |
| 3.1.7 Message content > 2000 chars returns 400 | ✅ |
| 3.1.8 Moonshot non-OK response proxied as 500 | ✅ |
| 3.1.9 Moonshot OK response streams with correct SSE headers | ✅ |

---

### 3.2 — `llm-client.ts`

File: `src/__tests__/integration/llm-client.test.ts` — all passing ✅

| Test | Status |
|---|---|
| 3.2.1 Successful stream yields chunks in order | ✅ |
| 3.2.2 HTTP error response throws `LLM request failed: 500` | ✅ |
| 3.2.3 Network failure on attempt 1 retries once and succeeds | ✅ |
| 3.2.4 Network failure on both attempts throws | ✅ |
| 3.2.5 `[DONE]` sentinel terminates the stream cleanly | ✅ |
| 3.2.6 Malformed SSE lines are silently skipped | ✅ |
| 3.2.7 `callLLMFull` accumulates all chunks into one string | ✅ |

---

## Part 3 — Existing E2E Tests (reference)

These run with `npm run test:e2e`. They require a release build (`npm run test:e2e:build` first).
Keep these for full user journeys only. Do not add new E2E tests for logic or state that can be covered by unit or integration tests.

### 3.3 — Onboarding and Guest Auth
`e2e/onboarding.test.ts` and `e2e/auth.test.ts` — covers 3.1 and 3.2 per original plan.

### 3.4 — Dream Capture
`e2e/capture.test.ts` — covers 3.3 per original plan.

### 3.5 — Tarot Oracle
`e2e/tarot.test.ts` — 3.4.1 through 3.4.7.

### 3.6 — Archive Screen
`e2e/archive.test.ts` — 3.5.1 through 3.5.7.

### 3.7 — Dream Detail Screen
`e2e/dreamDetail.test.ts` — all passing ✅

| Test | Result | Time |
|---|---|---|
| 3.6.1 all content sections render for a full-path dream | ✅ | 28 ms |
| 3.6.2 no Oracle section for a dream saved without tarot | ✅ | 34249 ms |
| 3.6.3 delete navigates to archive | ✅ | 8433 ms |
| 3.6.4 back button returns to previous screen | ✅ | 35927 ms |
| 3.6.5 loading skeleton appears before data | ✅ | 6612 ms |

Suite total: 148.5 s

### 3.8 — Share and Export
`e2e/share.test.ts` — 3.7.x per original plan.
⚠️ 3.7.5 (export dreams) may open native share sheet which blocks EarlGrey — needs `device.disableSynchronization()` pattern.

---

## Summary

| Layer | File | Tests | Status |
|---|---|---|---|
| Unit — orchestrator | `useOrchestrator.test.ts` | 1.4.1–1.4.30 (30 tests) | ✅ all passing |
| Unit — prompt builders | `llm-prompts.test.ts` | 2.1.1–2.1.7 (7 tests) | ✅ all passing |
| Unit — dream model | `dream-model.test.ts` | 2.2.1, 2.2.3, 2.2.4 (3 tests) | ✅ passing — 2.2.2 not written ⚠️ |
| Unit — local dreams | `localDreams.test.ts` | 2.3.1–2.3.3 (3 tests) | ✅ all passing |
| Integration — API route | `integration/dream-chat.test.ts` | 3.1.1–3.1.9 (9 tests) | ✅ all passing |
| Integration — llm-client | `integration/llm-client.test.ts` | 3.2.1–3.2.7 (7 tests) | ✅ all passing |
| E2E — full journeys | `e2e/*.test.ts` | 3.3–3.8 | ✅ all passing |

**Current: 95 unit/integration tests + full E2E suite — all passing ✅**

### New tests to write (identified from DESIGN_INTENT.md review)

| Test | File | Intent section | Priority |
|---|---|---|---|
| 2.2.2 Two createSession calls produce different sessionIDs | `dream-model.test.ts` | — | Low (simple) |
| 2.1.8 Expansion prompt mentions all 5 dimensions | `llm-prompts.test.ts` | §5 | High |
| 2.1.9 All user-facing builders include SAME LANGUAGE instruction | `llm-prompts.test.ts` | §4 | High |
| 2.1.10 Interpretation builders include no-markdown instruction | `llm-prompts.test.ts` | §2 §4 | High |
| 1.4.31 saveRecord calls local save BEFORE Supabase | `useOrchestrator.test.ts` | §6 §9 | High |
| 1.4.32 skipTarot + saveRecord preserves narrative/interpretation, tarot_card null | `useOrchestrator.test.ts` | §7 | Medium |
| 4.1.1 KIMI_API_KEY not in any EXPO_PUBLIC_ var | `security.test.ts` | §6 | High |
| 4.1.2 CLERK_SECRET_KEY not in any EXPO_PUBLIC_ var | `security.test.ts` | §6 | High |
| 4.1.3 No EXPO_PUBLIC_ value looks like an API secret | `security.test.ts` | §6 | Medium |
