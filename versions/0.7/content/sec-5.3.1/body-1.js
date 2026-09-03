export default {
  en: `
Validation operates on the raw prefix up to the first unescaped
separator, however malformed the separator's surrounding whitespace
is (check ordering: § 5.3). Each segment of that prefix is either a
\`<bare-segment>\` or a \`<quoted-segment>\` (§ 4), identified
positionally (§ 5.3.3), and the two forms are validated differently:

- **Bare segment.** A segment that is empty after trimming yields
  an \`EmptyKey\` (§ 6.5) error; a segment containing a raw
  (unescaped) code point that \`<key-char>\` (§ 4) forbids yields an
  \`InvalidKey\` (§ 6.4) error; a malformed \`\\X\` escape yields a
  \`BadEscapeSequence\` (§ 6.13) error.
- **Quoted segment (§ 5.3.3).** Its content is validated, unmodified
  by trimming — only the whitespace *outside* the delimiters is
  trimmed (§ 4); the content itself is checked as-is, so an
  all-whitespace segment (\`" "\`) is valid, not \`EmptyKey\`. The
  applicable character class is \`<dq-char>\` / \`<sq-char>\` /
  \`<bt-char>\` (§ 4) for the segment's own delimiter, not
  \`<key-char>\`: a raw control byte or DEL is still \`InvalidKey\`
  (§ 6.4), and a malformed \`\\X\` escape is still \`BadEscapeSequence\`
  (§ 6.13), but which raw bytes are structural differs from a bare
  segment (§ 5.3.3). An empty quoted segment (\`""\`, \`''\`, \` \`\` \`) is
  still \`EmptyKey\` (§ 6.5). Content other than whitespace following
  the closing delimiter, before the next \`<unescaped-dot>\` or the
  pair separator, is \`InvalidKey\` (§ 6.4) per § 5.3.3's "nothing may
  follow the closer" rule. An unterminated quoted segment (no
  matching unescaped closer before end-of-line) never reaches this
  section as a key-validation defect at all: § 4's separator scan
  finds no separator, and the line is diagnosed as
  \`UnterminatedQuotedKey\` (§ 6.16) or, on the document's undecided
  first content line, treated as no error at all — see § 5.3.3 and
  § 5.0.1 rule 6.

A segment beginning with \`##\` is none of these — it is not a key
validation failure; it is never parsed as a key at all. § 5.1
rule 2 dispatches any line whose trimmed form begins with \`##\` as
a comment (§ 3.4) before any key parsing begins, so such a line
can never reach this section. The collision is a *writer*
round-trip hazard, not a parser-side error: the canonical writer
MUST emit a \`##\`-prefixed key's first segment in quoted form
(§ 5.9.10) precisely so that the emitted line starts with \`"\`,
not \`#\`, and still parses as the intended pair on re-read.

`,
  ru: `
Валидация работает с сырым префиксом до первого неэкранированного
разделителя, каким бы искажённым ни было окружение разделителя
пробелами (порядок проверок: § 5.3). Каждый сегмент этого префикса —
либо \`<bare-segment>\`, либо \`<quoted-segment>\` (§ 4), определяемый
позиционно (§ 5.3.3), и эти две формы валидируются по-разному:

- **Голый сегмент (\`<bare-segment>\`).** Сегмент, пустой после
  обрезки, даёт ошибку \`EmptyKey\` (§ 6.5); сегмент, содержащий сырую
  (неэкранированную) кодовую точку, запрещённую \`<key-char>\` (§ 4),
  даёт ошибку \`InvalidKey\` (§ 6.4); искажённая escape-форма \`\\X\`
  даёт ошибку \`BadEscapeSequence\` (§ 6.13).
- **Квотированный сегмент (§ 5.3.3).** Его содержимое валидируется
  без изменения обрезкой — обрезается только пробел *снаружи*
  разделителей (§ 4); само содержимое проверяется как есть, так что
  сегмент из одних пробелов (\`" "\`) валиден, а не \`EmptyKey\`.
  Применимый класс символов — \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\`
  (§ 4) для собственного разделителя сегмента, а не \`<key-char>\`:
  сырой управляющий байт или DEL по-прежнему даёт \`InvalidKey\`
  (§ 6.4), а искажённый escape \`\\X\` по-прежнему даёт
  \`BadEscapeSequence\` (§ 6.13), но то, какие сырые байты являются
  структурными, отличается от голого сегмента (§ 5.3.3). Пустой
  квотированный сегмент (\`""\`, \`''\`, \` \`\` \`) по-прежнему даёт
  \`EmptyKey\` (§ 6.5). Содержимое, отличное от пробела, после
  закрывающего разделителя, перед следующей \`<unescaped-dot>\` или
  разделителем пары, — \`InvalidKey\` (§ 6.4) согласно правилу § 5.3.3
  «после закрывающего разделителя ничего не может следовать».
  Незакрытый квотированный сегмент (нет подходящего
  неэкранированного закрывающего разделителя до конца строки)
  вообще никогда не достигает этого раздела как дефект валидации
  ключа: сканирование разделителя § 4 не находит разделителя, и
  строка диагностируется как \`UnterminatedQuotedKey\` (§ 6.16) или,
  на ещё не решённой первой содержательной строке документа,
  трактуется как отсутствие ошибки вовсе — см. § 5.3.3 и правило 6
  § 5.0.1.

Сегмент, начинающийся с \`##\`, — не то и не другое: это не ошибка
валидации ключа; он вообще не разбирается как ключ. § 5.1
правило 2 направляет любую строку, чья обрезанная форма
начинается с \`##\`, в комментарий (§ 3.4) до начала какого-либо
разбора ключа, поэтому такая строка никогда не достигает этого
раздела. Коллизия — это *писательская* проблема round-trip, а не
парсерная ошибка: канонический писатель MUST выводить первый
сегмент ключа с префиксом \`##\` в квотированной форме (§ 5.9.10) —
именно для того, чтобы выводимая строка начиналась с \`"\`, а не с
\`#\`, и при повторном чтении по-прежнему разбиралась как задуманная
пара.

`,
  zh: `
校验作用于首个未 escape 分隔符之前的原始前缀,无论该分隔符周围
空白多么畸形(检查顺序:§ 5.3)。该前缀的每个段要么是
\`<bare-segment>\`,要么是 \`<quoted-segment>\`(§ 4),按位置判定
(§ 5.3.3),这两种形式的校验方式不同:

- **裸段(\`<bare-segment>\`)。** 段 trim 后为空 → \`EmptyKey\`
  (§ 6.5);段含 \`<key-char>\`(§ 4)禁止的裸(未 escape)码点 →
  \`InvalidKey\`(§ 6.4);畸形的 \`\\X\` escape → \`BadEscapeSequence\`
  (§ 6.13)。
- **quoted 段(§ 5.3.3)。** 其内容按原样校验,不受修剪影响 ——
  只有分隔符*之外*的空白被修剪(§ 4);内容本身按原样检查,因此
  全空白的段(\`" "\`)是有效的,不是 \`EmptyKey\`。适用的字符类是
  \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\`(§ 4),对应段自身的
  分隔符,而非 \`<key-char>\`:裸控制字节或 DEL 仍为 \`InvalidKey\`
  (§ 6.4),畸形的 \`\\X\` escape 仍为 \`BadEscapeSequence\`
  (§ 6.13),但哪些裸字节是结构性的与裸段不同(§ 5.3.3)。空的
  quoted 段(\`""\`、\`''\`、\` \`\` \`)仍为 \`EmptyKey\`(§ 6.5)。关闭
  分隔符之后、下一个 \`<unescaped-dot>\` 或对分隔符之前,出现非
  空白的内容,为 \`InvalidKey\`(§ 6.4),依据 § 5.3.3「关闭分隔符
  之后不得跟随任何内容」的规则。未终止的 quoted 段(行末前没有
  匹配的未 escape 关闭分隔符)根本不会作为键校验缺陷到达本节:
  § 4 的分隔符扫描找不到分隔符,该行被诊断为
  \`UnterminatedQuotedKey\`(§ 6.16),或者,在文档尚未判定的首个
  内容行上,被视为完全没有错误 —— 见 § 5.3.3 与 § 5.0.1 规则 6。

以 \`##\` 起始的段不在此列 —— 它不是键校验失败;它根本不会被解析为
键:§ 5.1 规则 2 在任何键解析开始之前,即把 trim 后以 \`##\` 起始的
行分发为注释(§ 3.4),因此此类行永远到不了本节。该冲突是*写入器*
往返(round-trip)隐患,而非解析器侧错误:规范写入器 MUST 将
\`##\` 前缀键的首段以 quoted 形式输出(§ 5.9.10),正是为了输出行
以 \`"\` 而非 \`#\` 起始,在重读时仍能按意图解析为 pair。

`,
};
