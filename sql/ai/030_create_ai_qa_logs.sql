BEGIN;

CREATE TABLE ai_qa_logs (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prompt text NOT NULL CHECK (char_length(prompt) BETWEEN 1 AND 2000),
    response_text text NOT NULL CHECK (response_text ~ '[^[:space:]]'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ai_qa_logs_history_idx
    ON ai_qa_logs (created_at DESC, id DESC);

COMMIT;
