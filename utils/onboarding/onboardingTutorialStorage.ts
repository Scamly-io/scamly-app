import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "onboarding_tutorial_progress_v1";

export type StoredOnboardingTutorialStep = "first_scan" | "celebration";

export async function getStoredOnboardingTutorialStep(): Promise<StoredOnboardingTutorialStep | null> {
  const v = await AsyncStorage.getItem(KEY);
  if (v === "first_scan" || v === "celebration") {
    return v;
  }
  return null;
}

export async function setStoredOnboardingTutorialStep(
  step: StoredOnboardingTutorialStep,
): Promise<void> {
  await AsyncStorage.setItem(KEY, step);
}

export async function clearOnboardingTutorialStorage(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
