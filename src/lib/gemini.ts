const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class MissingApiKeyError extends Error {
  constructor() {
    super('Chua cau hinh Gemini (key rieng hoac server). Vao "API key" de thiet lap.');
    this.name = 'MissingApiKeyError';
  }
}

/**
 * Two ways to reach Gemini:
 * - 'own-key': the app calls Gemini directly using a key the user pasted in themselves,
 *   stored only on their device. Nobody else's usage counts against it.
 * - 'server': the app calls a small proxy (see /server) that holds one shared key
 *   server-side. Needed if you want everyone using the app to share your own key instead
 *   of getting their own - the key can never live in the client for that to be safe.
 */
export type GeminiConfig =
  | { mode: 'own-key'; apiKey: string }
  | { mode: 'server'; serverUrl: string };

async function callGemini(config: GeminiConfig, prompt: string): Promise<string> {
  if (config.mode === 'own-key') {
    if (!config.apiKey.trim()) throw new MissingApiKeyError();
    const response = await fetch(`${ENDPOINT}?key=${config.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Gemini API loi ${response.status}: ${body.slice(0, 200)}`);
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini khong tra ve noi dung.');
    return text;
  }

  if (!config.serverUrl.trim()) throw new MissingApiKeyError();
  const base = config.serverUrl.trim().replace(/\/+$/, '');
  const response = await fetch(`${base}/api/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? `Server proxy loi ${response.status}`);
  }
  if (!data?.text) throw new Error('Server proxy khong tra ve noi dung.');
  return data.text;
}

export async function explainText(
  config: GeminiConfig,
  selectedText: string,
  contextText?: string
): Promise<string> {
  const prompt = contextText
    ? `Giai thich ngan gon, don gian, de hieu cum tu/cau sau trong ngu canh cua doan hoi thoai nay.\n\nNgu canh: "${contextText}"\n\nCan giai thich: "${selectedText}"\n\nTra loi bang tieng Viet, toi da 3-4 cau.`
    : `Giai thich ngan gon, don gian, de hieu cau/cum tu sau bang tieng Viet, toi da 3-4 cau:\n\n"${selectedText}"`;
  return callGemini(config, prompt);
}

export async function summarizeSession(config: GeminiConfig, transcript: string): Promise<string> {
  const prompt = `Day la ban ghi (transcript) mot cuoc hop/workshop song ngu Anh-Viet. Hay tom tat lai noi dung chinh, cac y quan trong, va bat ky quyet dinh/hanh dong tiep theo (action items) neu co. Tra loi bang tieng Viet, dinh dang gach dau dong ro rang.\n\nTranscript:\n${transcript}`;
  return callGemini(config, prompt);
}
