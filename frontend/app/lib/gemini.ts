const GEMINI_API_KEY =process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function askGemini(prompt: string): Promise<string> {
  try {
    console.log('Sending request to Gemini...');

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 75000);

    const response = await fetch(GEMINI_URL, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },

      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),

      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log('Gemini response status:', response.status);

    if (!response.ok) {
      const errText = await response.text();

      throw new Error(
        `Gemini API error ${response.status}: ${errText}`
      );
    }

    const data = await response.json();

    console.log('Gemini response received:', data);

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Gemini returned no text in response');
    }

    return text;

  } catch (error) {
    console.error('askGemini failed:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'Gemini request timed out '
      );
    }

    throw error instanceof Error
      ? error
      : new Error(String(error));
  }
}