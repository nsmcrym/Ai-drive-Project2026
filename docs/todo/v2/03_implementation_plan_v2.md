# TODOアプリ V2 実装計画

[V2要件](01_requirements_v2.md) と [V2設計](02_design_v2.md) に沿って、作業ブランチ `feature/todo-v2` で進める。PowerShellでローカルを確認する際は別ターミナルで `npm run dev` を起動する。

| 工程 | 対象と作業 | 確認方法と期待結果 | 失敗時に最初に見る場所 |
| --- | --- | --- | --- |
| 1 V1の基準確認 | 既存のV1画面・APIを確認する | `git status --short --branch`。ローカルの `/todo` でV1の4操作を試し、結果を記録する | 現在のブランチ、起動ログ、V1のネットワーク応答 |
| 2 SQLをGitに保存 | `sql/todo/021_create_todo_tasks_v2.sql` を確認し、コミットする | `git show HEAD:sql/todo/021_create_todo_tasks_v2.sql` でV2専用DDLを確認する | SQLのパス、ステージ済み差分 |
| 3 Neonで手動実行 | SQL Editorで021を実行し、`sql/README.md` に記録する | READMEの2つのSELECTで初回のV2が0件、V1が取得可能であることを確認する | Neonのブランチ・DB、SQL Editorのエラー |
| 4 一覧API | V2のModel・Controller・Routerを追加し、`index.ts` にAPIルータを登録する | `curl.exe -i "http://localhost:3000/api/v2/todos"` が `200` と配列を返す。登録APIの追加後に、単独条件・両条件・不正入力も試す | マウント先、絞り込みの検証、SQLの引数 |
| 5 登録API | V2の3ファイルに、タイトルと優先度を保存する処理を追加する | 優先度の指定あり・省略でPOSTし `201` を確認する。省略時は `normal`。応答の自分のIDを控える。不正値は `422` | JSONパーサー、入力検証、DBの既定値 |
| 6 部分更新API | V2の3ファイルに、それぞれの項目または両方を更新する処理を追加する | 自分のIDでPATCHし、再取得で変更を確認する。空本文は `400`、不正な優先度は `422`、存在しないIDは `404` | 本文の検証、UPDATEの対象列とプレースホルダー |
| 7 削除API | V2の3ファイルに削除処理を追加する | `curl.exe -i -X DELETE "http://localhost:3000/api/v2/todos/$id"`。自分のIDで本文なしの `204`、再削除で `404` | ID検証、削除件数、応答本文 |
| 8 画面 | EJSと `TodoApiV2` を追加し、`index.ts` に画面ルータを登録する | `/todo-v2` から4操作を実行し、NetworkでV2 APIを確認する。両フィルターで表示が切り替わる | 静的JSのURL、Console、Fetch先 |
| 9 ローカル回帰 | ビルドしてV1・V2を再確認する | `npm run build` と `npm start`。V1の4操作とV2の4操作を確認し、V2で作った行がV1の一覧に現れないことを確かめる | ビルド出力、起動ログ、参照テーブル |
| 10 Preview | push後にPRを作り、Previewで確認する | Preview URLで工程9のHTTP・画面確認を繰り返す。PRにV1との差分、021の実行先、V1回帰結果、Preview URLを書く | Build Logs、Runtime Logs、DB設定 |
| 11 Production | PRをマージした場合に両バージョンを確認する | 本番URLで工程9のHTTP・画面確認を繰り返す | 本番のコミットとRuntime Logs |

各環境の結果は [V2テスト結果](04_test_results_v2.md) に記録する。共有DBでは架空のデータを登録し、自分が作ったIDだけを更新・削除する。
