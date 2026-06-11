# Veil — Claude Code Session Guide

## Project

React Native + Expo Router + Supabase app (`veil/`). Always `cd` into `veil/` before running commands.

---

## iOS Physical Device Build

```bash
cd veil/ios && LANG=en_US.UTF-8 pod install   # required after any native change
npm run ios:device                             # warm-up CoreDevice DDI, then build+deploy
```

### Known fix: `SwiftGeneratePch` race condition → "No such module 'Expo'"

**Root cause:** `Veil.xcodeproj`'s Veil target had no explicit `PBXTargetDependency` on `Pods-Veil`. On a clean DerivedData, `SwiftGeneratePch` fired before any Pods target finished, found no `.modulemap` files, and poisoned the Swift module cache.

**Fix (in `ios/Podfile` post_install):** After `react_native_post_install` finishes, a Ruby string-patch injects:
- `PBXFileReference` for `Pods/Pods.xcodeproj` (in the existing Pods group — must be group-attached or CocoaPods GC will remove it on next integration)
- `PBXContainerItemProxy` + `PBXTargetDependency` pointing to `Pods-Veil` target (UUID `A280FCE46C8A7C99703EE6CDFA66ED73`)
- The dependency UUID into `Veil` target's `dependencies = ()` array

The patch is idempotent (keyed on UUID `8D0A2B4C65E358F4B9F730A2`). `ios/` is gitignored so the Podfile change must be re-applied from scratch if the ios directory is regenerated via `expo prebuild`.

---

## E2E Test Rules

- e2e/ files **can be modified** — the previous "never touch e2e/" constraint has been lifted.
- Build: `npm run test:e2e:build`
- Run all archive tests: `npm run test:e2e -- e2e/archive.test.ts`
- Run one test by name: `npm run test:e2e -- e2e/archive.test.ts -t "3.5.2"`
- Simulator: iPhone 16 Pro (iOS Debug)

### Grep output — never paste raw hierarchies

```bash
# Compact pass/fail summary
npm run test:e2e -- e2e/archive.test.ts 2>&1 \
  | grep -E "(PASS|FAIL|✓|✗|●|Cannot find|Element not found|Error)" | head -50

# When you need class names from a hierarchy dump
... | grep -oE 'class="[^"]+"' | sort -u
```

---

## Architecture Constraints

| Constraint | Detail |
|---|---|
| New Architecture (Fabric) | **Cannot disable** — Reanimated hard-requires it |
| `by.type("RCTTextView/RCTView")` | **Abandoned** — Fabric breaks all class-name selectors. Use `by.id(testID)` exclusively |
| `by.id(testID)` | Architecture-agnostic, stable, readable — the correct selector for all tests |
| Supabase RLS | Anon key blocked for INSERT and SELECT — dreams never reach Supabase in tests |
| Local cache | `src/lib/localDreams.ts` — AsyncStorage fallback (key: `veil_local_dreams`) |
| Guest user ID | AsyncStorage key: `veil_guest_id` |
| Supabase timeout | AbortController 3 s in `loadDreams` so EarlGrey isn't blocked |

---

## Archive Test Status (`e2e/archive.test.ts`)

Update this table after every fix+verify cycle.

| Test | Status | Notes |
|---|---|---|
| 3.5.1 — archive loads | ✅ PASS | |
| 3.5.2 — tap dream card | 🔄 NEEDS BUILD | Changed to `by.id("dream-row-0").tap()` |
| 3.5.3 — search opens | ✅ PASS | |
| 3.5.4 — search filters | ✅ PASS | |
| 3.5.5 — long-press row | 🔄 NEEDS BUILD | Changed to `by.id("dream-row-0").longPress()` |
| 3.5.6 — confirm delete | 🔄 NEEDS BUILD | Same selector fix |
| 3.5.7 — empty state | 🔄 NEEDS BUILD | Cascades from 3.5.6 |

**Selector strategy (applies to all tests):** All `by.type(...)` selectors removed — Fabric breaks them. Every selector is now `by.id(testID)`. The `DreamRow` `<Pressable>` has `testID={`dream-row-${index}`}` where index is position within the SectionList section.

---

## Dream Detail Test Status (`e2e/dreamDetail.test.ts`)

| Test | Status | Notes |
|---|---|---|
| 3.6.1 — all sections render | ✅ PASS | `device.disableSynchronization()` + `toExist()` to bypass main-queue GCD callbacks from LLM stream cleanup |
| 3.6.2 — no Oracle section | ✅ PASS | |
| 3.6.3 — delete navigates to archive | ✅ PASS | `by.label("Delete").atIndex(0).tap()` |
| 3.6.4 — back button | ✅ PASS | `tapId("home-tab")` before saveMinimalDream to return from archive |
| 3.6.5 — loading skeleton | ✅ PASS | |

---

## Key Files Changed (from baseline)

| File | What changed |
|---|---|
| `app/(tabs)/archive.tsx` | `DreamRow` → `testID` prop on Pressable; `DetoxTextOverlay` shim removed; renderItem passes `dream-row-${index}` |
| `app/dream/[id].tsx` | Added `testID="archive-tab"` Pressable in bottom bar → `router.replace("/(tabs)/archive")`; `handleDelete` uses AbortController with `clearTimeout` |
| `src/lib/localDreams.ts` | **New file** — AsyncStorage dream cache (`saveLocalDream`, `getLocalDreams`, `deleteLocalDream`) |
| `src/lib/useOrchestrator.ts` | `saveRecord` uses cancellable timeout (clearTimeout after race) so spurious `ac.abort()` never fires after upsert wins; fallback interpretations always non-empty; calls `saveLocalDream` before Supabase upsert |
| `src/lib/llm-client.ts` | `finally` calls `req.stopTimer()` (not `req.abort()`) on normal completion to avoid firing abort event on a completed fetch; `reader.cancel()` always called for prompt NSURLSession cleanup |
| `e2e/archive.test.ts` | 3.5.2/3.5.5/3.5.6: `by.type(...)` → `by.id("dream-row-0")` |
| `e2e/dreamDetail.test.ts` | 3.6.1: `disableSynchronization`+`toExist()`; 3.6.3: `atIndex(0)`; 3.6.4: `tapId("home-tab")` before saveMinimalDream |
| `ios/Veil/RCTDetoxTextOverlay.m` | Still present but JS no longer uses it — safe to leave or delete |

---

## EarlGrey Synchronization — Key Learnings

- **`controller.abort()` on a completed fetch**: fires the "abort" event on the signal, scheduling a native main-queue callback EarlGrey sees as a "work item". Use `clearTimeout` instead.
- **Spurious `ac.abort()` after Promise.race**: if `sleep(N).then(() => ac.abort())` loses the race (upsert wins), the timer still fires N seconds later. Fix: use `new Promise` with a `setTimeout` ID you can `clearTimeout` immediately after the race resolves.
- **`reader.cancel()` on a completed stream**: needed for prompt NSURLSession cleanup (otherwise server connection lingers and EarlGrey waits for it). Does fire a brief native callback but it clears quickly.
- **Persistent "work items" from orchestrator context re-renders**: if React state updates are still queued as GCD blocks when an assertion starts, use `device.disableSynchronization()` + `toExist()` to bypass the wait.

---

## Workflow Strategy for Long Debug Sessions

### Rule: one failing test = one focused task

Don't try to fix all failures in one session. Pick one, fix it, verify, update the status table above, then move on (new session or `/compact`).

### Fix → verify → update cycle

1. Read the failing test in `e2e/archive.test.ts` (read only — understand what it does)
2. Identify the native element it targets (`by.type`, `by.id`, `by.text`)
3. Make the minimal app-code change
4. Run **only that test** with grep-filtered output
5. **Update the status table above** before moving to the next test

### Between sessions

This file is auto-loaded by Claude Code. After each session, update:
- The status table (mark ✅/❌, add notes)
- "Next thing to try" under the root cause section
- Any new constraints discovered

You don't need to write a prompt. Just open a new chat and say:
> **"Continue E2E fixes for dreamDetail.test.ts"** (or archive / profile)

Claude will read this file and know exactly where things stand.

---

## Profile Test Status (`e2e/profile.test.ts`)

| Test | Status | Notes |
|---|---|---|
| 3.7.1 — stats row | ✅ PASS | |
| 3.7.2 — guest Create Account | ✅ PASS | |
| 3.7.3 — sign out | ✅ PASS | |
| 3.7.4 — delete account alert | ✅ PASS | `by.label("Cancel").atIndex(0).tap()` |
| 3.7.5 — Export dreams | ✅ PASS | `disableSynchronization()` + `toExist()` — share sheet covers btn-sign-out |

## Full Suite Status

**43/43 passing** as of 2026-06-09.
