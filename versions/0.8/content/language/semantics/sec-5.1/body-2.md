>>>>> lang=en
No line is processed twice: the first content line is consumed once
by the § 5.0.1 rule matched in rule 4, and rules 5–8 never act on
that line again. An explicit root opened by a lone `{` or `[`
(§ 5.0.1 rules 4–5) left unclosed at end-of-file — its matching
`}` / `]` never found — is an `UnclosedCompound` error (§ 6.1); an
implicit root (§ 5.0.1 rules 1, 6, and 7) needs no closing line. The
priority of orphan content after a completed root is unchanged: once
the root Value is fully constructed, any further non-blank,
non-comment line is an `OrphanLineAfterTopLevelInline` error
(§ 6.14).

>>>>> lang=ru
Ни одна строка не обрабатывается дважды: первая содержательная
строка потребляется один раз совпавшим правилом § 5.0.1 в правиле 4,
а правила 5–8 никогда не действуют на неё повторно. Явный корень,
открытый одиночным `{` или `[` (§ 5.0.1 правила 4–5), оставшийся
незакрытым к концу файла (соответствующая `}` / `]` так и не
найдена), — это ошибка `UnclosedCompound` (§ 6.1); неявный корень
(§ 5.0.1 правила 1, 6 и 7) в закрывающей строке не нуждается.
Приоритет для содержимого после завершённого корня не меняется:
как только корневое Value полностью построено, любая последующая
непустая некомментарная строка — ошибка
`OrphanLineAfterTopLevelInline` (§ 6.14).

>>>>> lang=zh
任何行都绝不会被处理两次:首条内容行由规则 4 中匹配的 § 5.0.1
规则恰好消费一次,规则 5–8 绝不再作用于该行。由单独的 `{` 或 `[`
开启的显式根(§ 5.0.1 规则 4–5)若到文件末尾仍未关闭 —— 始终未找到
匹配的 `}` / `]` —— 是 `UnclosedCompound` 错误(§ 6.1);隐式根
(§ 5.0.1 规则 1、6、7)无需关闭行。根完成后对孤立内容的既有
优先级不变:根 Value 一旦完全构建,任何后续的非空白非注释行都是
`OrphanLineAfterTopLevelInline` 错误(§ 6.14)。

