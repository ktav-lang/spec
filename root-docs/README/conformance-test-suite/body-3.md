>>>>> lang=en
The versioned `scripts/locks/corpus-inventory.0.8.lock.json` maps every
corpus-relative 0.8 path in `valid/`, `invalid/`, `unrepresentable/`,
`parseable-unrepresentable/`, and `strict-lossy/`, plus
`boundary-fixtures.json`, to its SHA-256 digest. CI passes the matching
lock to `validate_corpus.py --corpus-inventory-lock`:

>>>>> lang=ru
Versioned `scripts/locks/corpus-inventory.0.8.lock.json`
отображает каждый относительный путь 0.8 в `valid/`, `invalid/`,
`unrepresentable/`, `parseable-unrepresentable/` и `strict-lossy/`, а
также `boundary-fixtures.json`, на его SHA-256. CI передаёт
соответствующий lock в `validate_corpus.py --corpus-inventory-lock`:

>>>>> lang=zh
Versioned `scripts/locks/corpus-inventory.0.8.lock.json` 将 0.8
`valid/`、`invalid/`、`unrepresentable/`、`parseable-unrepresentable/`、
`strict-lossy/` 中的每个 corpus-relative 文件路径及
`boundary-fixtures.json` 映射到其 SHA-256。CI 将对应的 lock
传给 `validate_corpus.py --corpus-inventory-lock`：

