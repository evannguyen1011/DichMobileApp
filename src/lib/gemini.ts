const MODEL = 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class MissingApiKeyError extends Error {
  constructor() {
    super('Chua cau hinh Gemini API key. Vao man hinh thiet lap de nhap.');
    this.name = 'MissingApiKeyError';
  }
}

/**
 * The key is supplied per-call (entered by the user and stored locally on their own device via
 * api-key-storage.ts) rather than baked into the app at build time - this app has no backend
 * server, so a single embedded key would be shared/billed across every install (teammate,
 * workshop attendees, ...). Each user brings their own free Gemini API key instead.
 */
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  if (!apiKey.trim()) throw new MissingApiKeyError();
  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
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

export async function explainText(apiKey: string, selectedText: string, contextText?: string): Promise<string> {
  const prompt = contextText
    ? `Giai thich ngan gon, don gian, de hieu cum tu/cau sau trong ngu canh cua doan hoi thoai nay.\n\nNgu canh: "${contextText}"\n\nCan giai thich: "${selectedText}"\n\nTra loi bang tieng Viet, toi da 3-4 cau.`
    : `Giai thich ngan gon, don gian, de hieu cau/cum tu sau bang tieng Viet, toi da 3-4 cau:\n\n"${selectedText}"`;
  return callGemini(apiKey, prompt);
}

export async function summarizeSession(apiKey: string, transcript: string): Promise<string> {
  const prompt = `Day la ban ghi (transcript) mot cuoc hop/workshop song ngu Anh-Viet. Hay tom tat lai noi dung chinh, cac y quan trong, va bat ky quyet dinh/hanh dong tiep theo (action items) neu co. Tra loi bang tieng Viet, dinh dang gach dau dong ro rang.\n\nTranscript:\n${transcript}`;
  return callGemini(apiKey, prompt);
}
