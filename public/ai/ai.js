(() => {
    const historyList = document.getElementById('ai-history');
    const refreshButton = document.getElementById('ai-history-refresh');
    const status = document.getElementById('ai-history-status');
    const error = document.getElementById('ai-history-error');
    const form = document.getElementById('ai-ask-form');
    const promptInput = document.getElementById('ai-prompt');
    const submitButton = document.getElementById('ai-ask-submit');
    const askStatus = document.getElementById('ai-ask-status');
    const askError = document.getElementById('ai-ask-error');
    const answerSection = document.getElementById('ai-answer-section');
    const answer = document.getElementById('ai-answer');

    const askMessages = new Map([
        ['BAD_REQUEST', '質問または送信形式を確認してください。'],
        ['INVALID_PROMPT_LENGTH', '質問は1〜2,000文字で入力してください。'],
        ['BODY_TOO_LARGE', '送信内容が大きすぎます。'],
        ['AI_UNAVAILABLE', 'AI回答を取得できませんでした。'],
        ['AI_TIMEOUT', 'AI回答を取得できませんでした。'],
        ['SAVE_FAILED', '回答を保存できませんでした。'],
        ['SAVE_RESULT_UNKNOWN', '保存結果を確認できませんでした。履歴を更新してください。'],
        ['DEMO_DISABLED', 'AI質問デモは現在停止しています。'],
        ['INTERNAL_ERROR', '現在処理できません。'],
    ]);

    function createHistoryItem(item) {
        if (typeof item?.prompt !== 'string' || typeof item.responseText !== 'string'
            || typeof item.createdAt !== 'string') {
            throw new Error('Invalid history item');
        }

        const entry = document.createElement('li');
        const time = document.createElement('time');
        const question = document.createElement('p');
        const answer = document.createElement('p');
        time.dateTime = item.createdAt;
        time.textContent = new Date(item.createdAt).toLocaleString('ja-JP');
        question.textContent = '質問：' + item.prompt;
        answer.textContent = '回答：' + item.responseText;
        entry.append(time, question, answer);
        return entry;
    }

    let isLoading = false;
    let isSubmitting = false;

    function updateControls() {
        refreshButton.disabled = isLoading || isSubmitting;
        submitButton.disabled = isLoading || isSubmitting;
        promptInput.readOnly = isSubmitting;
    }

    async function loadHistory() {
        if (isLoading) return;
        isLoading = true;
        updateControls();
        status.textContent = '履歴を読み込んでいます。';
        error.textContent = '';

        try {
            const response = await fetch('/api/ai/history', { signal: AbortSignal.timeout(45_000) });
            const data = await response.json();
            if (!response.ok || data?.success !== true || !Array.isArray(data.items)) {
                error.textContent = response.status === 503 && data?.error?.code === 'DEMO_DISABLED'
                    ? 'AI質問デモは現在停止しています。'
                    : '履歴を取得できませんでした。';
                return;
            }

            historyList.replaceChildren(...data.items.map(createHistoryItem));
            if (data.items.length === 0) {
                status.textContent = '履歴はまだありません。';
            }
        } catch {
            error.textContent = '履歴を取得できませんでした。';
        } finally {
            if (status.textContent === '履歴を読み込んでいます。') status.textContent = '';
            isLoading = false;
            updateControls();
        }
    }

    async function submitQuestion(event) {
        event.preventDefault();
        if (isLoading || isSubmitting) return;

        askStatus.textContent = '';
        askError.textContent = '';
        answerSection.hidden = true;
        answer.textContent = '';

        const prompt = promptInput.value.trim();
        const length = Array.from(prompt).length;
        if (prompt.includes('\u0000') || length < 1 || length > 2_000) {
            askError.textContent = prompt.includes('\u0000')
                ? '質問に入力できない文字が含まれています。'
                : askMessages.get('INVALID_PROMPT_LENGTH');
            return;
        }

        isSubmitting = true;
        updateControls();
        askStatus.textContent = '回答を待っています。';
        const signal = AbortSignal.timeout(45_000);

        try {
            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
                signal,
            });
            const data = await response.json();
            if (response.status !== 201 || data?.success !== true || typeof data.item?.responseText !== 'string') {
                askError.textContent = askMessages.get(data?.error?.code) ?? '質問の応答を確認できませんでした。';
                return;
            }

            answer.textContent = data.item.responseText;
            answerSection.hidden = false;
            promptInput.value = '';
            askStatus.textContent = '回答を保存しました。';
            await loadHistory();
        } catch {
            askError.textContent = signal.aborted
                ? '保存結果を確認できませんでした。履歴を更新してください。'
                : '質問の応答を確認できませんでした。';
        } finally {
            if (askStatus.textContent === '回答を待っています。') askStatus.textContent = '';
            isSubmitting = false;
            updateControls();
        }
    }

    form.addEventListener('submit', submitQuestion);
    refreshButton.addEventListener('click', () => {
        if (!isSubmitting) void loadHistory();
    });
    void loadHistory();
})();
