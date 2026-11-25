import { pool } from '../../../db';

type AiQaLogRow = {
    id: number;
    prompt: string;
    response_text: string;
    created_at: Date;
};

const logColumns = 'id, prompt, response_text, created_at';

function toAiQaItem(row: AiQaLogRow) {
    return {
        id: row.id,
        prompt: row.prompt,
        responseText: row.response_text,
        createdAt: row.created_at.toISOString(),
    };
}

export async function saveAiQaLog(prompt: string, responseText: string) {
    const { rows } = await pool.query<AiQaLogRow>(
        `INSERT INTO ai_qa_logs (prompt, response_text)
         VALUES ($1, $2)
         RETURNING ${logColumns}`,
        [prompt, responseText],
    );
    return toAiQaItem(rows[0]);
}

export async function listAiQaLogs() {
    const { rows } = await pool.query<AiQaLogRow>(
        `SELECT ${logColumns}
         FROM ai_qa_logs
         ORDER BY created_at DESC, id DESC
         LIMIT 20`,
    );
    return rows.map(toAiQaItem);
}
