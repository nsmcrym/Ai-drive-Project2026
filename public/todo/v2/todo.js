class TodoApiV2 {
    async request(path = '', method = 'GET', body) {
        let response;
        try {
            response = await fetch('/api/v2/todos' + path, {
                method,
                ...(body === undefined ? {} : {
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                }),
            });
        } catch {
            throw new Error('通信できませんでした。接続を確認してください。');
        }
        if (response.status === 204) return;

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            const message = payload?.status === 'error'
                ? `${payload.message} (${payload.code})`
                : `リクエストに失敗しました (HTTP ${response.status})。`;
            throw new Error(message);
        }
        if (payload?.status !== 'success') throw new Error('APIの応答を読み取れませんでした。');
        return payload.data;
    }

    list({ completed, priority } = {}) {
        const params = new URLSearchParams();
        if (completed !== undefined) params.set('completed', String(completed));
        if (priority !== undefined) params.set('priority', priority);
        return this.request(params.size ? '?' + params.toString() : '');
    }

    create(title, priority) {
        return this.request('', 'POST', { title, priority });
    }

    update(id, changes) {
        return this.request('/' + encodeURIComponent(id), 'PATCH', changes);
    }

    remove(id) {
        return this.request('/' + encodeURIComponent(id), 'DELETE');
    }
}

function startTodoV2(app) {
    const api = new TodoApiV2();
    const controls = app.querySelector('#todo-controls');
    const form = app.querySelector('#todo-form');
    const title = app.querySelector('#todo-title');
    const priority = app.querySelector('#todo-priority');
    const completionFilter = app.querySelector('#filter-completed');
    const priorityFilter = app.querySelector('#filter-priority');
    const list = app.querySelector('#todo-list');
    const empty = app.querySelector('#todo-empty');
    const status = app.querySelector('#todo-status');
    const errorMessage = app.querySelector('#todo-error');

    async function refresh() {
        list.replaceChildren();
        empty.hidden = true;
        const todos = await api.list({
            completed: completionFilter.value === '' ? undefined : completionFilter.value === 'true',
            priority: priorityFilter.value || undefined,
        });
        list.replaceChildren(...todos.map(renderTodo));
        empty.hidden = todos.length !== 0;
    }

    async function run(action) {
        controls.disabled = true;
        status.textContent = '処理中…';
        errorMessage.textContent = '';
        try {
            await action();
        } catch (error) {
            errorMessage.textContent = error.message;
        } finally {
            status.textContent = '';
            controls.disabled = false;
        }
    }

    function renderTodo(todo) {
        const row = document.createElement('li');
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        const prioritySelect = priority.cloneNode(true);
        const remove = document.createElement('button');

        checkbox.type = 'checkbox';
        checkbox.checked = todo.isCompleted;
        label.append(checkbox, ' ', todo.title);
        prioritySelect.removeAttribute('id');
        prioritySelect.setAttribute('aria-label', todo.title + 'の優先度');
        prioritySelect.value = todo.priority;
        remove.type = 'button';
        remove.textContent = '削除';
        remove.setAttribute('aria-label', todo.title + 'を削除');

        function update(changes, restore) {
            return run(async () => {
                try {
                    await api.update(todo.id, changes);
                } catch (error) {
                    restore();
                    throw error;
                }
                await refresh();
            });
        }
        checkbox.addEventListener('change', () => update(
            { isCompleted: checkbox.checked },
            () => { checkbox.checked = todo.isCompleted; },
        ));
        prioritySelect.addEventListener('change', () => update(
            { priority: prioritySelect.value },
            () => { prioritySelect.value = todo.priority; },
        ));
        remove.addEventListener('click', () => run(async () => {
            await api.remove(todo.id);
            await refresh();
        }));

        row.append(label, ' ', prioritySelect, ' ', remove);
        return row;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        run(async () => {
            await api.create(title.value, priority.value);
            form.reset();
            await refresh();
        });
    });
    completionFilter.addEventListener('change', () => run(refresh));
    priorityFilter.addEventListener('change', () => run(refresh));
    run(refresh);
}

const todoV2Root = document.getElementById('todo-v2');
if (todoV2Root) startTodoV2(todoV2Root);
