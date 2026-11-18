# TODOアプリ V1 実装計画

根拠は [要件定義書](01_requirements.md) の REQ-01〜REQ-04 と [設計書](02_design.md)。以下を順番に実施し、各工程の確認が通ってから次へ進む。

PowerShell のコマンドは `package.json` があるリポジトリ直下で実行する。HTTP確認は別のターミナルでサーバーを起動した状態で行う。以下の `$base` は確認用ターミナルで設定する。

```powershell
$base = 'http://localhost:3000'
```

## 0 作業ブランチを用意する

- **対象ファイル**　`docs/todo/01_requirements.md`、`docs/todo/02_design.md`、`docs/todo/03_implementation_plan.md`。
- **作業内容**　現在の変更を確認し、`main` を起点にTODO用のブランチを作る。授業でブランチ名の指定があればそれを使う。3文書を確認し、対象を指定してGitに追加する。
- **確認コマンド**　`git status --short --branch`、`git switch -c codex/todo-v1`、`git branch --show-current`。文書を確認したら `git add -- docs/todo/01_requirements.md docs/todo/02_design.md docs/todo/03_implementation_plan.md` と `git diff --cached --name-only` を実行する。
- **期待結果**　TODO用ブランチ上で作業しており、3文書がGitの管理対象になっている。ステージ済みの文書を確認してコミットする。
- **失敗時に最初に見る場所**　`git status --short --branch` のブランチ名と既存の変更、`git diff --cached --name-only` の対象一覧。

## 1 変更前の基準を確認する

- **対象ファイル**　`index.ts`、`db.ts`、`tsconfig.json`、`package.json`。
- **作業内容**　既存の `npm run dev`（tsx）で起動する。ルートの `db.ts` が dotenv で `DATABASE_URL` を読み込み、既存の `pool` を提供する。接続設定や秘密情報の値は表示せず、起動と接続結果を確認する。
- **確認コマンド**　`npm run build`、`npm run dev`。別ターミナルで `curl.exe -i "$base/"`、`curl.exe -i "$base/api/db-check"`、`curl.exe -i "$base/db-sample"`、`curl.exe -i "$base/db-sample/new"`。
- **期待結果**　ビルド成功。トップと商品登録フォームは `200`、DB接続確認は `200` と `database: "connected"`。商品一覧の結果も記録し、変更後に比較する。
- **失敗時に最初に見る場所**　起動時はターミナルの最初のエラー。DB接続失敗時は `DATABASE_URL` の設定有無と `db.ts`。商品一覧だけ失敗する場合は `products` テーブルの有無を確認する。

## 2 テーブル作成SQLをGitに保存する

- **対象ファイル**　`sql/todo/020_create_todo_tasks.sql`。
- **作業内容**　設計書の4列で `todo_tasks` の作成SQLを書く。自動採番の主キー、必須列、`false` と `NOW()` の既定値を定義する。この工程ではSQLをGitに記録する。
- **確認コマンド**　`git add -- sql/todo/020_create_todo_tasks.sql`、`git diff --cached -- sql/todo/020_create_todo_tasks.sql`。内容とステージ済みファイルを確認し、`git commit -m "Add TODO table SQL" -- sql/todo/020_create_todo_tasks.sql` を実行する。`git show HEAD:sql/todo/020_create_todo_tasks.sql` で保存結果を確認する。
- **期待結果**　設計どおりのDDLがコミットに入り、接続文字列やデータ削除SQLを含まない。
- **失敗時に最初に見る場所**　ステージ済み差分とファイルの保存先。ほかの変更がステージ済みなら、コミット前に `git diff --cached --name-only` で確認する。

## 3 Neon SQL Editorで手動実行する

- **対象**　工程2のSQLファイルと、学生自身のNeonの対象ブランチ・DB。
- **作業内容**　既存の `DATABASE_URL` が参照するブランチ・DBをNeon SQL Editorで選択し、工程2でコミットしたSQLを貼り付けて実行する。既に同名テーブルがあれば、先に列と制約を照合する。
- **確認コマンド**　Neon SQL Editorで次のSQLを実行する。

  ```sql
  SELECT column_name, data_type, is_nullable, is_identity, column_default
  FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'todo_tasks'
  ORDER BY ordinal_position;
  SELECT id, title, is_completed, created_at FROM todo_tasks ORDER BY id;
  ```

- **期待結果**　4列を取得でき、型、必須制約、既定値が設計と一致する。既存データは保持する。
- **失敗時に最初に見る場所**　SQL Editorのエラーと、選択中のブランチ・DB・スキーマ。

## 4 TODO画面の骨組みとルータ登録を追加する

- **対象ファイル**　`views/todo/index.ejs`、`src/apps/todo/todoRouter.ts`、`index.ts`。
- **作業内容**　EJSにタイトル欄、追加ボタン、一覧領域、状態表示欄を作る。`todoRouter.ts` から画面用の `todoPageRouter` を名前付きで公開し、相対パス `GET /` で `res.render('todo/index')` を実行する。`index.ts` の既存importの直後に `import { todoPageRouter } from './src/apps/todo/todoRouter';` を加える。既存の `/api/db-check` 定義の後、起動処理の前に `app.use('/todo', todoPageRouter);` を追加する。既存ルート、静的配信、フォーム用パーサー、ローカル起動処理、アプリのexportを保持する。
- **確認コマンド**　`curl.exe -i "$base/todo"`。
- **期待結果**　`/todo` は `200` で画面の骨組みを返す。`tsconfig.json` の `include` は `index.ts` だが、importしたTODOのTypeScriptファイルもコンパイルされる。`package.json` の変更や依存追加は不要。
- **失敗時に最初に見る場所**　404なら `index.ts` の登録とルータのパス。ビューエラーなら `views/todo/index.ejs` と `res.render` の引数。

## 5 一覧APIを追加する REQ-01

- **対象ファイル**　`index.ts` と `src/apps/todo/` の `todoRouter.ts`、`todoController.ts`、`todoModel.ts`。
- **作業内容**　`todoRouter.ts` からAPI用の `todoRouter` を名前付きで公開し、相対パス `GET /` を定義する。`index.ts` のTODO用importに `todoRouter` を加え、画面用ルータの登録直後に `app.use('/api/v1/todos', todoRouter);` を追記する。JSONパーサーとエラーハンドラーはAPI用ルータの中に置く。モデルは `../../../db` から既存の `pool` を読み込み、`todo_tasks` をID昇順で取得する。DB列を `id`、`title`、`isCompleted`、`createdAt` に変換する。DB接続不可は `503 DB_UNAVAILABLE`、SQL実行エラーなどは `500 INTERNAL_ERROR` とし、共通JSONで応答する。
- **確認コマンド**　`npm run build`、`curl.exe -i "$base/api/v1/todos"`。
- **期待結果**　`200`、`status: "success"`、ID昇順の `data`。各 `createdAt` は UTC の ISO 8601 形式とする。初回の空DBまたは講師指定の隔離環境では `data: []`。
- **REQ-01の完了条件**　APIでID昇順と0件時の空配列を確認し、工程10で画面の一覧と「TODOがありません」を確認できる。
- **失敗時に最初に見る場所**　404なら `index.ts` のマウントとAPI用ルータの相対パス。500ならサーバーログと工程3のテーブル。503ならDB接続を確認する。

## 6 登録APIを追加する REQ-02

- **対象ファイル**　`src/apps/todo/` のルータ、コントローラ、モデル。
- **作業内容**　API用ルータに相対パス `POST /` を追加する。`title` の必須・型・空白除去後の長さを検証し、パラメータ付きの `INSERT ... RETURNING` で保存する。
- **確認コマンド**　`npm run build` の後、次を実行する。返った `data.id` を後続工程用に控える。

  ```powershell
  $title = 'todo-v1-' + [guid]::NewGuid().ToString('N')
  @{ title = " $title " } | ConvertTo-Json -Compress | curl.exe -i -H 'Content-Type: application/json' --data-binary '@-' "$base/api/v1/todos"
  '{}' | curl.exe -i -H 'Content-Type: application/json' --data-binary '@-' "$base/api/v1/todos"
  @{ title = ' ' } | ConvertTo-Json -Compress | curl.exe -i -H 'Content-Type: application/json' --data-binary '@-' "$base/api/v1/todos"
  ```

- **期待結果**　正常時は `201`、空白除去済みのタイトル、`isCompleted: false`。欠落・型違い・壊れたJSONは `400`、空白だけ・101文字は `422`。1文字と100文字は登録できる。境界値テストで作った行のIDも控える。
- **REQ-02の完了条件**　有効なタイトルが未完了で保存され、再取得で空白除去済みの値を確認できる。不正な入力は対応するステータスになり、行は追加されない。
- **失敗時に最初に見る場所**　API用ルータのJSONパーサー、コントローラの検証順序、モデルの `INSERT`。

## 7 完了切替APIを追加する REQ-03

- **対象ファイル**　`src/apps/todo/` のルータ、コントローラ、モデル。
- **作業内容**　API用ルータに相対パス `PATCH /:id` を追加する。1以上の整数IDと真偽値の `isCompleted` を検証し、該当行の `is_completed` だけを更新する。
- **確認コマンド**　`npm run build`。PowerShellで `$id = Read-Host '工程6で取得した自分のID'` を実行し、次の操作を試す。

  ```powershell
  @{ isCompleted = $true } | ConvertTo-Json -Compress | curl.exe -i -X PATCH -H 'Content-Type: application/json' --data-binary '@-' "$base/api/v1/todos/$id"
  curl.exe -i "$base/api/v1/todos"
  ```

- **期待結果**　`200` で更新済みのTODOが返り、再取得しても状態が保持される。`$false` でも確認する。ID `0`、空本文、真偽値以外は `400`。有効だが存在しないと確認したIDは `404`。タイトルは変わらない。
- **REQ-03の完了条件**　自分が登録したIDで完了・未完了の両方向を確認でき、再取得で対象行の完了状態だけが変わっている。不正入力は `400`、対象なしは `404` になる。
- **失敗時に最初に見る場所**　パス引数と本文の検証、`UPDATE` の `WHERE` 条件と引数の順序。

## 8 削除APIを追加する REQ-04

- **対象ファイル**　`src/apps/todo/` のルータ、コントローラ、モデル。
- **作業内容**　API用ルータに相対パス `DELETE /:id` を追加する。IDを検証し、対象行をパラメータ付きSQLで削除する。削除件数に応じてステータスを返す。
- **確認コマンド**　`npm run build`。工程7と同じ `$id` で以下を実行する。

  ```powershell
  curl.exe -i -X DELETE "$base/api/v1/todos/$id"
  curl.exe -i "$base/api/v1/todos"
  curl.exe -i -X DELETE "$base/api/v1/todos/$id"
  curl.exe -i -X DELETE "$base/api/v1/todos/0"
  ```

- **期待結果**　順に、本文なしの `204`、対象行のない一覧、`404 NOT_FOUND`、`400 BAD_REQUEST`。自分が登録した境界値テスト用の行も、控えたIDで片付ける。
- **REQ-04の完了条件**　削除後の一覧から対象行が消え、成功時は本文なしの `204`、同じIDの再削除は `404`、不正IDは `400` になる。
- **失敗時に最初に見る場所**　コントローラの削除件数の判定、`204` の応答処理、SQLの対象ID。

## 9 TodoApiを単体で確認する

- **対象ファイル**　`public/todo/todo.js`。
- **作業内容**　`TodoApi` の `list()`、`create(title)`、`setCompleted(id, isCompleted)`、`remove(id)` をFetchで実装する。成功JSONから `data` を取り出し、`204` は本文を解析せず、APIエラーの `code` と `message` を画面側へ渡せるようにする。
- **確認コマンド**　ローカルの `/todo` を開き、JSをEJSに組み込む前にConsoleから同一オリジンのスクリプトを読み込んで確認する。

  ```js
  const script = document.createElement('script');
  script.src = '/todo/todo.js';
  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  const api = new TodoApi();
  await api.list();
  const created = await api.create('todo-api-' + Date.now());
  await api.setCompleted(created.id, true);
  await api.remove(created.id);
  await api.list();
  ```

- **期待結果**　Networkに4種類のHTTP操作が現れる。登録と更新でTODOを取得でき、削除が `204` でもJSON解析エラーにならない。最後の一覧にテスト行がない。
- **失敗時に最初に見る場所**　Networkのスクリプト取得とAPI応答、Consoleの最初の例外、`TodoApi` のFetch設定と `204` の分岐。

## 10 ブラウザの画面から4操作を確認する

- **対象ファイル**　`public/todo/todo.js`、`views/todo/index.ejs`。
- **作業内容**　EJSで `/todo/todo.js` を読み込み、画面イベントと `TodoApi` をつなぐ。処理中・空一覧・エラーを表示し、成功後は一覧を再取得する。タイトルは `textContent` で描画する。
- **確認コマンド**　ブラウザで `/todo` を再読み込みし、Networkを見ながら画面上で4操作を実行する。
- **期待結果**　JSが `200` で読み込まれ、画面の4操作が対応するAPIを呼ぶ。通信エラーや入力エラーを画面で確認でき、切替失敗時はチェック状態が戻る。隔離環境で0件なら「TODOがありません」を表示する。
- **失敗時に最初に見る場所**　NetworkのJSとAPIのURL・応答、Consoleの最初の例外、EJS側の要素とイベントの対応。

## 11 ビルド成果物を確認する

- **対象ファイル**　`package.json`、`tsconfig.json`、`index.ts`、`src/apps/todo/`。
- **作業内容**　既存のビルドコマンドで本番起動用のJSを生成する。
- **確認コマンド**　`npm run build`。成功後に `Get-Item dist/index.js,dist/src/apps/todo/todoRouter.js` を実行する。
- **期待結果**　TypeScriptのエラーがなく、エントリーポイントとTODOルータのJSが出力される。
- **失敗時に最初に見る場所**　TypeScriptの最初のエラーと `index.ts` のimport、`tsconfig.json` の出力先。

## 12 ローカルの回帰テストを行う

- **対象ファイル**　`dist/index.js`、`docs/todo/04_test_results.md`。
- **作業内容**　開発サーバーを止めて `npm start` で起動する。ローカルのURL・日時・結果を記録する。
- **確認コマンド**　`$base = 'http://localhost:3000'` を設定し、工程1の既存ルート、工程5〜8のAPI、工程10の画面操作を確認する。
- **期待結果**　ビルド済みアプリでも既存ルートは変更前と同じ結果となり、REQ-01〜REQ-04の確認を通過する。
- **失敗時に最初に見る場所**　`npm start` の出力、ビルド成果物、EJSや静的ファイルの参照先。

## 13 Vercel Previewで確認する

- **対象ファイル**　PRの変更一式、`docs/todo/04_test_results.md`。
- **作業内容**　確認済みの変更をコミット・pushしてPRを作成する。Previewの `DATABASE_URL` が学生自身のNeon DBを参照することをVercelで確認する。
- **確認コマンド**　Preview URLを `$base` に設定し、工程12と同じHTTP・画面確認を行う。アクセス保護が有効なら、サインイン済みブラウザとNetworkで応答を確認する。
- **期待結果**　PRのPreviewで既存ルートとREQ-01〜REQ-04を確認できる。URL・日時・結果を記録する。
- **失敗時に最初に見る場所**　対象コミットのVercel Build Logs。ビルド成功後に失敗する場合は対象PreviewのRuntime Logsと環境変数設定。

## 14 Vercel Productionで確認する

- **対象ファイル**　マージ済みの変更一式、`docs/todo/04_test_results.md`。
- **作業内容**　Previewの確認後にPRをマージする。ProductionがPreviewと同じ学生用Neon DBを参照する設定を確認し、マージしたコミットのデプロイ完了を待つ。
- **確認コマンド**　本番URLを `$base` に設定し、工程12と同じHTTP・画面確認を行う。
- **期待結果**　本番で既存ルートとREQ-01〜REQ-04を確認できる。URL・日時・結果を記録する。
- **失敗時に最初に見る場所**　本番に割り当てられたデプロイとコミット、該当デプロイのBuild LogsまたはRuntime Logs。

各環境では一意な架空タイトルと自分が登録したIDを使う。共有DBの既存行は削除しない。初回の空DBまたは講師指定の隔離環境で0件を確認し、実施できなければ理由を記録する。エラー応答では共通JSONと空配列の `details` を確認する。`500` と `503` の再現は隔離環境を用意できる場合に行い、用意できなければ「未実施」と理由を記録する。
