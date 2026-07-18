import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredEntry = {
  id: string;
  speaker: string;
  sourceLang: 'en' | 'vi';
  targetLang: 'en' | 'vi';
  source: string;
  translated: string;
};

export type StoredSession = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  entries: StoredEntry[];
  summary?: string;
};

const STORAGE_KEY = 'livetranslate.sessions';
const MAX_SESSIONS = 50;

async function readAll(): Promise<StoredSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch (err) {
    console.log(`[History] failed to read storage: ${err}`);
    return [];
  }
}

async function writeAll(sessions: StoredSession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch (err) {
    console.log(`[History] failed to write storage: ${err}`);
  }
}

export function createSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function saveSessionEntries(sessionId: string, startedAt: number, entries: StoredEntry[]): Promise<void> {
  const sessions = await readAll();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], entries };
  } else {
    sessions.unshift({ id: sessionId, startedAt, endedAt: null, entries });
  }
  await writeAll(sessions);
}

export async function endSession(sessionId: string, summary?: string): Promise<void> {
  const sessions = await readAll();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx < 0) return;
  sessions[idx] = { ...sessions[idx], endedAt: Date.now(), summary };
  await writeAll(sessions);
}

export async function listSessions(): Promise<StoredSession[]> {
  return readAll();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await readAll();
  await writeAll(sessions.filter((s) => s.id !== sessionId));
}
