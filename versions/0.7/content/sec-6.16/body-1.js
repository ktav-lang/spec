export default {
  en: `
A quote character (\`"\`, \`'\`, or \`\` \` \`\`) that opens a \`<quoted-segment>\`
(§ 5.3.3 — it is the first code point of a key segment after
trimming) with no matching unescaped closing delimiter of the same
character before end-of-line is an \`UnterminatedQuotedKey\` error,
reported on any line dispatched as a pair line (§ 5.1 rule 8) —
that is, an ordinary multi-line pair line, inside an established
Object or the top-level Object body, where finding a separator is
the only requirement and no enclosing bracket needs its own
same-line closer. This diagnosis takes precedence over the generic
\`MissingSeparator\` (§ 6.6) that a colon-free line would otherwise
raise, mirroring how an unterminated \`[\` / \`{\` already takes
precedence over a generic pair-candidate read at § 5.0.1 rule 6.

This category does NOT cover an inline-pair position (§ 5.8.2): an
unclosed quoted key there (e.g. \`{"a: 1}\`, or \`obj: {"a: 1}\`)
necessarily swallows the rest of the line — including whatever would
have been the enclosing compound's own closing \`}\` / \`]\` — so the
compound itself never bracket-balances, and never closes at all. The
balanced-content check behind \`UnterminatedInlineCompound\` (§ 6.11)
is already quote-opaque for exactly this reason (§ 5.3.3's "Inline
pairs" bullet), and reports exactly that category instead — never
\`UnterminatedQuotedKey\`, and never \`MalformedInlineCompound\` (§ 6.12
applies only to a structural defect INSIDE an already-CLOSED
compound; a compound whose only candidate closer was swallowed by
the unterminated quote never closes, so § 6.12 categorically does
not apply here, not merely as an alternative reading) — since the
compound-level defect is what a reader can actually see and fix (add
the missing quote-closer, which is also the only way to give the
compound its missing \`}\` / \`]\`); there is no separate "the key
inside was also unterminated" defect to name on top of it. This also
never applies
to the document's first content line itself, whether or not that
line begins with \`{\` / \`[\`: § 5.0.1 rule 6 uses this same
separator-scanning rule for its own phase-1 shape test on a line NOT
starting with \`{\` / \`[\`, so on that UNDECIDED first line the same
underlying fact — no separator found — is not an error at all: it
is simply not a pair candidate, and root-kind detection falls
through to an Array root with this line as a String item (§ 5.3.3,
§ 5.0.1 rule 7); a first line that DOES begin with \`{\` / \`[\` follows
the bracket-balance path above instead, per § 5.3.3's "Unterminated
quoted segments" bullet.

`,
  ru: `
Символ кавычки (\`"\`, \`'\` или \`\` \` \`\`), открывающий \`<quoted-segment>\`
(§ 5.3.3 — он является первой кодовой точкой сегмента ключа после
обрезки) без подходящего неэкранированного закрывающего разделителя
того же символа до конца строки, — это ошибка \`UnterminatedQuotedKey\`,
сообщаемая на любой строке, диспетчеризованной как pair line (правило
8 § 5.1), — то есть обычной многострочной pair line внутри уже
установленного Object или тела top-level Object, где единственное
требование — найти разделитель, и никакая охватывающая скобка не
нуждается в собственном закрывающем символе на той же строке. Этот
диагноз имеет приоритет над общим \`MissingSeparator\` (§ 6.6), который
иначе дала бы строка без двоеточия, зеркально тому, как незакрытая
\`[\` / \`{\` уже имеет приоритет над общим прочтением кандидата-пары в
правиле 6 § 5.0.1.

Эта категория НЕ покрывает позицию inline-пары (§ 5.8.2): незакрытый
квотированный ключ там (например, \`{"a: 1}\` или \`obj: {"a: 1}\`)
неизбежно поглощает остаток строки — включая то, что было бы
собственной закрывающей \`}\` / \`]\` охватывающего составного значения,
— так что само составное значение никогда не сбалансируется по
скобкам и вообще никогда не закрывается. Проверка баланса содержимого
позади \`UnterminatedInlineCompound\` (§ 6.11) уже непрозрачна для
кавычек именно по этой причине (пункт «Inline-пары» § 5.3.3) и
сообщает именно эту категорию вместо этого — никогда не
\`UnterminatedQuotedKey\`, и никогда не \`MalformedInlineCompound\`
(§ 6.12 применяется только к структурному дефекту ВНУТРИ уже
ЗАКРЫТОГО составного значения; составное значение, чей единственный
кандидат в закрывающий символ был поглощён незакрытой кавычкой,
никогда не закрывается, поэтому § 6.12 категорически неприменим
здесь, а не просто является альтернативным прочтением) — поскольку
дефект на уровне составного значения — вот что читатель реально может увидеть и исправить
(добавить недостающий закрывающий символ кавычки — это же единственный
способ дать составному значению его недостающий \`}\` / \`]\`); нет
отдельного дефекта «ключ внутри тоже был незакрыт»,
который нужно было бы называть поверх него. Это также никогда не
применяется к самой первой содержательной строке документа, вне
зависимости от того, начинается ли эта строка с \`{\` / \`[\`: правило 6
§ 5.0.1 использует то же самое правило сканирования разделителя для
собственного теста формы фазы 1 на строке, НЕ начинающейся с \`{\` /
\`[\`, так что на этой ЕЩЁ НЕ РЕШЁННОЙ первой строке тот же самый
базовый факт — разделитель не найден — вовсе не является ошибкой:
это просто не кандидат в пару, и определение вида корня проваливается
к корню-Array с этой строкой как элементом String (§ 5.3.3, правило 7
§ 5.0.1); первая строка, которая ДЕЙСТВИТЕЛЬНО начинается с \`{\` / \`[\`,
вместо этого следует пути баланса скобок выше, согласно пункту
«Незакрытые квотированные сегменты» § 5.3.3.

`,
  zh: `
引号字符(\`"\`、\`'\` 或 \`\` \` \`\`)开启了一个 \`<quoted-segment>\`
(§ 5.3.3 —— 它是修剪后键段的第一个码点),而在行末之前没有
找到同一字符的匹配未 escape 关闭分隔符,这是 \`UnterminatedQuotedKey\`
错误,在任何被分发为 pair line(§ 5.1 规则 8)的行上报告 ——
即已建立的 Object 内部或 top-level Object body 中的普通多行
pair line,那里唯一的要求就是找到分隔符,不需要任何括号在同一行
自行配对关闭。这一诊断优先于普通无冒号行本会引发的通用
\`MissingSeparator\`(§ 6.6),这与未终止的 \`[\` / \`{\` 已经优先于
§ 5.0.1 规则 6 的通用 pair 候选读取方式相呼应。

此类别不覆盖 inline pair 位置(§ 5.8.2):那里未闭合的 quoted 键
(例如 \`{"a: 1}\` 或 \`obj: {"a: 1}\`)必然会吞掉行的剩余部分 ——
包括本应是外层复合值自身闭合 \`}\` / \`]\` 的部分 —— 因此该复合值
本身永远无法完成括号平衡,也永远不会关闭。\`UnterminatedInlineCompound\`
(§ 6.11)背后的平衡内容检查正是出于这个
原因而已经对引号不透明(§ 5.3.3「inline pair」一条),因而报告的
正是这一类别 —— 绝不是 \`UnterminatedQuotedKey\`,也绝不是
\`MalformedInlineCompound\`(§ 6.12 仅适用于已**关闭**复合值内部的
结构性缺陷;唯一候选闭合符被未终止引号吞掉的复合值永远不会关闭,
因此 § 6.12 在这里绝对不适用,而不只是一种备选读法)—— 因为复合值
层面的缺陷才是读者实际能看到并修复的(添加缺失的引号闭合符 ——
这同时也是让该复合值获得其缺失的 \`}\` / \`]\` 的唯一方式);没有必要在其之上再命名
一个「内部的键也未终止」的独立缺陷。这也从不适用于文档自身的首条
内容行,无论该行是否以 \`{\` / \`[\` 开头:§ 5.0.1 规则 6 在不以 \`{\` /
\`[\` 开头的行上,把同一条分隔符扫描规则用于自己阶段一的形状测试,
因此在这条尚未判定的首行上,同样「找不到分隔符」这一底层事实根本
不是错误:它只是不构成 pair 候选,根类型判定落入以该行作为
String 项的根 Array(§ 5.3.3、§ 5.0.1 规则 7);确实以 \`{\` / \`[\`
开头的首行则改为遵循上面的括号平衡路径,依据 § 5.3.3「未终止的
quoted 段」一条。

`,
};
