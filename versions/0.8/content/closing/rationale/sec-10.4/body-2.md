>>>>> lang=en
Tab (`0x09`) and other low-ASCII control bytes other than `LF` and
`CR` (which already have their own dedicated escapes, `\n` and `\r`)
intentionally have no **dedicated named** escape — no letter is worth
reserving for a byte that is legal as a literal in the first place.
Tab is a permitted literal byte in keys and scalars (§ 4); control
bytes are content data. A String containing such a byte is
representable through verbatim multi-line form (§ 5.6, § 5.9.7), or,
since 0.7.0, inline via `\uXXXX` (§ 3.7.1), which can name any of
them by number — there is no need for a dedicated named escape for
each one when the multi-line form preserves the byte exactly and
`\uXXXX` covers the inline case generically. A raw `CR` byte is a
separate case, not covered by either mechanism: it is never
representable as String content at all (§ 5.9.7), since a bare `CR`
is always a line terminator (§ 3.2) and can enter a String's logical
content only through the `\r` escape or the generic `\uXXXX` escape
naming code point 000D.

Multi-line scalars and multi-line strings have no escape processing
at all — the lexical layout makes escape unnecessary in those
contexts. (Keys gained escape processing in 0.6.0; see § 3.7.)

>>>>> lang=ru
Табуляция (`0x09`) и другие управляющие байты нижней части ASCII,
кроме `LF` и `CR` (у которых уже есть собственные выделенные
escape-последовательности, `\n` и `\r`), намеренно не имеют
**выделенной именованной** escape-последовательности — ни одну букву
не стоит резервировать для байта, который и так допустим как литерал.
Табуляция — допустимый литеральный байт в ключах и скалярах (§ 4);
управляющие байты — это содержательные данные. String, содержащая
такой байт, представима через verbatim-многострочную форму
(§ 5.6, § 5.9.7), а с 0.7.0 — inline через `\uXXXX` (§ 3.7.1),
которым можно назвать любой из них числом — отдельная именованная
escape-последовательность для каждого не нужна: многострочная форма
сохраняет байт в точности, а `\uXXXX` покрывает inline-случай в
общем виде. Отдельный случай — «сырой» байт `CR`: он вообще не
представим как содержимое String (§ 5.9.7), поскольку голый `CR` —
это всегда завершитель строки (§ 3.2) и может попасть в логическое
содержимое String только через escape `\r` либо через обобщённый
escape `\uXXXX`, называющий кодовую точку 000D.

Многострочные скаляры и многострочные строки вообще не обрабатывают
escape-последовательности — лексическая структура делает
экранирование в этих контекстах ненужным. (Ключи получили обработку
escape-последовательностей в 0.6.0; см. § 3.7.)

>>>>> lang=zh
制表符(`0x09`)与除 `LF` 和 `CR` 之外的其他低 ASCII 控制字节(`LF` 与
`CR` 已有各自的专用 escape, `\n` 与 `\r`)刻意**没有专门的命名** escape
—— 没有任何字母值得为一个本来就能作为字面量合法出现的字节而保留。制表符在
键与标量中是允许的字面字节(§ 4);控制字节是内容数据。包含此类字节的 String
可通过 verbatim 多行形式表示(§ 5.6、§ 5.9.7),自 0.7.0 起也可通过 `\uXXXX`
(§ 3.7.1)以 inline 方式表示,它能按编号指称其中任意一个 —— 多行形式能精确
保留字节,`\uXXXX` 又以通用方式覆盖 inline 情形,为每个控制字节单设专门命名
escape 并无必要。裸的 `CR` 字节是另一回事,上述两种机制都覆盖不到:它根本不能
作为 String 内容表示(§ 5.9.7),因为裸 `CR` 永远是行终止符(§ 3.2),只能通过
`\r` escape 或指称码点 000D 的通用 `\uXXXX` escape 进入 String 的逻辑内容。

多行标量值与多行字符串完全不做 escape 处理 —— 词法布局使 escape 在这些上下文中
没有必要。(键在 0.6.0 获得了 escape 处理;见 § 3.7。)

