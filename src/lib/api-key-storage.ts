import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GeminiConfig } from '@/lib/gemini';

const STORAGE_KEY = 'livetranslate.geminiConfig';

export async function getGeminiConfig(): Promise<GeminiConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GeminiConfig) : null;
  } catch {
    return null;
  }
}

export async function setGeminiConfig(config: GeminiConfig | null): Promise<void> {
  if (!config) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
