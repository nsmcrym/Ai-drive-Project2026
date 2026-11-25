import type { QueryResultRow } from 'pg';
import { pool } from '../../../db';

type TodoRow = {
    id: number;
    title: string;
    is_completed: boolean;
    created_at: Date;
};

export class TodoDatabaseUnavailable extends Error {}

const todoColumns = 'id, title, is_completed, created_at';

export async function query<Row extends QueryResultRow>(sql: string, values: unknown[] = []) {
    const client = await pool.connect().catch((cause: unknown) => {
        throw new TodoDatabaseUnavailable('DB接続を取得できません', { cause });
    });

    try {
        return await client.query<Row>(sql, values);
    } catch (error) {
        const code = (error as { code?: unknown })?.code;
        const connectionLost = typeof code === 'string' && (
            code.startsWith('08') || ['57P01', '57P02', '57P03', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT'].includes(code)
        );
        if (connectionLost) {
            throw new TodoDatabaseUnavailable('DB接続を利用できません', { cause: error });
        }
        throw error;
    } finally {
        client.release();
    }
}

function toTodo(row: TodoRow) {
    return {
        id: row.id,
        title: row.title,
        isCompleted: row.is_completed,
        createdAt: row.created_at.toISOString(),
    };
}

export async function listTodos() {
    const result = await query<TodoRow>(`SELECT ${todoColumns} FROM todo_tasks ORDER BY id ASC`);
    return result.rows.map(toTodo);
}

export async function createTodo(title: string) {
    const result = await query<TodoRow>(
        `INSERT INTO todo_tasks (title) VALUES ($1) RETURNING ${todoColumns}`,
        [title],
    );
    return toTodo(result.rows[0]);
}

export async function updateTodoCompletion(id: number, isCompleted: boolean) {
    const result = await query<TodoRow>(
        `UPDATE todo_tasks SET is_completed = $2 WHERE id = $1 RETURNING ${todoColumns}`,
        [id, isCompleted],
    );
    return result.rows[0] ? toTodo(result.rows[0]) : null;
}

export async function deleteTodo(id: number) {
    const result = await query('DELETE FROM todo_tasks WHERE id = $1', [id]);
    return result.rowCount === 1;
}
