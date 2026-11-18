class TodoApi {
    async request(path = '', method = 'GET', body) {
        let response;
        try {
            response = await fetch('/api/v1/todos' + path, {
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
            if (payload?.status === 'error') {
                throw new Error(`${payload.message} (${payload.code})`);
            }
            throw new Error(`リクエストに失敗しました (HTTP ${response.status})。`);
        }
        if (payload?.status !== 'success') {
            throw new Error('APIからの応答を読み取れませんでした。');
        }
        return payload.data;
    }

    list() {
        return this.request();
    }

    create(title) {
        return this.request('', 'POST', { title });
    }

    setCompleted(id, isCompleted) {
        return this.request('/' + encodeURIComponent(id), 'PATCH', { isCompleted });
    }

    remove(id) {
        return this.request('/' + encodeURIComponent(id), 'DELETE');
    }
}

const todoApp = document.getElementById('todo-app');
if (todoApp) {
    startTodoPage(todoApp);
}

function startTodoPage(app) {
    const api = new TodoApi();
    const controls = app.querySelector('#todo-controls');
    const form = app.querySelector('#todo-form');
    const title = app.querySelector('#todo-title');
    const empty = app.querySelector('#todo-empty');
    const list = app.querySelector('#todo-list');
    const status = app.querySelector('#todo-status');
    const errorMessage = app.querySelector('#todo-error');

    async function refresh() {
        const todos = await api.list();
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
        const text = document.createElement('span');
        const remove = document.createElement('button');

        checkbox.type = 'checkbox';
        checkbox.checked = todo.isCompleted;
        text.textContent = todo.title;
        label.append(checkbox, ' ', text);

        checkbox.addEventListener('change', () => run(async () => {
            try {
                await api.setCompleted(todo.id, checkbox.checked);
                todo.isCompleted = checkbox.checked;
            } catch (error) {
                checkbox.checked = todo.isCompleted;
                throw error;
            }
            await refresh();
        }));

        remove.type = 'button';
        remove.textContent = '削除';
        remove.setAttribute('aria-label', todo.title + 'を削除');
        remove.addEventListener('click', () => run(async () => {
            await api.remove(todo.id);
            row.remove();
            empty.hidden = list.childElementCount !== 0;
            await refresh();
        }));
        row.append(label, ' ', remove);
        return row;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        run(async () => {
            await api.create(title.value);
            form.reset();
            await refresh();
        });
    });

    run(refresh);
}
