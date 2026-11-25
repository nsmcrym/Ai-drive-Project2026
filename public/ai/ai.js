(() => {
    const historyList = document.getElementById('ai-history');
    const refreshButton = document.getElementById('ai-history-refresh');
    const status = document.getElementById('ai-history-status');
    const error = document.getElementById('ai-history-error');

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
    async function loadHistory() {
        if (isLoading) return;
        isLoading = true;
        refreshButton.disabled = true;
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
            refreshButton.disabled = false;
        }
    }

    refreshButton.addEventListener('click', loadHistory);
    void loadHistory();
})();
