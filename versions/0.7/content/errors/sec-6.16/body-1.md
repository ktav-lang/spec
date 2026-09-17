>>>>> lang=en

A quote character (`"`, `'`, or `` ` ``) that opens a `<quoted-segment>`
(§ 5.3.3 — it is the first code point of a key segment after
trimming) with no matching unescaped closing delimiter of the same
character before end-of-line is an `UnterminatedQuotedKey` error,
reported on any line dispatched as a pair line (§ 5.1 rule 8) —
that is, an ordinary multi-line pair line, inside an established
Object or the top-level Object body, where finding a separator is
the only requirement and no enclosing bracket needs its own
same-line closer. This diagnosis takes precedence over the generic
`MissingSeparator` (§ 6.6) that a colon-free line would otherwise
raise, mirroring how an unterminated `[` / `{` already takes
precedence over a generic pair-candidate read at § 5.0.1 rule 6.

>>>>> lang=ru

Символ кавычки (`"`, `'` или `` ` ``), открывающий `<quoted-segment>`
(§ 5.3.3 — он является первой кодовой точкой сегмента ключа после
обрезки) без подходящего неэкранированного закрывающего разделителя
того же символа до конца строки, — это ошибка `UnterminatedQuotedKey`,
сообщаемая на любой строке, диспетчеризованной как pair line (правило
8 § 5.1), — то есть обычной многострочной pair line внутри уже
установленного Object или тела top-level Object, где единственное
требование — найти разделитель, и никакая охватывающая скобка не
нуждается в собственном закрывающем символе на той же строке. Этот
диагноз имеет приоритет над общим `MissingSeparator` (§ 6.6), который
иначе дала бы строка без двоеточия, зеркально тому, как незакрытая
`[` / `{` уже имеет приоритет над общим прочтением кандидата-пары в
правиле 6 § 5.0.1.

>>>>> lang=zh

引号字符(`"`、`'` 或 `` ` ``)开启了一个 `<quoted-segment>`
(§ 5.3.3 —— 它是修剪后键段的第一个码点),而在行末之前没有
找到同一字符的匹配未 escape 关闭分隔符,这是 `UnterminatedQuotedKey`
错误,在任何被分发为 pair line(§ 5.1 规则 8)的行上报告 ——
即已建立的 Object 内部或 top-level Object body 中的普通多行
pair line,那里唯一的要求就是找到分隔符,不需要任何括号在同一行
自行配对关闭。这一诊断优先于普通无冒号行本会引发的通用
`MissingSeparator`(§ 6.6),这与未终止的 `[` / `{` 已经优先于
§ 5.0.1 规则 6 的通用 pair 候选读取方式相呼应。

