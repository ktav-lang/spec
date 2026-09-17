export default {
  en: `   If the first content line trimmed begins with \`[\` or \`{\` but
   matches none of rules 2–5 above — the leading bracket/brace has
   no matching closer at the end of the line, and the line is not a
   lone opener either — it is diagnosed as a malformed or
   unterminated inline-compound attempt (§ 5.2 rules 8–9;
   \`UnterminatedInlineCompound\` / \`MalformedInlineCompound\`,
   § 6.11 / § 6.12). This diagnosis takes precedence over rule 6
   below: such a line is never treated as a pair candidate, even if
   it also contains an unescaped \`:\` later on (e.g. \`[bad]: 1\`).
   This precedence only applies when \`[\` or \`{\` is the first
   non-whitespace code point of the trimmed line — elsewhere in the
   line (e.g. \`a{b: 1\`) the byte is just an ordinary forbidden
   \`<key-char>\`, and rule 6 proceeds normally, yielding
   \`InvalidKey\` on validation.
6. Otherwise, if the first content line trimmed is a **pair
   candidate** — it has the *shape* of a pair line under § 5.3
   (\`key: …\` / \`key:: …\`, including dotted keys): a first
   **unescaped** \`:\` (or \`::\`) separator under § 4's
   separator-scanning rule, with a non-empty raw prefix before it,
   where the separator is either the \`::\` marker or a plain \`:\`
   satisfied by \`<sep-end>\` (whitespace or end-of-line after it) —
   → root is an **Object** with this line as its first pair.

`,
  ru: `   Если первая содержательная строка после trim начинается с \`[\`
   или \`{\`, но не подходит ни под одно из правил 2–5 выше —
   у ведущей скобки нет соответствующего закрывателя в конце
   строки, и строка не является одиночным опенером, — это
   диагностируется как искажённая или незакрытая попытка
   inline-составного (§ 5.2 правила 8–9;
   \`UnterminatedInlineCompound\` / \`MalformedInlineCompound\`,
   § 6.11 / § 6.12). Этот диагноз имеет приоритет над правилом 6
   ниже: такая строка никогда не рассматривается как кандидат в
   pair, даже если далее в ней встречается неэкранированное \`:\`
   (например, \`[bad]: 1\`). Этот приоритет применяется, только
   когда \`[\` или \`{\` — первая непробельная кодовая точка строки
   после trim; в другом месте строки (например, \`a{b: 1\`) байт —
   просто обычный запрещённый \`<key-char>\`, и правило 6 работает
   как обычно, давая \`InvalidKey\` при валидации.
6. Иначе, если первая содержательная строка после trim —
   **кандидат в pair** — она имеет *форму* pair line по § 5.3
   (\`key: …\` / \`key:: …\`, включая точечные ключи): существует
   первое **неэкранированное** \`:\` (или \`::\`) по правилу
   сканирования разделителя из § 4, перед ним непустой сырой
   префикс, причём разделитель — это либо маркер \`::\`, либо
   обычное \`:\`, удовлетворяющее \`<sep-end>\` (пробел или конец
   строки после него) — → корень — **Object** с этой строкой как
   первой парой.

`,
  zh: `   若首条内容行经 trim 后以 \`[\` 或 \`{\` 开头,但不符合上述规则
   2–5 中任何一条 —— 即行尾没有与之匹配的闭合符,该行也不是
   单独的开启符 —— 则诊断为格式错误或未闭合的 inline 复合值尝试
   (§ 5.2 规则 8–9;\`UnterminatedInlineCompound\` /
   \`MalformedInlineCompound\`,§ 6.11 / § 6.12)。此诊断优先于下方
   规则 6:即使该行后面还含有未 escape 的 \`:\`(例如
   \`[bad]: 1\`),也绝不会被当作 pair 候选行处理。此优先级仅在
   \`[\` 或 \`{\` 是该行经 trim 后的首个非空白码点时适用 —— 若出现
   在行内其他位置(例如 \`a{b: 1\`),该字节只是普通的被禁止的
   \`<key-char>\`,规则 6 照常生效,校验时产生 \`InvalidKey\`。
6. 否则,若首条内容行经 trim 后是 **pair 候选行** —— 即具备
   § 5.3 pair 行的*形状*(\`key: …\` / \`key:: …\`,含点分键):
   按 § 4 的分隔符扫描规则存在首个**未 escape** 的 \`:\`(或
   \`::\`),其前有非空原始前缀,且分隔符为 \`::\` 标记,或普通 \`:\`
   后随空白或行末(\`<sep-end>\`)→ 根为 **Object**,此行为首对。

   判定刻意分两阶段。阶段 1(本规则)是纯词法的形状测试:
   分隔符前的前缀在判定时不必是合法 \`<key>\`(§ 4),因此首行
   \`a,b: 1\` 仍选出 Object 根。阶段 2 是统一校验:Object 上下文
   确立后,§ 5.3 / § 5.3.1 对该候选原始键前缀的校验,与既有
   Object 内任何 pair 行(§ 5.1 规则 8)完全一致 —— 同一行随后
   按情形产生 \`InvalidKey\`(§ 6.4)、\`EmptyKey\`(§ 6.5)或
   \`BadEscapeSequence\`(§ 6.13)。粘连的普通 \`:\` 行(如
   \`a,b:1\`,分隔符后无空白)不是 pair 候选,落入规则 7(裸标量
   数组项);粘连的 \`::\` 行是 pair 候选,粘连在阶段 2 表现为
   \`MissingSeparatorSpace\`(§ 6.10)。
7. 否则,若首条内容行经 trim 后被识别为 **array-item line**
   (§ 5.4,除规则 4 / 5 已处理者外)—— 裸标量、\`:: …\`、多行字符串
   开启符 \`(\` / \`((\`、空复合简写 \`{}\` / \`[]\` / \`()\` / \`(())\`,或
   未匹配规则 2 / 3 的闭合 inline 复合 —— → 根为 **Array**,此
   行为首项。
8. 否则(裸闭合 \`}\` / \`]\` 或不可分类)→ \`UnbalancedBracket\` 错误
   (§ 6.1)。

`,
};
