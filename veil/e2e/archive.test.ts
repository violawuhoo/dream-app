import { device, element, by, waitFor, expect as detoxExpect } from "detox";
import {
  TIMEOUT,
  LLM_TIMEOUT,
  waitForId,
  waitForText,
  tapId,
  signInAsGuest,
  skipOnboardingIfPresent,
} from "./utils/helpers";

/** Save one dream via the quick path so archive has something to show. */
async function saveDream(description: string) {
  await tapId("btn-begin");
  await waitForId("input-dream");

  const messages = [description, "nothing more", "no that's it", "done", "done"];
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
  await element(by.id("archive-tab")).tap();
  await waitFor(element(by.id("btn-search-toggle")))
    .toBeVisible()
    .withTimeout(TIMEOUT);
  // Wait for the dream list to finish loading (not just the header bar).
  // Skeleton animations block EarlGrey sync; this confirms the list is ready
  // before beforeAll returns so 3.5.1 doesn't race against loadDreams.
  await waitFor(element(by.id("dream-row-0")))
    .toBeVisible()
    .withTimeout(LLM_TIMEOUT);
}

describe("3.5 Archive Screen", () => {
  // Re-enable EarlGrey sync after every test so tests that disable sync
  // (3.5.5, 3.5.6) never leave subsequent tests in an unsynchronised state.
  afterEach(async () => {
    await device.enableSynchronization();
  });

  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await skipOnboardingIfPresent();
    await signInAsGuest();
    await saveDream("I was swimming in a warm golden ocean");
  });

  it("3.5.1 — dreams listed grouped by month header", async () => {
    // React Native applies textTransform:"uppercase" to the underlying string
    // before passing it to native, so EarlGrey sees the uppercase form.
    const monthYear = new Date()
      .toLocaleString("en-US", { month: "long", year: "numeric" })
      .toUpperCase();
    await waitForText(monthYear, LLM_TIMEOUT);
  });

  it("3.5.2 — tapping a dream card opens detail screen", async () => {
    // Toggle search open and closed to confirm the icon responds, then tap
    // the first dream card and verify the detail screen opens.
    await element(by.id("btn-search-toggle")).tap();
    await element(by.id("btn-search-toggle")).tap();
    await element(by.id("dream-row-0")).tap();
    await waitForId("btn-back-dream", TIMEOUT);
    await element(by.id("btn-back-dream")).tap();
    await waitForId("btn-search-toggle");
  });

  it("3.5.3 — search filters results", async () => {
    await tapId("btn-search-toggle");
    await waitForId("input-search-archive");
    await element(by.id("input-search-archive")).typeText("ocean");
    await waitForText("ocean");
  });

  it("3.5.4 — search with no match shows empty list", async () => {
    await element(by.id("input-search-archive")).clearText();
    await element(by.id("input-search-archive")).typeText("zzznomatch999");
    await waitForText("No dreams match your search.");
    await element(by.id("input-search-archive")).clearText();
    await tapId("btn-search-toggle");
    // After search closes, toggleSearch() calls Keyboard.dismiss() so the
    // keyboard and layout are fully settled before 3.5.5 starts its longPress.
    await waitForId("dream-row-0", TIMEOUT);
  });

  it("3.5.5 — long-press shows delete alert", async () => {
    // Keep sync disabled through the entire interaction.
    // Re-enabling sync right after longPress lets EarlGrey's idle detector
    // block on the SectionList scroll recogniser indefinitely.
    // afterEach() re-enables sync unconditionally even on failure.
    await device.disableSynchronization();
    await element(by.id("dream-row-0")).longPress();
    await waitForText("Delete", LLM_TIMEOUT);
    // atIndex(0): guard against a second "Cancel" in the hierarchy (keyboard
    // toolbar or nav-bar Cancel from a previous screen transition).
    await element(by.label("Cancel")).atIndex(0).tap();
  });

  it("3.5.6 — confirm delete removes the dream card", async () => {
    // Sync ON: confirm the row is still present after Cancel was tapped.
    await waitForId("dream-row-0", TIMEOUT);
    await device.disableSynchronization();
    await element(by.id("dream-row-0")).longPress();
    await waitForText("Delete", LLM_TIMEOUT);
    await element(by.label("Delete")).atIndex(0).tap();
    await device.enableSynchronization();
    await waitForText("Your dreams will live here.", TIMEOUT);
  });

  it("3.5.7 — empty state shows when no dreams exist", async () => {
    await waitForId("btn-record-first-dream");
    await detoxExpect(element(by.text("Your dreams will live here."))).toBeVisible();
  });
});
