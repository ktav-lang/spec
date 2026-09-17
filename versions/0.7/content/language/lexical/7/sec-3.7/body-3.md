>>>>> lang=en
The three quote escapes (`\"`, `\'`, `` \` ``) exist for the quoted
key form (§ 5.3.3): inside a `<quoted-segment>`, only the segment's
own opening delimiter is structural (its first unescaped occurrence
closes the segment); the two other quote characters are ordinary
content there and need no escape. `\"` / `\'` / `` \` `` are
recognised uniformly in every context where escapes are recognised
at all — bare key segments, quoted key segments, and inline scalar
values alike. In an inline value a recognised escape has no structural
effect, but it is not semantically redundant: § 5.2 classifies any
body containing a recognised escape as String, even when the decoded
body would otherwise be a keyword or numeric literal. This applies
equally to `\.` and `\:` in values.

Any other `\X` form (including `\#`, `\t`, `\ <space>`,
`\<any-other>`) is a `BadEscapeSequence` error (§ 6.13). See
§ 3.7.1 below for the specific validity rules of `\uXXXX`.

Escape sequences are NOT processed in:

- Multi-line scalar values (the body of a pair or array item that is
  the whole content of a line, § 5.3 / § 5.4).
- Multi-line string content (`(…)` and `((…))`, § 5.6) — content is
  verbatim.
- Comments (§ 3.4) — content is ignored.

In contexts without escape processing, the literal byte sequence
`\X` is two characters (`\` followed by `X`).

>>>>> lang=ru
Три кавычечных escape (`\"`, `\'`, `` \` ``) существуют для
квотированной формы ключа (§ 5.3.3): внутри `<quoted-segment>`
структурным является только собственный открывающий разделитель
сегмента (его первое неэкранированное вхождение закрывает сегмент);
два других символа кавычек там — обычное содержимое и не нуждаются
в escape. `\"` / `\'` / `` \` `` распознаются единообразно в любом
контексте, где escape-последовательности вообще распознаются, —
как в голых сегментах ключа, так и в квотированных, так и в
inline-скалярных значениях. В inline-значении распознанный escape не
имеет структурного эффекта, но не является семантически избыточным:
§ 5.2 классифицирует любое тело с распознанным escape как String,
даже если декодированное тело иначе было бы ключевым словом или
числовым литералом. Это в равной мере относится к `\.` и `\:` в
значениях.

Любая другая форма `\X` (включая `\#`, `\t`,
`\ <пробел>`, `\<любой-другой>`) — ошибка `BadEscapeSequence` (§ 6.13).
Точные правила валидности `\uXXXX` см. в § 3.7.1 ниже.

Escape-последовательности НЕ обрабатываются в:

- Многострочных скалярных значениях (тело пары или элемента массива,
  занимающее всё содержимое строки, § 5.3 / § 5.4).
- Содержимом многострочной строки (`(…)` и `((…))`, § 5.6) —
  содержимое verbatim.
- Комментариях (§ 3.4) — содержимое игнорируется.

В контекстах без обработки escape-последовательностей литеральная
последовательность байтов `\X` — это два символа (`\`, затем `X`).

>>>>> lang=zh
三个引号 escape(`\"`、`\'`、`` \` ``)是为了支持带引号的键形式
(§ 5.3.3)而存在:在 `<quoted-segment>` 内部,只有该段自身的
开启分隔符是结构性的(其第一次未转义出现即关闭该段);另外两种
引号字符在其中是普通内容,无需转义。`\"` / `\'` / `` \` `` 在
每一个识别 escape 的上下文中都一致地被识别 —— 无论是裸键段、
带引号的键段,还是 inline 标量值。inline 值中的已识别 escape 没有
结构性作用,但在语义上并非多余:§ 5.2 将任何含有已识别 escape 的体
分类为 String,即使解码后的体本来会像关键字或数字字面量。这同样
适用于值中的 `\.` 与 `\:`。

其他任何 `\X` 形式(包括 `\#`、`\t`、`\<空格>`、
`\<其他任意>`)是 `BadEscapeSequence` 错误(§ 6.13)。
`\uXXXX` 的具体有效性规则见下文 § 3.7.1。

Escape 序列**不**在以下场景处理:

- 多行标量值(占整行内容的对体或数组项体,§ 5.3 / § 5.4)。
- 多行字符串内容(`(…)` 与 `((…))`,§ 5.6)—— 内容 verbatim。
- 注释(§ 3.4)—— 内容被忽略。

无 escape 处理的上下文中,`\X` 字面字节序列为两个字符。

