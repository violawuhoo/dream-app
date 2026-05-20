import { device, element, by, waitFor, expect as detoxExpect } from "detox";
import {
  TIMEOUT,
  waitForId,
  waitForText,
  tapId,
  signInAsGuest,
  skipOnboardingIfPresent,
} from "./utils/helpers";

describe("3.7 Profile Screen", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await skipOnboardingIfPresent();
    await signInAsGuest();
    await element(by.id("profile-tab")).tap();
    await waitForId("btn-sign-out");
  });

  it("3.7.1 — stats row shows 3 metric cards", async () => {
    await waitForText("dreams");
    await waitForText("this month");
    await waitForText("with oracle");
  });

  it("3.7.2 — guest user sees Create Account button", async () => {
    await waitForId("btn-create-account");
    await detoxExpect(element(by.id("btn-create-account"))).toBeVisible();
  });

  it("3.7.3 — sign out navigates to sign-in", async () => {
    await tapId("btn-sign-out");
    await waitForId("btn-apple");
    await detoxExpect(element(by.id("btn-begin"))).not.toBeVisible();
  });

  it("3.7.4 — delete account confirmation shows correct message", async () => {
    await tapId("btn-guest");
    await waitForId("btn-begin");
    await element(by.id("profile-tab")).tap();
    await waitForId("btn-delete-account");
    await tapId("btn-delete-account");
    await waitForText("This will permanently delete all your dreams.");
    await element(by.label("Cancel")).tap();
  });

  it("3.7.5 — Export dreams button is accessible and triggers share/save", async () => {
    await waitForText("Export dreams");
    await element(by.text("Export dreams")).tap();
    await waitForId("btn-sign-out", TIMEOUT);
  });
});
