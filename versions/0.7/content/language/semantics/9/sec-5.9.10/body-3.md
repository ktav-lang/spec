>>>>> lang=en
When bare form is selected, the writer MUST re-escape every code
point that `<key-char>` (§ 4) excludes from raw content, plus any
§ 3.3 whitespace code point at the segment's first or last position
(which § 4's trimming rule would otherwise remove on re-parse):

- Bytes with a named escape (§ 3.7) use it: `\` → `\\`, `.` → `\.`,
  `:` → `\:`, `,` → `\,`, `{` → `\{`, `}` → `\}`, `[` → `\[`,
  `]` → `\]`, LF → `\n`, CR → `\r`.
- Everything else `<key-char>` excludes — `(`, `)`, DEL (`0x7F`),
  and any control byte below `0x20` that is not a § 3.3 whitespace
  member — has no named escape and MUST be emitted as `\uXXXX`
  (§ 3.7.1).
- A § 3.3 whitespace code point at the first or last position of
  the segment MUST likewise be escaped rather than emitted
  literally, even though § 4 otherwise permits whitespace as
  ordinary interior key content: left unescaped, it would be
  silently trimmed away on re-parse, changing the key. Use the
  named form when one exists (LF and CR per bullet 1 above) and
  `\uXXXX` otherwise — either form is immune to § 4's raw-byte
  trimming, since the trimmed text is the escape's own ASCII
  spelling (`\`, then a letter or four hex digits), never the
  whitespace byte itself. Interior whitespace needs no escaping.

>>>>> lang=ru
Если выбрана голая форма, writer MUST ре-экранировать каждую
кодовую точку, которую `<key-char>` (§ 4) исключает из сырого
содержимого, плюс любую пробельную кодовую точку § 3.3 на первой
или последней позиции сегмента (которую иначе удалило бы правило
trim из § 4 при повторном парсинге):

- Байты с именованным escape (§ 3.7) используют его: `\` → `\\`,
  `.` → `\.`, `:` → `\:`, `,` → `\,`, `{` → `\{`, `}` → `\}`,
  `[` → `\[`, `]` → `\]`, LF → `\n`, CR → `\r`.
- Всё остальное, что исключает `<key-char>` — `(`, `)`, DEL
  (`0x7F`), и любой управляющий байт ниже `0x20`, не являющийся
  элементом множества § 3.3 — не имеет именованного escape и
  MUST выводиться как `\uXXXX` (§ 3.7.1).
- Пробельная кодовая точка § 3.3 на первой или последней позиции
  сегмента MUST аналогично экранироваться, а не выводиться
  буквально, даже несмотря на то, что § 4 в остальном разрешает
  пробел как обычное внутреннее содержимое ключа: без
  экранирования она была бы незаметно обрезана при повторном
  парсинге, изменив ключ. Используйте именованную форму, если
  она существует (LF и CR — по пункту 1 выше), и `\uXXXX` в
  остальных случаях — обе формы защищены от обрезки по сырым
  байтам § 4, поскольку обрезаемым текстом является собственное
  ASCII-написание escape (`\`, затем буква или четыре hex-цифры),
  а не сам пробельный байт. Внутренний пробел экранирования не
  требует.

>>>>> lang=zh
- 有命名 escape(§ 3.7)的字节使用该 escape:`\` → `\\`、
  `.` → `\.`、`:` → `\:`、`,` → `\,`、`{` → `\{`、`}` → `\}`、
  `[` → `\[`、`]` → `\]`、LF → `\n`、CR → `\r`。
- `<key-char>` 排除的其余内容 —— `(`、`)`、DEL(`0x7F`),以及
  任何不属于 § 3.3 空白成员的 0x20 以下控制字节 —— 没有命名
  escape,MUST 以 `\uXXXX`(§ 3.7.1)输出。
- 位于段首或段尾的 § 3.3 空白码点同样 MUST escape 而非字面
  输出,即使 § 4 在其他情况下允许空白作为普通的键内部内容:
  若不 escape,它会在重解析时被悄悄修剪掉,从而改变键。存在
  命名形式时使用命名形式(LF、CR —— 见上面第一条),否则使用
  `\uXXXX`;两种形式都不受 § 4 原始字节修剪规则的影响,因为被
  修剪的是 escape 自身的 ASCII 拼写(`\` 加字母或四位十六进制
  数字),而不是空白字节本身。内部空白无需 escape。

规范写入器实际上永远不会对 `##` 前缀键的首段执行这一方案:
上面的选形规则 (d) 已在考虑裸形式之前就将其导向 quoted 形式,
因为第 1-3 条中的任何 escape 都不会改变输出行的原始前两个
字节。`\u0023#a\:b`(仅 escape 开头的 `#`,即本条替代之前
的原裸形式方案)对键 `##a:b` 而言仍是一种有效、可解码的
非规范 INPUT 拼写 —— 解析器 MUST 仍然接受它 —— 但它绝不是
规范 OUTPUT:任何内容以 `##` 开头的键,其规范形式始终是
quoted 形式 `"##a:b"`(依据 (d)),而不是 `\u0023#a\:b`。

若选择 quoted 形式,writer 将段的解码内容输出在两个 `"` 字符
之间,只 escape:

- 内容中的裸 `"` —— 作为 `\"` —— quoted 段内部唯一的结构性
  字节,因为 `"` 是固定分隔符;
- `\`(反斜杠)—— 作为 `\\` —— 反斜杠在两种形式中始终是
  escape 前导;
- LF / CR —— 作为 `\n` / `\r` —— 键 MUST 保持单行;
- 任何其他不属于 § 3.3 空白成员的 0x20 以下控制字节,或 DEL
  —— 作为 `\uXXXX` —— 加引号只放宽了对 STRUCTURAL 字节的
  escape 要求,并不放宽格式另一条「键中不允许裸不可见、非空白
  字节」的规则。属于 § 3.3 空白成员的控制字节(制表符、VT、
  FF)不在本条之列,原因与它不在上面裸形式对应条目之列相同:
  § 4 的 `<dq-char>` / `<sq-char>` / `<bt-char>` 已经允许它以
  裸形式出现,因此这里无需 `\uXXXX` escape,不论它出现在段的
  边界还是内部(见下面关于边缘空白的说明,该说明并不限于非
  控制的空白)。

