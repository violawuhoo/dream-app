import { device, element, by, waitFor, expect as detoxExpect } from "detox";
import {
  TIMEOUT,
  LLM_TIMEOUT,
  waitForId,
  tapId,
  signInAsGuest,
  skipOnboardingIfPresent,
} from "./utils/helpers";

describe("3.8 Offline Draft Restore", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await skipOnboardingIfPresent();
    await signInAsGuest();
  });

  it("3.8.1 — draft saved after partial session and force-quit", async () => {
    await tapId("btn-begin");
    await waitForId("input-dream");
    await element(by.id("input-dream")).typeText("I was in a foggy city");
    await element(by.id("btn-send")).tap();
    await waitFor(element(by.id("btn-send")))
      .toBeEnabled()
      .withTimeout(LLM_TIMEOUT);

    await element(by.id("input-dream")).typeText("There were shadows following me");
    await element(by.id("btn-send")).tap();
    await waitFor(element(by.id("btn-send")))
      .toBeEnabled()
      .withTimeout(LLM_TIMEOUT);

    await device.terminateApp();
    await device.launchApp({ newInstance: false });
    await skipOnboardingIfPresent();
    await waitForId("card-draft", TIMEOUT);
  });

  it("3.8.2 — draft age displayed (less than 1 hour)", async () => {
    await waitForId("card-draft");
    await waitFor(
      element(by.text("Unfinished dream · just now"))
        .or(element(by.text("Unfinished dream · 0h ago")))
    )
      .toBeVisible()
      .withTimeout(TIMEOUT);
  });

  it("3.8.3 — Continue restores session messages", async () => {
    await tapId("btn-continue-draft");
    await waitForId("input-dream");
    await waitFor(element(by.text("I was in a foggy city")))
      .toBeVisible()
      .withTimeout(TIMEOUT);
  });

  it("3.8.4 — Start fresh discards draft card", async () => {
    await tapId("btn-close-capture");
    await element(by.label("Exit")).tap();
    await waitForId("card-draft");
    await tapId("btn-discard-draft");
    await waitFor(element(by.id("card-draft")))
      .not.toBeVisible()
      .withTimeout(TIMEOUT);
  });

  it("3.8.5 — saving a session clears the draft", async () => {
    await tapId("btn-begin");
    await waitForId("input-dream");

    const messages = ["I was flying", "nothing else", "done", "done", "done"];
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
    await tapId("btn-back-dream");
    await waitForId("btn-begin");
    await detoxExpect(element(by.id("card-draft"))).not.toBeVisible();
  });
});
