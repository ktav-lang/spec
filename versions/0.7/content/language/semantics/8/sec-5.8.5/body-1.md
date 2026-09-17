>>>>> lang=en

- Multi-line strings (`(`/`((` openers). An inline compound is by
  definition single-line; a multi-line opener inside it would
  require continuation onto subsequent lines, which is impossible
  by § 3.2.
- Multi-line scope changes. A `{` or `[` byte at the start of an
  inline value opens a *nested inline compound* that MUST close on
  the same line; a `{` / `[` not followed by a matching closer is a
  `UnterminatedInlineCompound` error.

The raw `::` branch of an inline pair is not an inline value: it uses
the dedicated raw-scalar production of § 4, consumes to the containing
unescaped delimiter, processes escapes, and treats a leading `{` or
`[` as literal content. The dispatch rules below apply only after a
plain `:` separator.

When an inline scalar begins with `(` or `((`, these leading parentheses
remain ordinary content inside inline compounds, not multi-line string
openers. The raw body runs until the first unescaped inline terminator (`,`,
`}`, or `]`). Surrounding whitespace is then trimmed from the raw bytes,
and escape processing is performed according to § 5.8.1 and § 3.7. For a lone
`(` or lone `((` immediately before a terminator (e.g. `{a: (, b: 1}` or
`{a: ((, b: 1}`), the result is `String("(")` or `String("((")`,
respectively. If no inline terminator occurs before the end of the line, the
outer inline compound yields `UnterminatedInlineCompound` (§ 6.11).
Multi-line string openers are not permitted inside inline compounds.

The following document is therefore an error:

>>>>> lang=ru

- Многострочные строки (`(`/`((` — опенеры). Inline-составное по
  определению однострочно; многострочный опенер внутри него потребовал
  бы продолжения на последующих строках, что невозможно по § 3.2.
- Многострочные изменения области. Байт `{` или `[` в начале
  inline-значения открывает *вложенное inline-составное*, которое
  MUST закрыться на той же строке; `{` / `[`, за которыми не
  следует соответствующая закрывающая скобка, вызывают ошибку
  `UnterminatedInlineCompound`.

Raw-ветка `::` inline-пары не является inline-значением: она использует
специальную raw-scalar-продукцию § 4, идёт до содержащего
неэкранированного разделителя, обрабатывает escape и считает начальные
`{` или `[` литеральными данными. Следующие правила диспетчеризации
применяются только после обычного разделителя `:`.

Если inline-скаляр начинается с `(` или `((`, эти ведущие скобки остаются
обычным содержимым внутри inline-составных, а не многострочными строковыми
опенерами. Raw body продолжается до первого неэкранированного
inline-терминатора (`,`, `}` или `]`).
Пробельные кодовые точки с обоих краёв raw body обрезаются на уровне сырых
байтов, а обработка escape выполняется согласно § 5.8.1 и § 3.7. Для
одиночного `(` или одиночного `((`, непосредственно стоящего перед
терминатором (например, `{a: (, b: 1}` или `{a: ((, b: 1}`),
результатом будут `String("(")` или `String("((")`, соответственно.
Если до конца строки inline-терминатор отсутствует, внешний inline-составной
даёт ошибку `UnterminatedInlineCompound` (§ 6.11).
Многострочные строковые опенеры внутри inline-составных не разрешены.

>>>>> lang=zh

- 多行字符串(`(` / `((` 开启符)。Inline 复合值按定义是单行的;
  其中的多行开启符需要延续到后续行,这根据 § 3.2 不可能。
- 多行作用域变更。`{` / `[` 字节位于 inline 值开头时开启
  *嵌套 inline 复合值*,其 MUST 在同行闭合;若 `{` / `[` 后没有
  匹配的闭合符,则为 `UnterminatedInlineCompound` 错误。

inline pair 的 raw `::` 分支不是 inline value:它使用 § 4 的专用
raw-scalar 产生式,延伸到包含它的第一个未转义分隔符,处理 escape,
并将初始 `{` 或 `[` 视为字面内容。下列分发规则仅在普通
`:` 分隔符之后适用。

当 inline 标量以 `(` 或 `((` 开始时,这些前导括号在 inline 复合值内
仍是普通内容,而不是多行字符串开启符。raw body 延续到第一个未转义的
inline 终止符(`,`、`}` 或 `]`)。随后在原始字节上修剪周围空白,
并按照 § 5.8.1 和 § 3.7 执行 escape 处理。对于紧邻终止符之前的单独
`(` 或单独 `((`(例如 `{a: (, b: 1}` 或
`{a: ((, b: 1}`),结果分别为 `String("(")` 和
`String("((")`。
如果直到行末都没有出现 inline 终止符,外层 inline 复合值则给出
`UnterminatedInlineCompound`(§ 6.11)错误。
多行字符串开启符不允许出现在 inline 复合值内。

因此,以下文档是一个错误:

```
key: {a: (
    body
)}
```

