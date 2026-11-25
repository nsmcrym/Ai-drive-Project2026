import type { Request, Response } from 'express';
import { listAiQaLogs, saveAiQaLog } from './aiModel';
import { generateAnswer, GeminiError } from './aiService';

export function sendError(res: Response, status: number, code: string, message: string): void {
    res.status(status).json({ success: false, error: { code, message } });
}

export async function ask(req: Request, res: Response): Promise<void> {
    const rawPrompt = req.body?.prompt;
    if (typeof rawPrompt !== 'string' || rawPrompt.includes('\u0000')) {
        sendError(res, 400, 'BAD_REQUEST', '質問を確認してください。');
        return;
    }

    const prompt = rawPrompt.trim();
    const length = Array.from(prompt).length;
    if (length < 1 || length > 2_000) {
        sendError(res, 422, 'INVALID_PROMPT_LENGTH', '質問は1〜2,000文字で入力してください。');
        return;
    }

    let responseText: string;
    try {
        responseText = await generateAnswer(prompt);
    } catch (error) {
        if (!(error instanceof GeminiError)) {
            throw error;
        }
        if (error.code === 'INTERNAL_ERROR') {
            sendError(res, 500, error.code, '現在処理できません。');
        } else {
            sendError(res, error.code === 'AI_TIMEOUT' ? 504 : 502, error.code, 'AI回答を取得できませんでした。');
        }
        return;
    }
    let item: Awaited<ReturnType<typeof saveAiQaLog>>;
    try {
        item = await saveAiQaLog(prompt, responseText);
    } catch (error) {
        const code = (error as { code?: unknown } | null)?.code;
        // PostgreSQLがデータ・制約・SQLのエラーで文を拒否した場合は未保存と判断できる。
        if (typeof code === 'string' && /^(22|23|42)[0-9A-Z]{3}$/.test(code)) {
            sendError(res, 500, 'SAVE_FAILED', '回答を保存できませんでした。');
        } else {
            sendError(res, 500, 'SAVE_RESULT_UNKNOWN', '保存結果を確認できませんでした。履歴を更新してください。');
        }
        return;
    }

    res.set('Cache-Control', 'no-store');
    res.status(201).json({ success: true, item });
}

export async function getHistory(_req: Request, res: Response): Promise<void> {
    res.set('Cache-Control', 'no-store');
    try {
        const items = await listAiQaLogs();
        res.status(200).json({ success: true, items });
    } catch {
        sendError(res, 500, 'HISTORY_FAILED', '履歴を取得できませんでした。');
    }
}
