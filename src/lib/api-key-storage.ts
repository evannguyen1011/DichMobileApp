import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'livetranslate.geminiApiKey';

export async function getGeminiApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function setGeminiApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (trimmed) {
    await AsyncStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
