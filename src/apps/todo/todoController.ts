import type { ErrorRequestHandler, Request, Response } from 'express';
import {
    createTodo,
    deleteTodo,
    listTodos,
    TodoDatabaseUnavailable,
    updateTodoCompletion,
} from './todoModel';

const errorCodes = {
    400: 'BAD_REQUEST',
    404: 'NOT_FOUND',
    422: 'VALIDATION_ERROR',
    500: 'INTERNAL_ERROR',
    503: 'DB_UNAVAILABLE',
} as const;

function sendError(res: Response, status: keyof typeof errorCodes, message: string) {
    res.status(status).json({ status: 'error', code: errorCodes[status], message, details: [] });
}

function getTodoId(value: string, res: Response) {
    const id = Number(value);
    if (!/^\d+$/.test(value) || id < 1) {
        sendError(res, 400, 'IDは1以上の整数で指定してください。');
        return undefined;
    }
    return id;
}

const maxDatabaseId = 2_147_483_647;
const notFound = 'TODOが見つかりません。';

export async function list(_req: Request, res: Response) {
    res.json({ status: 'success', data: await listTodos() });
}

export async function create(req: Request, res: Response) {
    const title = req.body?.title;
    if (typeof title !== 'string') {
        sendError(res, 400, 'タイトルを文字列で指定してください。');
        return;
    }

    const normalizedTitle = title.trim();
    const length = Array.from(normalizedTitle).length;
    if (length < 1 || length > 100) {
        sendError(res, 422, 'タイトルは1〜100文字で入力してください。');
        return;
    }

    res.status(201).json({ status: 'success', data: await createTodo(normalizedTitle) });
}

export async function setCompleted(req: Request<{ id: string }>, res: Response) {
    const id = getTodoId(req.params.id, res);
    if (id === undefined) return;

    const isCompleted = req.body?.isCompleted;
    if (typeof isCompleted !== 'boolean') {
        sendError(res, 400, '完了状態を true または false で指定してください。');
        return;
    }

    const todo = id <= maxDatabaseId ? await updateTodoCompletion(id, isCompleted) : null;
    if (!todo) {
        sendError(res, 404, notFound);
        return;
    }
    res.json({ status: 'success', data: todo });
}

export async function remove(req: Request<{ id: string }>, res: Response) {
    const id = getTodoId(req.params.id, res);
    if (id === undefined) return;

    if (id > maxDatabaseId || !(await deleteTodo(id))) {
        sendError(res, 404, notFound);
        return;
    }
    res.status(204).end();
}

export const handleTodoError: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
        next(error);
        return;
    }
    if (error.status === 400 || error.type === 'entity.too.large') {
        sendError(res, 400, 'リクエストの形式を確認してください。');
        return;
    }
    if (error instanceof TodoDatabaseUnavailable) {
        console.error('TODOのDB接続に失敗しました', error);
        sendError(res, 503, '現在データベースに接続できません。');
        return;
    }
    console.error('TODOの処理に失敗しました', error);
    sendError(res, 500, 'TODOの処理に失敗しました。');
};
