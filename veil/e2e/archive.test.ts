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
}

describe("3.5 Archive Screen", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await skipOnboardingIfPresent();
    await signInAsGuest();
    await saveDream("I was swimming in a warm golden ocean");
  });

  it("3.5.1 — dreams listed grouped by month header", async () => {
    const monthYear = new Date()
      .toLocaleString("en-US", { month: "long", year: "numeric" })
      .toUpperCase();
    await waitForText(monthYear);
  });

  it("3.5.2 — tapping a dream card opens detail screen", async () => {
    await element(by.id("btn-search-toggle")).tap();
    await element(by.id("btn-search-toggle")).tap();
    await element(by.type("RCTTextView")).atIndex(2).tap();
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
  });

  it("3.5.5 — long-press shows delete alert", async () => {
    await element(by.type("RCTView")).atIndex(5).longPress();
    await waitForText("Delete");
    await element(by.label("Cancel")).tap();
  });

  it("3.5.6 — confirm delete removes the dream card", async () => {
    await element(by.type("RCTView")).atIndex(5).longPress();
    await waitForText("Delete");
    await element(by.label("Delete")).tap();
    await waitForText("Your dreams will live here.", TIMEOUT);
  });

  it("3.5.7 — empty state shows when no dreams exist", async () => {
    await waitForId("btn-record-first-dream");
    await detoxExpect(element(by.text("Your dreams will live here."))).toBeVisible();
  });
});
