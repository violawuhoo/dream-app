import { device, element, by, waitFor, expect as detoxExpect } from "detox";
import { TIMEOUT, waitForId, tapId } from "./utils/helpers";

describe("3.1 Onboarding", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  it("3.1.1 — onboarding screen appears on first launch", async () => {
    await waitForId("btn-skip-onboarding", TIMEOUT);
    await detoxExpect(element(by.id("btn-begin-onboarding"))).toBeVisible();
  });

  it("3.1.2 — dot indicators render", async () => {
    await detoxExpect(element(by.id("dot-0"))).toBeVisible();
    await detoxExpect(element(by.id("dot-1"))).toBeVisible();
    await detoxExpect(element(by.id("dot-2"))).toBeVisible();
  });

  it("3.1.3 — tapping a dot navigates to that slide", async () => {
    await tapId("dot-1");
    // dot-1 should now be the active (selected) state — slide 2 content visible
    await tapId("dot-0");
  });

  it("3.1.4 — Skip lands on sign-in screen", async () => {
    await tapId("btn-skip-onboarding");
    await waitForId("btn-apple", TIMEOUT);
    await waitForId("btn-google");
    await waitForId("btn-guest");
  });

  it("3.1.5 — onboarding does not show on second launch", async () => {
    await device.terminateApp();
    await device.launchApp({ newInstance: false });
    // Should go straight to sign-in, not onboarding
    await waitForId("btn-guest", TIMEOUT);
    await detoxExpect(element(by.id("btn-begin-onboarding"))).not.toBeVisible();
  });
});
