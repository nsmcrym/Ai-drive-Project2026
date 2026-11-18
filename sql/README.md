# TODO用SQLの実行記録

Neon SQL Editorで対象のブランチとDBを確認してから、`todo/021_create_todo_tasks_v2.sql` を実行する。実行後は次を確認する。初回作成時のV2は0件で、V1の一覧は従来どおり取得できる。

```sql
SELECT id, title, priority FROM v2_todo_tasks ORDER BY id;
SELECT id, title, is_completed FROM todo_tasks ORDER BY id;
```

| SQL | Neonブランチ | DB | 実行日時 | 結果 |
| --- | --- | --- | --- | --- |
| `020_create_todo_tasks.sql` | 要確認 | 要確認 | 要確認 | `todo_tasks` はNeonで取得・登録・更新・削除を確認済み。020の実行履歴と対象は要確認 |
| `021_create_todo_tasks_v2.sql` | 要確認 | 要確認 | 要確認 | Neon SQL Editorで作成し、V2とV1のSELECTを確認済み（実行者報告） |

記録にはブランチ名とDB名を使う。接続文字列、パスワード、個人情報は記載しない。
