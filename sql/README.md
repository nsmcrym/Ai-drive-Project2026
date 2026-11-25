# TODO用SQLの実行記録

Neonのプロジェクトは `webapp-class`、ブランチは `production`、データベースは `neondb`。

Neon SQL Editorで対象のブランチとDBを確認してから、`todo/021_create_todo_tasks_v2.sql` を実行する。実行後は次を確認する。初回作成時のV2は0件で、V1の一覧は従来どおり取得できる。

```sql
SELECT id, title, priority FROM v2_todo_tasks ORDER BY id;
SELECT id, title, is_completed FROM todo_tasks ORDER BY id;
```

| SQL | Neonブランチ | DB | 実行日時 | 結果 |
| --- | --- | --- | --- | --- |
| `020_create_todo_tasks.sql` | production | neondb | 2026-11-18（時刻不明） | `todo_tasks` を作成済み（実行者報告）。実DBで取得・登録・更新・削除を確認済み |
| `021_create_todo_tasks_v2.sql` | production | neondb | 2026-11-18（時刻不明） | `v2_todo_tasks` を作成し、V2とV1のSELECTを確認済み（実行者報告） |

記録にはブランチ名とDB名を使う。接続文字列、パスワード、個人情報は記載しない。
