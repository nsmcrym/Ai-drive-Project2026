type GeminiFailure = 'INTERNAL_ERROR' | 'AI_UNAVAILABLE' | 'AI_TIMEOUT';

export class GeminiError extends Error {
    constructor(readonly code: GeminiFailure) {
        super(code);
    }
}

type GeminiResponse = {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown; thought?: boolean }> } }>;
};

export async function generateAnswer(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const model = process.env.GEMINI_MODEL?.trim().replace(/^models\//, '');
    if (!apiKey || !model || !/^[a-zA-Z0-9_.-]+$/.test(model)) {
        throw new GeminiError('INTERNAL_ERROR');
    }

    const signal = AbortSignal.timeout(30_000);
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
                redirect: 'error',
                signal,
            },
        );
        if (!response.ok) {
            await response.body?.cancel();
            throw new GeminiError('AI_UNAVAILABLE');
        }

        const result: GeminiResponse | null = await response.json();
        signal.throwIfAborted();
        const parts = result?.candidates?.[0]?.content?.parts;
        const answer = Array.isArray(parts)
            ? parts.map(part => !part?.thought && typeof part?.text === 'string' ? part.text : '').join('')
            : '';
        if (!answer.trim() || answer.includes('\u0000')) {
            throw new GeminiError('AI_UNAVAILABLE');
        }
        return answer;
    } catch {
        throw new GeminiError(signal.aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE');
    }
}
