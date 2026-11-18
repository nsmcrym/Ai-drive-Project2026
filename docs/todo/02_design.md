# TODOアプリ V1 設計書

根拠は [01_requirements.md](01_requirements.md) の REQ-01〜REQ-04 と共通仕様。

## 1 作るものとファイルの役割

既存の Express＋TypeScript＋EJS サイトに `/todo` と `/api/v1/todos` を追加する。画面から一覧取得、登録、完了切替、削除を行う。認証、優先度、絞り込み、タイトル更新はV1の対象外とする。

| ファイル | 役割 |
| --- | --- |
| `index.ts` | 既存のExpress起動処理、`/`、`/api/db-check`、商品サンプルのルートを維持し、TODOルータを登録する |
| `db.ts` | 既存の `DATABASE_URL` でNeon PostgreSQLへ接続する `pool` を提供する |
| `src/apps/todo/todoRouter.ts` | 画面用の `todoPageRouter` とAPI用の `todoRouter` を公開する。API用ルータにJSONパーサーとエラーハンドラーを置く |
| `src/apps/todo/todoController.ts` | 入力を検証し、モデルを呼び出してHTTP応答を返す |
| `src/apps/todo/todoModel.ts` | 既存の `pool` でSQLを実行し、DBの行をAPI用のTODOに変換する |
| `views/todo/index.ejs` | TODO画面のEJSテンプレート。配置は確定 |
| `public/todo/todo.js` | `TodoApi` と画面イベント処理を置く |
| `sql/todo/020_create_todo_tasks.sql` | `todo_tasks` の作成SQLを置く |
| `docs/todo/04_test_results.md` | 環境別のURL・日時・確認結果を記録する |

## 2 リクエストはどこを通るか

`GET /todo` は Express → TODOルータ → EJS の順で処理する。画面が読み込まれるとブラウザがFetchで一覧APIを呼ぶ。各APIは Fetch → ルータ → コントローラ → モデル → 既存の `pool` → Neon の順で処理する。モデルから受け取った結果はコントローラがHTTP応答にし、画面は結果を表示に反映する。

`index.ts` の既存importの直後に次の1行を追加する。

```ts
import { todoPageRouter, todoRouter } from './src/apps/todo/todoRouter';
```

既存の `app.get('/api/db-check', ...)` の定義が終わった後、サーバー起動処理の前に次の2行を追加する。

```ts
app.use('/todo', todoPageRouter);
app.use('/api/v1/todos', todoRouter);
```

画面用ルータは相対パス `GET /` で `res.render('todo/index')` を実行する。API用ルータには相対パス `GET /`、`POST /`、`PATCH /:id`、`DELETE /:id` を定義する。JSONの解析とAPIエラー処理は `todoRouter` 内に置く。

## 3 DBの設計

| 列 | 型と制約 |
| --- | --- |
| `id` | `INTEGER`、自動採番、主キー |
| `title` | `TEXT NOT NULL` |
| `is_completed` | `BOOLEAN NOT NULL DEFAULT FALSE` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |

テーブル名は `todo_tasks` とする。モデルは `is_completed` を `isCompleted` に変換し、`created_at` は UTC の ISO 8601 形式（例 `2026-11-18T01:00:00.000Z`）で `createdAt` に変換する。タイトルやIDなどの値はプレースホルダーでSQLに渡す。

## 4 APIの共通ルール

GET・POST・PATCHの成功応答は `{"status":"success","data":...}` とし、TODOは `{id, title, isCompleted, createdAt}` を返す。POSTとPATCHのリクエスト本文はJSONとする。DELETE成功時は `204` を返し、本文は付けない。

エラーは `{"status":"error","code":"...","message":"...","details":[]}` に統一する。V1の `details` はすべてのエラーで空配列とする。表の `message` は表示文言の例とする。パスのIDは1以上の整数として検証する。タイトルは前後の空白を除いて1〜100文字とする。

## 5 機能別の設計

| 要件と画面操作 | メソッド・URL | リクエスト本文 | 成功・失敗のHTTPステータス | 応答JSON例 | `todo_tasks` のDB処理 | TodoApiメソッド | 確認方法 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-01 一覧取得。画面を開く | `GET /api/v1/todos` | なし | 成功 `200`。失敗 `500`、`503` | `{"status":"success","data":[{"id":7,"title":"課題を提出する","isCompleted":false,"createdAt":"2026-11-18T01:00:00.000Z"}]}`。0件は `{"status":"success","data":[]}` | `id`、`title`、`is_completed`、`created_at` を `ORDER BY id ASC` で取得する | `list()` | APIと画面でID昇順を確認する。空DBまたは隔離環境では `200` と空配列、画面の「TODOがありません」を確認する |
| REQ-02 登録。タイトルを入力して追加する | `POST /api/v1/todos` | `{"title":" 課題を提出する "}` | 成功 `201`。失敗 `400`、`422`、`500`、`503` | `{"status":"success","data":{"id":7,"title":"課題を提出する","isCompleted":false,"createdAt":"2026-11-18T01:00:00.000Z"}}` | 空白除去済みの `title` を挿入し、DBが `id` を採番し `is_completed` と `created_at` に既定値を設定する。4列を `RETURNING` で取得する | `create(title)` | 空白の除去、未完了での登録、再取得後の表示を確認する。1文字と100文字は `201`、空白のみと101文字は `422`、項目欠落・型違い・壊れたJSONは `400` を確認する |
| REQ-03 完了状態の部分更新。チェックボックスを切り替える | `PATCH /api/v1/todos/:id` | `{"isCompleted":true}` | 成功 `200`。失敗 `400`、`404`、`500`、`503` | `{"status":"success","data":{"id":7,"title":"課題を提出する","isCompleted":true,"createdAt":"2026-11-18T01:00:00.000Z"}}` | `WHERE id = $1` で対象を絞り、`is_completed` のみ更新する。4列を `RETURNING` で取得し、0行なら `404` を返す | `setCompleted(id, isCompleted)` | 自分のIDで完了・未完了の両方向を試し、再取得して状態以外は変わらないことを確認する。不正ID・空本文・真偽値以外は `400`、存在しない有効なIDは `404` を確認する |
| REQ-04 削除。対象行の削除ボタンを押す | `DELETE /api/v1/todos/:id` | なし | 成功 `204`。失敗 `400`、`404`、`500`、`503` | 成功時は本文なし。削除済みIDの例は `{"status":"error","code":"NOT_FOUND","message":"TODOが見つかりません。","details":[]}` | `WHERE id = $1` に一致した行を削除する。削除件数が0なら `404` を返す | `remove(id)` | 自分のIDで `204` と空本文を確認し、再取得して対象行が消えたことを確かめる。同じIDの再削除は `404`、不正なIDは `400` を確認する |

各操作の失敗時は第7節の共通形式で返す。登録時に空白だけのタイトルを渡した場合の例は `{"status":"error","code":"VALIDATION_ERROR","message":"タイトルは1〜100文字で入力してください。","details":[]}`。

## 6 画面とTodoApiの設計

画面に最大100文字のタイトル入力欄と追加ボタンを置き、各行に完了チェックボックスと削除ボタンを表示する。0件なら「TODOがありません」と表示する。タイトルはDOMの `textContent` で表示する。

`TodoApi` の公開メソッドは `list()`、`create(title)`、`setCompleted(id, isCompleted)`、`remove(id)` とする。共通のリクエスト処理でFetchを実行し、`204` は本文を読まずに成功として扱う。その他の成功応答から `data` を取り出す。APIのエラーは `code` と `message` を画面側へ渡す。

画面側がイベント、処理中表示、入力エラー、通信エラーを扱う。登録・更新・削除に成功した後は `list()` を呼び直す。完了切替に失敗した場合はチェック状態を元に戻す。

## 7 エラーはどこで処理するか

| 処理箇所 | 条件 | HTTPとコード |
| --- | --- | --- |
| APIルータのJSONパーサー | 壊れたJSON | `400 BAD_REQUEST` |
| コントローラ | 必須項目の欠落、型違い、不正なID、PATCHの空本文 | `400 BAD_REQUEST` |
| コントローラ | 空白除去後のタイトルが0文字または101文字以上 | `422 VALIDATION_ERROR` |
| コントローラ | 更新・削除対象の行が存在しない | `404 NOT_FOUND` |
| API用エラーハンドラー | 想定外の内部エラーやSQL実行エラー | `500 INTERNAL_ERROR` |
| API用エラーハンドラー | DB接続が利用できない | `503 DB_UNAVAILABLE` |

モデルからのエラーはAPI用エラーハンドラーへ渡す。DB接続を取得できない場合や接続切断と識別できる場合を503にし、それ以外のSQL実行エラーは500にする。詳細はサーバーのログで確認し、応答にはSQL文、接続文字列、内部エラーの詳細を含めない。

## 8 実装への注意事項

既存のDB接続と `DATABASE_URL` を使い、接続文字列や `.env` はGitに追加しない。PreviewとProductionは同じ学生用Neon DBを参照する。テストでは架空の一意なタイトルを登録し、自分が取得したIDだけを変更・削除する。0件テストは初回の空DBか講師が指定した隔離環境で実施し、実施できない場合は理由を記録する。

ローカル、Vercel Preview、PRマージ後のProductionで、4操作の正常系、入力エラー、存在しないID、画面操作、既存の `/` と `/api/db-check` を確認する。テスト結果にはREQ-01〜REQ-04と環境ごとのURL・日時・結果を記録する。

`500` と `503` の再現テストは隔離環境を用意できる場合に行う。用意できない場合はテスト結果に「未実施」と理由を記録する。
