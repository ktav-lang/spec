export default {
  en: `
The Rust reference implementation already trimmed the full
25-code-point set at key-segment edges in every 0.6.x release. For Rust,
and for implementations whose 0.6.x behaviour already matched that
trim, the § 3.3 / § 4 clarification is non-breaking: apart from documents
that rely on either of the two breaking forms below, previously
round-tripping documents retain their meaning under 0.7.0.

An implementation that followed old § 4 literally and trimmed only its
specified ASCII whitespace has an additional **document-behaviour**
change. A document whose key segment has leading or trailing § 3.3
whitespace that the old rule did not trim can now produce a different
key/path or error under 0.7.0. Such documents require migration review;
this is not merely an implementation-code update.

Two breaking changes apply to every implementation, Rust included:

1. **\`(…)\` multi-line strings no longer preserve trailing whitespace
   (§ 3.3 — any of the 25 code points, not just space/tab) on each
   content line.** If a document relies on trailing whitespace inside
   a \`(…)\` block being preserved verbatim, switch that block to
   \`((…))\`, which keeps both edges byte-for-byte in both 0.6.x and
   0.7.0.
2. **A key segment's leading, unescaped \`"\`, \`'\`, or \`\` \` \`\` now opens
   a quoted segment (§ 5.3.3, § 10.7) instead of being ordinary key
   content.** In 0.6.x, an Object pair whose key began with one of
   these three characters kept that character as literal key text —
   e.g. \`"port": 1\` named the key \`"port"\`, quotes included. In
   0.7.0, the same line either names the shorter key \`port\` (if a
   matching closing quote character is also present before the pair
   separator) or, if there is no matching closer, either raises
   \`UnterminatedQuotedKey\` (§ 6.16, when the root is already known to
   be an Object) or falls through to a root-level Array String item
   (§ 5.3.3 gives the exact, context-dependent rule). **To keep a
   0.6.x document's old meaning**, escape that leading quote
   character — \`\\"\`, \`\\'\`, \`\` \\\` \`\`, or \`\\uXXXX\` — so it reads as
   ordinary bare key content rather than a quoted-segment opener. The
   \`::\` raw-marker form (§ 5.4 rule 1) remains the explicit way to
   force a root-level Array item to be read as a literal String when
   it deliberately starts with a matched pair of quote characters
   around a colon (e.g. \`:: 'tis the season: fa\`), unaffected by this
   quoted-segment scan.

Additionally, \`\\uXXXX\` is a new, purely additive escape (§ 3.7.1) —
no existing document's meaning changes because of it.
`,
  ru: `
Эталонная Rust-реализация уже обрезала полный набор из 25 кодовых точек
на границах сегмента ключа в каждом релизе 0.6.x. Для Rust и реализаций,
чьё поведение 0.6.x уже совпадало с такой обрезкой, уточнение § 3.3 / § 4
не является ломающим: кроме документов, зависящих от одной из двух
ломающих форм ниже, ранее проходившие round-trip документы сохраняют
смысл в 0.7.0.

У реализации, буквально следовавшей старому § 4 и обрезавшей только
указанные там ASCII-пробелы, есть дополнительное изменение **поведения
документов**. Документ, у которого на границе сегмента ключа находится
пробел § 3.3, не обрезавшийся старым правилом, в 0.7.0 может породить
другой ключ/путь или ошибку. Такие документы требуют проверки миграции;
это не просто обновление кода реализации.

Два ломающих изменения касаются каждой реализации, включая Rust:

1. **Многострочные строки \`(…)\` больше не сохраняют замыкающие
   пробелы в каждой содержательной строке.** Если документ полагается
   на то, что замыкающий пробельный символ (§ 3.3 — любой из 25
   кодовых точек, не только пробел/табуляция) внутри блока \`(…)\`
   сохраняется verbatim, переключите этот блок на \`((…))\`, которая
   сохраняет обе границы байт-в-байт и в 0.6.x, и в 0.7.0.
2. **Ведущий, неэкранированный \`"\`, \`'\` или \`\` \` \`\` сегмента ключа
   теперь открывает квотированный сегмент (§ 5.3.3, § 10.7) вместо
   того, чтобы быть обычным содержимым ключа.** В 0.6.x пара Object,
   чей ключ начинался с одного из этих трёх символов, сохраняла этот
   символ как литеральный текст ключа — например, \`"port": 1\` называла
   ключ \`"port"\`, включая кавычки. В 0.7.0 та же строка либо называет
   более короткий ключ \`port\` (если подходящий закрывающий символ
   кавычки тоже присутствует до разделителя пары), либо, при
   отсутствии подходящего закрывающего символа, либо вызывает
   \`UnterminatedQuotedKey\` (§ 6.16, когда корень уже известен как
   Object), либо проваливается в элемент String корневого Array
   (§ 5.3.3 даёт точное, зависящее от контекста правило). **Чтобы
   сохранить прежний смысл документа 0.6.x**, экранируйте этот
   ведущий символ кавычки — \`\\"\`, \`\\'\`, \`\` \\\` \`\` или \`\\uXXXX\` — так,
   чтобы он читался как обычное голое содержимое ключа, а не как
   открывающий символ квотированного сегмента. Форма raw-маркера
   \`::\` (правило 1 § 5.4) остаётся явным способом заставить элемент
   корневого Array читаться как литеральная String, когда он
   намеренно начинается с согласованной пары символов кавычек вокруг
   двоеточия (например, \`:: 'tis the season: fa\`), не затронутым этим
   сканированием квотированного сегмента.

Кроме того, \`\\uXXXX\` — новая, чисто аддитивная escape-последовательность
(§ 3.7.1) — смысл ни одного существующего документа из-за неё не
меняется.
`,
  zh: `
Rust 参考实现在每个 0.6.x 版本中就已在键段边缘修剪完整的 25 码点
集合。对 Rust 以及 0.6.x 行为已匹配这种修剪的实现而言,§ 3.3 / § 4
澄清不是破坏性变更:除依赖下面两种破坏性形式之一的文档外,原先能
round-trip 的文档在 0.7.0 中保持其含义。

字面遵循旧 § 4、仅修剪其中指定 ASCII 空白的实现还有额外的**文档
行为**变更。若文档的键段前缘或后缘含有旧规则未修剪的 § 3.3 空白,
它在 0.7.0 中可能产生不同的键/路径或错误。这类文档需要迁移审查;
这并非仅仅更新实现代码。

有两项破坏性变更适用于包括 Rust 在内的每一个实现:

1. **\`(…)\` 多行字符串不再保留每个内容行的尾部空白。** 若某文档依赖
   \`(…)\` 块内的尾部空白码点(§ 3.3 —— 25 个码点中的任意一个,
   不仅是空格/制表符)被逐字节保留,请将该块改为
   \`((…))\`——它在 0.6.x 与 0.7.0 中都会将两侧边界逐字节保留。
2. **键段前导的、未 escape 的 \`"\`、\`'\` 或 \`\` \` \`\` 现在会开启一个
   quoted 段(§ 5.3.3、§ 10.7),而不再是普通的键内容。** 在
   0.6.x 中,键以这三个字符之一开头的 Object pair 会把该字符保留
   为字面键文本 —— 例如 \`"port": 1\` 命名的键是 \`"port"\`,包含
   引号。在 0.7.0 中,同一行要么命名更短的键 \`port\`(如果在对
   分隔符之前也存在匹配的关闭引号字符),要么,若没有匹配的关闭符,
   要么引发 \`UnterminatedQuotedKey\`(§ 6.16,当根已知为
   Object 时),要么落入根级 Array String 项(§ 5.3.3 给出精确的、
   依上下文而定的规则)。**为保留 0.6.x 文档的原有含义**,请对这个
   前导引号字符做 escape —— \`\\"\`、\`\\'\`、\`\` \\\` \`\` 或 \`\\uXXXX\` ——
   使其被读作普通的裸键内容,而非 quoted 段的开启符。\`::\`
   raw-marker 形式(§ 5.4 规则 1)仍然是显式强制根级 Array 项被
   读作字面 String 的方式,适用于该项故意以一对匹配的引号字符
   包围一个冒号开头的情形(例如 \`:: 'tis the season: fa\`),不受
   这次 quoted 段扫描的影响。

此外,\`\\uXXXX\` 是一个纯新增的 escape(§ 3.7.1)—— 不会因此改变任何
现有文档的含义。
`,
};
