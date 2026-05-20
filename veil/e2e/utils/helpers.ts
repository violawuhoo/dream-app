import { element, by, waitFor } from "detox";

export const TIMEOUT = 10000;
export const LLM_TIMEOUT = 20000;

export async function waitForId(testID: string, timeout = TIMEOUT) {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeout);
}

export async function waitForText(text: string, timeout = TIMEOUT) {
  await waitFor(element(by.text(text)))
    .toBeVisible()
    .withTimeout(timeout);
}

export async function tapId(testID: string) {
  await element(by.id(testID)).tap();
}

export async function typeInId(testID: string, text: string) {
  await element(by.id(testID)).typeText(text);
}

export async function signInAsGuest() {
  await tapId("btn-guest");
  await waitForId("btn-begin");
}

export async function skipOnboardingIfPresent() {
  try {
    await waitFor(element(by.id("btn-skip-onboarding")))
      .toBeVisible()
      .withTimeout(3000);
    await tapId("btn-skip-onboarding");
  } catch {
    // onboarding not shown — continue
  }
}

export async function openCaptureAndType(message: string) {
  await tapId("btn-begin");
  await waitForId("input-dream");
  await element(by.id("input-dream")).typeText(message);
}

export async function dismissAlert(buttonLabel: string) {
  await element(by.label(buttonLabel)).tap();
}
