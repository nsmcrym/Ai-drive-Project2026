import express, { Router } from 'express';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { getHistory, sendError } from './aiController';

export const aiRouter = Router();

aiRouter.use((_req, res, next) => {
    if (process.env.VERCEL_ENV === 'production' || process.env.AI_DEMO_ENABLED !== 'true') {
        sendError(res, 503, 'DEMO_DISABLED', 'AI質問デモは現在停止しています。');
        return;
    }
    next();
});

const requireJson: RequestHandler = (req, res, next) => {
    if (!req.is('application/json')) {
        sendError(res, 400, 'BAD_REQUEST', '送信形式を確認してください。');
        return;
    }
    next();
};

// 質問処理は後続の作業で接続する。
const notImplemented: RequestHandler = (_req, res) => {
    sendError(res, 501, 'NOT_IMPLEMENTED', 'この機能は準備中です。');
};

aiRouter.get('/history', getHistory);
aiRouter.post('/ask', requireJson, express.json({ limit: 16_384 }), notImplemented);

aiRouter.use((_req, res) => {
    sendError(res, 404, 'NOT_FOUND', '指定されたAI APIが見つかりません。');
});

const handleAiError: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
        next(error);
        return;
    }
    if (error.type === 'entity.too.large') {
        sendError(res, 413, 'BODY_TOO_LARGE', '送信内容が大きすぎます。');
        return;
    }
    if (error.status === 400 || error.status === 415) {
        sendError(res, 400, 'BAD_REQUEST', '入力または送信形式を確認してください。');
        return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', '現在処理できません。');
};

aiRouter.use(handleAiError);
