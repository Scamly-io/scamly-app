import AsyncStorage from "@react-native-async-storage/async-storage";

const keyFor = (userId: string) => `oauth_collect_welcome_seen_v1_${userId}`;

export async function getOAuthCollectWelcomeSeen(userId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(keyFor(userId));
  return v === "1";
}

export async function setOAuthCollectWelcomeSeen(userId: string): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), "1");
}
