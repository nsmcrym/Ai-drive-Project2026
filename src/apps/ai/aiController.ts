import type { Request, Response } from 'express';
import { listAiQaLogs } from './aiModel';

export function sendError(res: Response, status: number, code: string, message: string): void {
    res.status(status).json({ success: false, error: { code, message } });
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
