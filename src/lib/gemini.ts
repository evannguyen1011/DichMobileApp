const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * NOTE: this key ships inside the client JS bundle (there's no backend server in this app),
 * so it's only protected from git/source leaks - not from someone extracting it out of a
 * built APK. Fine for a personal/demo app; don't reuse a key with a wide-scoped billing quota.
 */
async function callGemini(prompt: string): Promise<string> {
  if (!API_KEY) {
    throw new Error('Chua cau hinh EXPO_PUBLIC_GEMINI_API_KEY trong file .env');
  }
  const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
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

export async function explainText(selectedText: string, contextText?: string): Promise<string> {
  const prompt = contextText
    ? `Giai thich ngan gon, don gian, de hieu cum tu/cau sau trong ngu canh cua doan hoi thoai nay.\n\nNgu canh: "${contextText}"\n\nCan giai thich: "${selectedText}"\n\nTra loi bang tieng Viet, toi da 3-4 cau.`
    : `Giai thich ngan gon, don gian, de hieu cau/cum tu sau bang tieng Viet, toi da 3-4 cau:\n\n"${selectedText}"`;
  return callGemini(prompt);
}

export async function summarizeSession(transcript: string): Promise<string> {
  const prompt = `Day la ban ghi (transcript) mot cuoc hop/workshop song ngu Anh-Viet. Hay tom tat lai noi dung chinh, cac y quan trong, va bat ky quyet dinh/hanh dong tiep theo (action items) neu co. Tra loi bang tieng Viet, dinh dang gach dau dong ro rang.\n\nTranscript:\n${transcript}`;
  return callGemini(prompt);
}
