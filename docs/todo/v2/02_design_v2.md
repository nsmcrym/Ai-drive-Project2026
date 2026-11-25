# TODOアプリ V2 設計書

根拠は [V2要件定義](01_requirements_v2.md)。V1の `/todo`、`/api/v1/todos`、`TodoApi`、`todo_tasks` を維持する。V2の読み書きは `v2_todo_tasks` に限定し、V1データの移行は行わない。

## 1 ファイルとルーティング

| ファイル | 役割 |
| --- | --- |
| `src/apps/todo/v2/todoRouter.ts` | 画面・APIルータとV2用JSONエラー処理 |
| `src/apps/todo/v2/todoController.ts` | 入力検証とHTTP応答 |
| `src/apps/todo/v2/todoModel.ts` | 既存の `pool` によるSQL実行と行の変換 |
| `views/todo/v2/index.ejs` | V2画面のテンプレート |
| `public/todo/v2/todo.js` | `TodoApiV2` と画面操作 |
| `sql/todo/021_create_todo_tasks_v2.sql` | V2専用テーブルの作成 |

`index.ts` の既存TODOルータ登録の後、起動処理の前に `app.use('/todo-v2', todoPageRouterV2)` と `app.use('/api/v2/todos', todoRouterV2)` を追加する。画面ルータは `todo/v2/index` を描画し、ブラウザは `/todo/v2/todo.js` を読み込む。

## 2 DB

| DB列 | 型・制約 | APIキー |
| --- | --- | --- |
| `id` | INTEGER、自動採番、主キー | `id` |
| `title` | TEXT、必須、1〜100文字、空白だけの値を制約で拒否 | `title` |
| `is_completed` | BOOLEAN、必須、既定値 `false` | `isCompleted` |
| `priority` | TEXT、必須、既定値 `normal`、`low`・`normal`・`high` に制限 | `priority` |
| `created_at` | TIMESTAMPTZ、必須、既定値 `NOW()` | `createdAt`（UTCのISO 8601） |

値はプレースホルダーに渡す。絞り込みの条件は検証済み入力に対応する固定のSQL断片で組み立てる。V2で追加するDBオブジェクト名の先頭は `v2_` とする。

## 3 HTTPとTodoApiV2

| 要件 | HTTP・入力 | 成功 | DB処理 | ブラウザ側 |
| --- | --- | --- | --- | --- |
| V2-REQ-01 | GET `/api/v2/todos`。任意の `completed=true/false` と `priority=low/normal/high` | `200`、配列。0件は `data: []` | ID昇順で取得。2条件があればANDで結ぶ | `list({ completed, priority } = {})` |
| V2-REQ-02 | POST `/api/v2/todos`。例 `{"title":"課題を提出する","priority":"high"}` | `201`、追加したTODO | 検証・空白除去後にINSERTし、行を返す。優先度の省略時は既定値を使う | `create(title, priority)` |
| V2-REQ-03 | PATCH `/api/v2/todos/:id`。`isCompleted` または `priority` の少なくとも一方 | `200`、更新したTODO | IDで対象を特定し、送られた列だけを単一のUPDATEで変更する | `update(id, changes)` |
| V2-REQ-04 | DELETE `/api/v2/todos/:id`。本文なし | `204`、本文なし | IDで削除し、件数を確認する | `remove(id)` |

POST・PATCHはJSONを用いる。成功本文の例は `{"status":"success","data":{"id":1,"title":"課題を提出する","isCompleted":false,"priority":"high","createdAt":"2026-11-18T01:00:00.000Z"}}`。GETでは `data` にTODOの配列を返す。

| HTTP・コード | 条件 |
| --- | --- |
| `400 BAD_REQUEST` | JSON・ID・型・必須項目の不備、空のPATCH、`completed` が `true` または `false` 以外、同じ絞り込みキーの複数指定 |
| `422 VALIDATION_ERROR` | タイトルが空白除去後に1〜100文字の範囲外、文字列の優先度が許可値の範囲外 |
| `404 NOT_FOUND` | 更新・削除対象の有効なIDが存在しない |
| `500 INTERNAL_ERROR` | アプリ内部またはSQL実行エラー |
| `503 DB_UNAVAILABLE` | DB接続を利用できない |

V1と同じエラーJSONを使う。例は `{"status":"error","code":"VALIDATION_ERROR","message":"優先度を確認してください。","details":[]}`。

## 4 画面

登録フォームでタイトルと優先度を指定し、一覧の各行で完了状態・優先度の変更と削除ができるようにする。絞り込み欄は完了状態と優先度を独立して選べるようにし、変更後も選択中の条件で一覧を取得する。タイトルは `textContent` で描画し、処理中、空一覧、エラーを表示する。`TodoApiV2.remove` は204の本文を解析しない。
