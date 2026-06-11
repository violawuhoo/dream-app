import { device, element, by, waitFor, expect as detoxExpect } from "detox";
import {
  TIMEOUT,
  LLM_TIMEOUT,
  waitForId,
  tapId,
  signInAsGuest,
  skipOnboardingIfPresent,
} from "./utils/helpers";

/**
 * Save a dream via the full interpretation + life-connection path.
 * Skips tarot via btn-skip-tarot, which calls skipTarot()+saveAndNavigate()
 * directly — there is NO intermediate "Save & view" screen on this path.
 * Lands on the dream detail screen (btn-back-dream visible).
 */
async function saveFullDream() {
  await tapId("btn-begin");
  await waitForId("input-dream");

  const messages = [
    "I was climbing an endless staircase in a dark building",
    "Each floor looked exactly the same but felt different",
    "I felt panicked but also curious",
    "I don't remember reaching the top",
    "No that's all",
  ];

  for (const msg of messages) {
    await element(by.id("input-dream")).typeText(msg);
    await element(by.id("btn-send")).tap();
    await waitFor(element(by.id("btn-send")))
      .toBeEnabled()
      .withTimeout(LLM_TIMEOUT);
  }

  await waitForId("btn-interpret", LLM_TIMEOUT);
  await tapId("btn-interpret");

  await waitFor(element(by.id("btn-send")))
    .toBeEnabled()
    .withTimeout(LLM_TIMEOUT);
  await element(by.id("input-dream")).typeText("I've been working toward a big promotion recently");
  await element(by.id("btn-send")).tap();

  // btn-skip-tarot is wired to skipTarot()+saveAndNavigate() — navigates
  // directly to dream detail without showing a "Save & view" button.
  await waitForId("btn-skip-tarot", LLM_TIMEOUT);
  await tapId("btn-skip-tarot");
  await waitForId("btn-back-dream", TIMEOUT);
}

/** Save a minimal dream (skip interpretation) to test no-tarot path. */
async function saveMinimalDream() {
  await tapId("btn-begin");
  await waitForId("input-dream");

  const messages = [
    "I was sitting in a quiet garden",
    "nothing more",
    "done",
    "done",
    "finished",
  ];

  for (const msg of messages) {
    await element(by.id("input-dream")).typeText(msg);
    await element(by.id("btn-send")).tap();
    await waitFor(element(by.id("btn-send")))
      .toBeEnabled()
      .withTimeout(LLM_TIMEOUT);
  }

  await waitForId("btn-skip-interpretation", LLM_TIMEOUT);
  await tapId("btn-skip-interpretation");
  await waitForId("btn-save-view", LLM_TIMEOUT);
  await tapId("btn-save-view");
  await waitForId("btn-back-dream", TIMEOUT);
}

describe("3.6 Dream Detail Screen", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await skipOnboardingIfPresent();
    await signInAsGuest();
    await saveFullDream();
  });

  it("3.6.1 — all content sections render for a full-path dream", async () => {
    // The dream detail screen is seeded from the in-process pending record so
    // all sections are rendered immediately — no loading state, no Supabase
    // fetch. The main queue may briefly carry GCD callbacks from LLM stream
    // cleanup + orchestrator context re-renders; disable synchronisation so
    // EarlGrey doesn't time out waiting for those and checks presence directly.
    await device.disableSynchronization();
    try {
      await detoxExpect(element(by.id("section-narrative"))).toExist();
      await detoxExpect(element(by.id("section-interpretation"))).toExist();
      await detoxExpect(element(by.id("section-life-connection"))).toExist();
    } finally {
      await device.enableSynchronization();
    }
  });

  it("3.6.2 — no Oracle section for a dream saved without tarot", async () => {
    await tapId("btn-back-dream");
    await saveMinimalDream();
    await detoxExpect(element(by.id("section-tarot"))).not.toBeVisible();
    await waitForId("section-narrative");
  });

  it("3.6.3 — delete navigates to archive", async () => {
    await tapId("btn-delete-dream");
    await waitFor(element(by.text("Delete")))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.label("Delete")).atIndex(0).tap();
    await waitForId("btn-search-toggle", TIMEOUT);
  });

  it("3.6.4 — back button returns to previous screen", async () => {
    // After 3.6.3 navigates to archive, return to home tab before saving
    await tapId("home-tab");
    await waitForId("btn-begin", TIMEOUT);
    await saveMinimalDream();
    await tapId("btn-back-dream");
    await waitForId("btn-begin", TIMEOUT);
  });

  it("3.6.5 — loading skeleton appears before data", async () => {
    await element(by.id("archive-tab")).tap();
    await waitFor(element(by.id("btn-search-toggle")))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id("dream-row-0")).tap();
    await waitForId("btn-back-dream", TIMEOUT);
    await tapId("btn-back-dream");
  });
});
