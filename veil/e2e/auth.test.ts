import { device, element, by, waitFor, expect as detoxExpect } from "detox";
import {
  TIMEOUT,
  waitForId,
  tapId,
  signInAsGuest,
  skipOnboardingIfPresent,
} from "./utils/helpers";

describe("3.2 Authentication", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await skipOnboardingIfPresent();
  });

  it("3.2.1 — sign-in screen shows Apple, Google, and Guest options", async () => {
    await waitForId("btn-apple", TIMEOUT);
    await detoxExpect(element(by.id("btn-google"))).toBeVisible();
    await detoxExpect(element(by.id("btn-guest"))).toBeVisible();
  });

  it("3.2.2 — guest sign-in lands on home screen", async () => {
    await signInAsGuest();
    await waitForId("btn-begin", TIMEOUT);
  });

  it("3.2.3 — sign-out returns to sign-in screen", async () => {
    await element(by.id("profile-tab")).tap();
    await waitForId("btn-sign-out");
    await tapId("btn-sign-out");
    await waitForId("btn-apple", TIMEOUT);
  });

  it("3.2.4 — guest user sees Create Account button on profile", async () => {
    await tapId("btn-guest");
    await waitForId("btn-begin");
    await element(by.id("profile-tab")).tap();
    await waitForId("btn-create-account");
    await detoxExpect(element(by.id("btn-create-account"))).toBeVisible();
  });

  it("3.2.5 — tab bar is not accessible from sign-in screen", async () => {
    await element(by.id("profile-tab")).tap();
    await waitForId("btn-sign-out");
    await tapId("btn-sign-out");
    await waitForId("btn-apple", TIMEOUT);
    await detoxExpect(element(by.id("btn-begin"))).not.toBeVisible();
  });
});
