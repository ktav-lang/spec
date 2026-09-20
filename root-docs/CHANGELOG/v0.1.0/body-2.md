>>>>> lang=en
- Implicit top-level Object.
- `key: value` pairs; dotted keys (`a.b.c: 1`) expand to nested
  Objects.
- `key:: value` forces a literal String.
- Typed-scalar markers `:i` (Integer) and `:f` (Float), both in
  pair position and as array-item prefixes.
- Integer and Float Value kinds — numeric strings that preserve
  textual form for round-trip and arbitrary precision.
- Keywords `null`, `true`, `false` (strict lowercase only).
- Multi-line compounds `{ ... }` and `[ ... ]` with closing bracket on
  its own line; empty `{}` / `[]` inline.
- Multi-line strings `( ... )` (stripped common indent) and
  `(( ... ))` (verbatim).
- `:: value` as an array-item prefix for literal Strings inside
  arrays; `:i value` / `:f value` for Integer / Float items.
- **Mandatory space after the separator** (§ 5.3 / § 5.4): every pair
  separator (`:`, `::`, `:i`, `:f`) and every array-item marker
  (`::`, `:i`, `:f`) MUST be followed by at least one ASCII-whitespace
  byte **or** by the end of the line. Glued forms — the separator
  welded to its body with no whitespace — are a `MissingSeparatorSpace`
  error (§ 6.10); example error documents: `key:value`, `port:i42`,
  `ratio:f0.5`. The empty-value forms `key:` / `key::` (EOL right after
  the separator) are legal.
- `#` at line start = comment; no inline comments.

### Error categories (§ 6)

`UnbalancedBracket`, `MismatchedBracket`, `DuplicateName`,
`PathConflict`, `InvalidKey`, `EmptyKey`, `OrphanLine`,
`InlineNonEmptyCompound`, `InvalidTypedScalar`, `MissingSeparatorSpace`.

Directory: [`versions/0.1/`](https://github.com/ktav-lang/spec/tree/1d5dc09/versions/0.1/) — removed from the current tree at `c9593e8`; this links to the last commit where it still existed.
>>>>> lang=ru
- Неявный Object верхнего уровня.
- Пары `key: value`; точечные ключи (`a.b.c: 1`) разворачиваются во
  вложенные Object-ы.
- `key:: value` принудительно задаёт литеральную String.
- Типовые скалярные маркеры `:i` (Integer) и `:f` (Float) — как в
  pair-позиции, так и в качестве префиксов array-item.
- Value-типы Integer и Float — числовые строки, сохраняющие
  текстовую форму для round-trip и произвольной точности.
- Ключевые слова `null`, `true`, `false` (только нижний регистр).
- Многострочные составные значения `{ ... }` и `[ ... ]` с закрывающей
  скобкой на отдельной строке; пустые `{}` / `[]` — инлайн.
- Многострочные строки `( ... )` (со снятием общего отступа) и
  `(( ... ))` (побайтово).
- `:: value` — префикс элемента массива для литеральной String внутри
  массивов; `:i value` / `:f value` — для элементов Integer / Float.
- **Обязательный пробел после разделителя** (§ 5.3 / § 5.4): каждый
  разделитель пары (`:`, `::`, `:i`, `:f`) и каждый маркер элемента
  массива (`::`, `:i`, `:f`) должен сопровождаться хотя бы одним
  ASCII-пробельным байтом **либо** концом строки. Склеенные формы —
  разделитель приклеен к body без пробела — являются ошибкой
  `MissingSeparatorSpace` (§ 6.10); примеры ошибочных документов:
  `key:value`, `port:i42`, `ratio:f0.5`. Пустое значение в виде
  `key:` или `key::` (EOL сразу за разделителем) допустимо.
- `#` в начале строки — комментарий; инлайн-комментарии не
  поддерживаются.

### Категории ошибок (§ 6)

`UnbalancedBracket`, `MismatchedBracket`, `DuplicateName`,
`PathConflict`, `InvalidKey`, `EmptyKey`, `OrphanLine`,
`InlineNonEmptyCompound`, `InvalidTypedScalar`, `MissingSeparatorSpace`.

Каталог: [`versions/0.1/`](https://github.com/ktav-lang/spec/tree/1d5dc09/versions/0.1/) — удалён из текущего дерева в `c9593e8`; ссылка ведёт на последний коммит, где он ещё существовал.
>>>>> lang=zh
- 隐式的顶层 Object。
- `key: value` 键值对;点分键(`a.b.c: 1`)展开为嵌套的 Object。
- `key:: value` 强制将值解释为字面量 String。
- 类型标量标记 `:i`(Integer)与 `:f`(Float) —— 既可用于 pair
  位置,也可作为 array-item 前缀。
- Integer 与 Float 的 Value 类型 —— 保留文本形式的数值字符串,
  以支持往返与任意精度。
- 关键字 `null`、`true`、`false`(严格小写)。
- 多行复合值 `{ ... }` 和 `[ ... ]`,闭合括号独占一行;空值 `{}` /
  `[]` 写作行内形式。
- 多行字符串 `( ... )`(剥除公共缩进)与 `(( ... ))`(原样保留)。
- 在数组中,`:: value` 作为元素前缀,表示字面量 String;
  `:i value` / `:f value` 作为 Integer / Float 元素。
- **分隔符后的强制空白**(§ 5.3 / § 5.4):每个键值对分隔符
  (`:`、`::`、`:i`、`:f`)与每个数组元素标记
  (`::`、`:i`、`:f`)**MUST** 后接至少一个 ASCII 空白字节,
  **或**该行结束。分隔符与 body 之间无空白的「粘连形式」属于
  `MissingSeparatorSpace` 错误(§ 6.10);错误示例文档:
  `key:value`、`port:i42`、`ratio:f0.5`。空值写法 `key:` / `key::`
  (分隔符后紧随 EOL)是合法的。
- 行首 `#` 为注释;不支持行内注释。

### 错误类别(§ 6)

`UnbalancedBracket`、`MismatchedBracket`、`DuplicateName`、
`PathConflict`、`InvalidKey`、`EmptyKey`、`OrphanLine`、
`InlineNonEmptyCompound`、`InvalidTypedScalar`、
`MissingSeparatorSpace`。

目录: [`versions/0.1/`](https://github.com/ktav-lang/spec/tree/1d5dc09/versions/0.1/) — 已从当前树中移除（`c9593e8`）；此链接指向该目录仍存在的最后一次提交。
