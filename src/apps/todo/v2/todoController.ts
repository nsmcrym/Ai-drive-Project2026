import type { Request, Response } from 'express';
import { getTodoId, maxDatabaseId, notFound, sendError } from '../todoController';
import { createTodo, deleteTodo, isPriority, listTodos, updateTodo } from './todoModel';

const priorityMessage = '優先度は low、normal、high のいずれかを指定してください。';

export async function list(req: Request, res: Response) {
    const { completed, priority } = req.query;

    if (
        (completed !== undefined && completed !== 'true' && completed !== 'false')
        || (priority !== undefined && typeof priority !== 'string')
    ) {
        sendError(res, 400, '絞り込み条件の形式を確認してください。');
        return;
    }

    if (priority !== undefined && !isPriority(priority)) {
        sendError(res, 422, priorityMessage);
        return;
    }

    const data = await listTodos({
        completed: completed === undefined ? undefined : completed === 'true',
        priority,
    });
    res.json({ status: 'success', data });
}

export async function create(req: Request, res: Response) {
    const { title, priority } = req.body ?? {};
    if (typeof title !== 'string' || (priority !== undefined && typeof priority !== 'string')) {
        sendError(res, 400, 'タイトルと優先度の形式を確認してください。');
        return;
    }

    const normalizedTitle = title.trim();
    const length = Array.from(normalizedTitle).length;
    if (length < 1 || length > 100) {
        sendError(res, 422, 'タイトルは1〜100文字で入力してください。');
        return;
    }
    if (priority !== undefined && !isPriority(priority)) {
        sendError(res, 422, priorityMessage);
        return;
    }

    const data = await createTodo(normalizedTitle, priority);
    res.status(201).json({ status: 'success', data });
}

export async function update(req: Request<{ id: string }>, res: Response) {
    const id = getTodoId(req.params.id, res);
    if (id === undefined) return;

    const { isCompleted, priority } = req.body ?? {};
    if (
        (isCompleted === undefined && priority === undefined)
        || (isCompleted !== undefined && typeof isCompleted !== 'boolean')
        || (priority !== undefined && typeof priority !== 'string')
    ) {
        sendError(res, 400, '完了状態または優先度を正しい形式で指定してください。');
        return;
    }
    if (priority !== undefined && !isPriority(priority)) {
        sendError(res, 422, priorityMessage);
        return;
    }

    const data = id <= maxDatabaseId ? await updateTodo(id, { isCompleted, priority }) : null;
    if (!data) {
        sendError(res, 404, notFound);
        return;
    }
    res.json({ status: 'success', data });
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
