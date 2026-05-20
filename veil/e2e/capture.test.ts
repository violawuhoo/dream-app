import { device, element, by, waitFor, expect as detoxExpect } from "detox";
import {
  TIMEOUT,
  LLM_TIMEOUT,
  waitForId,
  tapId,
  signInAsGuest,
  skipOnboardingIfPresent,
} from "./utils/helpers";

describe("3.3 Dream Capture — fast checks", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await skipOnboardingIfPresent();
    await signInAsGuest();
  });

  it("3.3.1 — tapping the moon opens capture screen", async () => {
    await tapId("btn-begin");
    await waitForId("input-dream", TIMEOUT);
  });

  it("3.3.2 — send button is disabled when input is empty", async () => {
    await detoxExpect(element(by.id("btn-send"))).not.toBeEnabled();
  });

  it("3.3.3 — send button enables after typing", async () => {
    await element(by.id("input-dream")).typeText("hello");
    await detoxExpect(element(by.id("btn-send"))).toBeEnabled();
  });

  it("3.3.4 — close button dismisses capture screen", async () => {
    await tapId("btn-close-capture");
    await element(by.label("Exit")).tap();
    await waitForId("btn-begin", TIMEOUT);
  });
});

describe("3.3 Dream Capture — full flow", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: false });
    await skipOnboardingIfPresent();
  });

  it("3.3.5 — LLM responds after first message", async () => {
    await tapId("btn-begin");
    await waitForId("input-dream");
    await element(by.id("input-dream")).typeText("I was flying over a city at night");
    await element(by.id("btn-send")).tap();
    await waitFor(element(by.id("btn-send")))
      .toBeEnabled()
      .withTimeout(LLM_TIMEOUT);
  });

  it("3.3.6 — Interpret and Just save it buttons appear after enough messages", async () => {
    const messages = ["there were lights below", "it felt peaceful", "done", "done"];
    for (const msg of messages) {
      await element(by.id("input-dream")).typeText(msg);
      await element(by.id("btn-send")).tap();
      await waitFor(element(by.id("btn-send")))
        .toBeEnabled()
        .withTimeout(LLM_TIMEOUT);
    }
    await waitForId("btn-skip-interpretation", LLM_TIMEOUT);
    await detoxExpect(element(by.id("btn-interpret"))).toBeVisible();
  });

  it("3.3.7 — Just save it skips to save view", async () => {
    await tapId("btn-skip-interpretation");
    await waitForId("btn-save-view", LLM_TIMEOUT);
  });

  it("3.3.8 — Save & view navigates to dream detail", async () => {
    await tapId("btn-save-view");
    await waitForId("btn-back-dream", TIMEOUT);
  });

  it("3.3.9 — Discard shows confirmation and returns to home", async () => {
    await tapId("btn-back-dream");
    await tapId("btn-begin");
    await waitForId("input-dream");
    await element(by.id("input-dream")).typeText("test dream");
    await element(by.id("btn-send")).tap();
    await waitFor(element(by.id("btn-send")))
      .toBeEnabled()
      .withTimeout(LLM_TIMEOUT);
    await tapId("btn-close-capture");
    await element(by.label("Exit")).tap();
    await waitForId("btn-begin", TIMEOUT);
  });
});
