>>>>> lang=en
### Removed

- Error categories `InlineNonEmptyCompound` (was § 6.7) and
  `InvalidTypedScalar` (was § 6.9). The numbers are reserved so
  older error catalogs don't renumber. Implementations MUST NOT
  emit errors labelled with these names when parsing 0.5.0
  documents.

### Versioning

`versions/0.5/` is a new top-level format directory. The 0.1.x
spec at `versions/0.1/` remains in the repository for legacy
parsers that wish to support the older syntax in parallel.

>>>>> lang=ru
### Удалено

- Категории ошибок `InlineNonEmptyCompound` (была § 6.7) и
  `InvalidTypedScalar` (была § 6.9). Номера зарезервированы.
  Реализации MUST NOT эмиттить ошибки с этими метками для
  0.5.0-документов.

### Версионирование

`versions/0.5/` — новая директория формата верхнего уровня.
Спецификация 0.1.x в `versions/0.1/` остаётся в репозитории для
устаревших парсеров, желающих параллельно поддерживать старый
синтаксис.

>>>>> lang=zh
### 移除

- 错误类别 `InlineNonEmptyCompound`(原 § 6.7)与
  `InvalidTypedScalar`(原 § 6.9)。其编号保留。实现 MUST NOT
  对 0.5.0 文档输出标签为此名称的错误。

### 版本控制

`versions/0.5/` 为新的顶层格式目录。`versions/0.1/` 处的 0.1.x
规范保留在仓库中,以便希望并行支持旧语法的旧解析器。

