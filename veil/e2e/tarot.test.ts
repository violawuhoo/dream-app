import { device, element, by, waitFor, expect as detoxExpect } from "detox";
import {
  TIMEOUT,
  LLM_TIMEOUT,
  waitForId,
  tapId,
  signInAsGuest,
  skipOnboardingIfPresent,
} from "./utils/helpers";

/** Drive through capture → interpretation → life-connection to reach the tarot decision screen. */
async function reachTarotDecisionScreen() {
  await tapId("btn-begin");
  await waitForId("input-dream");

  const captureMessages = [
    "I was standing on top of a mountain",
    "The sky was full of strange colours",
    "I felt very small but also powerful",
    "There was nobody else around",
    "No that's all",
  ];

  for (const msg of captureMessages) {
    await element(by.id("input-dream")).typeText(msg);
    await element(by.id("btn-send")).tap();
    await waitFor(element(by.id("btn-send")))
      .toBeEnabled()
      .withTimeout(LLM_TIMEOUT);
  }

  await waitForId("btn-interpret", LLM_TIMEOUT);
  await tapId("btn-interpret");

  // Life connection input
  await waitFor(element(by.id("btn-send")))
    .toBeEnabled()
    .withTimeout(LLM_TIMEOUT);
  await element(by.id("input-dream")).typeText("I just finished a big project at work");
  await element(by.id("btn-send")).tap();

  await waitForId("btn-draw-oracle", LLM_TIMEOUT);
}

describe("3.4 Tarot Oracle", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await skipOnboardingIfPresent();
    await signInAsGuest();
    await reachTarotDecisionScreen();
  });

  it("3.4.1 — Draw the Oracle and Skip buttons are visible", async () => {
    await detoxExpect(element(by.id("btn-draw-oracle"))).toBeVisible();
    await detoxExpect(element(by.id("btn-skip-tarot"))).toBeVisible();
  });

  it("3.4.2 — Draw the Oracle opens the tarot card fan screen", async () => {
    await tapId("btn-draw-oracle");
    await waitForId("tarot-card-0", TIMEOUT);
    await detoxExpect(element(by.id("tarot-card-1"))).toBeVisible();
    await detoxExpect(element(by.id("tarot-card-2"))).toBeVisible();
  });

  it("3.4.3 — tapping a card selects it and shows Complete button", async () => {
    await tapId("tarot-card-0");
    await waitForId("btn-tarot-complete", TIMEOUT);
  });

  it("3.4.4 — completing tarot returns to capture and shows Save & view", async () => {
    await tapId("btn-tarot-complete");
    await waitForId("btn-save-view", LLM_TIMEOUT);
  });

  it("3.4.5 — Skip tarot goes directly to Save & view", async () => {
    // Save this dream first, then do another run to test skip
    await tapId("btn-save-view");
    await waitForId("btn-back-dream", TIMEOUT);
    await tapId("btn-back-dream");

    await reachTarotDecisionScreen();
    await tapId("btn-skip-tarot");
    await waitForId("btn-save-view", LLM_TIMEOUT);
  });

  it("3.4.6 — dream saved without tarot has no Oracle section", async () => {
    await tapId("btn-save-view");
    await waitForId("btn-back-dream", TIMEOUT);
    await detoxExpect(element(by.id("section-tarot"))).not.toBeVisible();
    await waitForId("section-narrative");
  });
});
