import { query } from '../todoModel';

export const priorities = ['low', 'normal', 'high'] as const;
type Priority = typeof priorities[number];

type TodoFilters = {
    completed?: boolean;
    priority?: Priority;
};

type TodoChanges = {
    isCompleted?: boolean;
    priority?: Priority;
};

type TodoRow = {
    id: number;
    title: string;
    is_completed: boolean;
    priority: Priority;
    created_at: Date;
};

const todoColumns = 'id, title, is_completed, priority, created_at';

function toTodo(row: TodoRow) {
    return {
        id: row.id,
        title: row.title,
        isCompleted: row.is_completed,
        priority: row.priority,
        createdAt: row.created_at.toISOString(),
    };
}

export function isPriority(value: string): value is Priority {
    return priorities.some((priority) => priority === value);
}

export async function listTodos(filters: TodoFilters) {
    const conditions: string[] = [];
    const values: (boolean | Priority)[] = [];

    if (filters.completed !== undefined) {
        values.push(filters.completed);
        conditions.push(`is_completed = $${values.length}`);
    }
    if (filters.priority !== undefined) {
        values.push(filters.priority);
        conditions.push(`priority = $${values.length}`);
    }

    const where = conditions.length === 0 ? '' : `WHERE ${conditions.join(' AND ')}`;
    const { rows } = await query<TodoRow>(
        `SELECT ${todoColumns}
         FROM v2_todo_tasks ${where} ORDER BY id ASC`,
        values,
    );

    return rows.map(toTodo);
}

export async function createTodo(title: string, priority?: Priority) {
    const values = priority === undefined ? [title] : [title, priority];
    const priorityValue = priority === undefined ? 'DEFAULT' : '$2';
    const { rows } = await query<TodoRow>(
        `INSERT INTO v2_todo_tasks (title, priority)
         VALUES ($1, ${priorityValue}) RETURNING ${todoColumns}`,
        values,
    );
    return toTodo(rows[0]);
}

export async function updateTodo(id: number, changes: TodoChanges) {
    const assignments: string[] = [];
    const values: (number | boolean | Priority)[] = [id];

    if (changes.isCompleted !== undefined) {
        values.push(changes.isCompleted);
        assignments.push(`is_completed = $${values.length}`);
    }
    if (changes.priority !== undefined) {
        values.push(changes.priority);
        assignments.push(`priority = $${values.length}`);
    }

    const { rows } = await query<TodoRow>(
        `UPDATE v2_todo_tasks SET ${assignments.join(', ')}
         WHERE id = $1 RETURNING ${todoColumns}`,
        values,
    );
    return rows[0] ? toTodo(rows[0]) : null;
}

export async function deleteTodo(id: number) {
    const result = await query('DELETE FROM v2_todo_tasks WHERE id = $1', [id]);
    return result.rowCount === 1;
}
