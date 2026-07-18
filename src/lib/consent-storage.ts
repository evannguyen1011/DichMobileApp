import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'livetranslate.geminiConsent';

/** null = never asked yet. */
export async function getGeminiConsent(): Promise<boolean | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  return raw === 'true';
}

export async function setGeminiConsent(value: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
}
