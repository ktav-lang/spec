export default {
  en: `
The "first content line" is the first line that is neither blank
(§ 5.1 rule 1) nor a comment (§ 5.1 rule 2). The root kind is
established from this line as follows. Rules are applied in order;
the first matching rule wins.

1. If the document has **no content lines** (empty document, or only
   blank/comment lines) → root is an empty **Object**.
2. If the first content line trimmed is a **closed inline object**
   \`{ … }\` — a \`{\`, balanced inline content, and a matching \`}\` as
   the last non-whitespace code point of the trimmed line — → root **IS**
   that inline Object. The document MUST have no further content
   lines; any subsequent non-blank, non-comment line is an
   \`OrphanLineAfterTopLevelInline\` error (§ 6.14).
3. If the first content line trimmed is a **closed inline array**
   \`[ … ]\` — a \`[\`, balanced inline content, and a matching \`]\` as
   the last non-whitespace code point of the trimmed line — → root **IS**
   that inline Array. The document MUST have no further content
   lines; any subsequent non-blank, non-comment line is an
   \`OrphanLineAfterTopLevelInline\` error (§ 6.14).
4. If the first content line trimmed is a **lone \`{\`** (the opening
   brace, possibly preceded or followed by whitespace, with nothing
   else on the line) → root is a **multi-line Object** opened by
   this brace. Its matching \`}\` on a later line closes the root;
   any content after that matching close line is
   \`OrphanLineAfterTopLevelInline\` (§ 6.14).
5. If the first content line trimmed is a **lone \`[\`** → root is a
   **multi-line Array** opened by this bracket. Its matching \`]\`
   closes the root; content after the matching close is
   \`OrphanLineAfterTopLevelInline\` (§ 6.14).

   If the first content line trimmed begins with \`[\` or \`{\` but
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

   Detection is deliberately two-phase. Phase 1 (this rule) is a
   purely lexical, shape-only test: the prefix before the separator
   is NOT required to be a grammatically valid \`<key>\` (§ 4) at
   detection time, so a first line such as \`a,b: 1\` still selects
   an Object root. Because phase 1 reuses § 4's separator-scanning
   rule verbatim rather than a separate implementation, it inherits
   that rule's quote-awareness for free — a quoted-segment's
   content stays opaque to the scan even on this UNDECIDED first
   line, with no separate logic to keep in sync. Phase 2 is uniform
   validation: once the Object
   context exists, § 5.3 / § 5.3.1 validate the candidate's raw key
   prefix exactly as they validate every other pair line inside an
   established Object (§ 5.1 rule 8) — the same line then yields
   \`InvalidKey\` (§ 6.4), \`EmptyKey\` (§ 6.5), or \`BadEscapeSequence\`
   (§ 6.13) as appropriate. A glued plain-\`:\` line (e.g. \`a,b:1\`,
   no whitespace after the separator) is not a pair candidate and
   falls through to rule 7 (a bare-scalar array item); a glued \`::\`
   line is a pair candidate, and the glued form surfaces in
   phase 2 as \`MissingSeparatorSpace\` (§ 6.10).
7. Otherwise, if the first content line trimmed is recognised as an
   **array-item line** under § 5.4 other than rules 4 / 5 above
   (a bare scalar, a raw-marker item \`:: …\`, a multi-line string
   opener \`(\` / \`((\`, an empty-compound shortcut \`{}\` / \`[]\` /
   \`()\` / \`(())\`, or a closed inline compound that did not match
   rules 2 / 3) → root is an **Array** with this line as its first
   item.
8. Otherwise (a bare close \`}\` / \`]\` on the first content line, or
   otherwise unclassifiable) → \`UnbalancedBracket\` error (§ 6.1).

The root kind is **fixed** by the first content line. Subsequent
lines are dispatched per § 5.1 according to the chosen kind:

- Inside a top-level **Array**, every non-blank, non-comment line is
  an array-item line (§ 5.4). A line that looks like a pair (e.g.
  \`host: localhost\`) is just a bare scalar String per § 5.4 rule 9;
  there is no implicit re-classification back to a pair. Use the raw
  marker form to make a colon-bearing scalar unambiguous.
- Inside a top-level **Object**, every line is a pair line (§ 5.3).
  A bare scalar without \`:\` is a \`MissingSeparator\` error.

Note (vs. 0.1.1): rules 4 and 5 differ from earlier versions. In
0.1.1, a lone \`{\` or \`[\` as the first content line opened a single
Object / Array item inside a root-level Array. In 0.5.0+, the lone
opener is the root itself: a single multi-line Object / Array
spanning the document, with no enclosing Array. The JSONL-style
form (multiple top-level inline objects \`{a:1}\` followed by \`{b:2}\`
producing a root Array) is no longer accepted.

`,
  ru: `
«Первая содержательная строка» — первая строка, не являющаяся ни
пустой (§ 5.1 правило 1), ни комментарием (§ 5.1 правило 2). Тип
корня устанавливается по этой строке так. Правила применяются по
порядку; побеждает первое совпавшее.

1. Если у документа **нет содержательных строк** (пустой документ
   либо только пустые/комментарии) → корень — пустой **Object**.
2. Если первая содержательная строка после trim — **замкнутый
   inline-объект** \`{ … }\` (с балансированным содержимым и
   соответствующей \`}\` как последней непробельной кодовой точкой
   строки после trim) → корень **И ЕСТЬ** этот inline Object. Документ
   MUST не иметь дальнейших содержательных строк; любая
   последующая непустая некомментарная строка — ошибка
   \`OrphanLineAfterTopLevelInline\` (§ 6.14).
3. Если первая содержательная строка после trim — **замкнутый
   inline-массив** \`[ … ]\` (с балансированным содержимым и
   соответствующей \`]\` как последней непробельной кодовой точкой
   строки после trim) → корень **И ЕСТЬ** этот inline Array. Документ
   MUST не иметь дальнейших содержательных строк; любая
   последующая непустая некомментарная строка — ошибка
   \`OrphanLineAfterTopLevelInline\` (§ 6.14).
4. Если первая содержательная строка после trim — **одиночный \`{\`**
   (только открывающая фигурная скобка, возможно с пробелами до
   и после) → корень — **многострочный Object**, открытый этой
   скобкой. Соответствующая \`}\` на последующей строке закрывает
   корень; любое содержимое после этой строки закрытия —
   \`OrphanLineAfterTopLevelInline\` (§ 6.14).
5. Если первая содержательная строка после trim — **одиночный \`[\`**
   → корень — **многострочный Array**, открытый этой скобкой.
   Соответствующая \`]\` закрывает корень; содержимое после строки
   закрытия — \`OrphanLineAfterTopLevelInline\` (§ 6.14).

   Если первая содержательная строка после trim начинается с \`[\`
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

   Детекция нарочно двухфазная. Фаза 1 (это правило) — чисто
   лексический тест на форму: префикс перед разделителем НЕ
   обязан быть грамматически валидным \`<key>\` (§ 4) в момент
   детекции, поэтому первая строка вида \`a,b: 1\` всё равно
   выбирает корень Object. Фаза 2 — единообразная валидация:
   после установления контекста Object § 5.3 / § 5.3.1 проверяют
   сырой префикс ключа кандидата в точности так же, как любую
   другую pair line внутри уже установленного Object (§ 5.1
   правило 8), — та же строка затем даёт \`InvalidKey\` (§ 6.4),
   \`EmptyKey\` (§ 6.5) или \`BadEscapeSequence\` (§ 6.13), в
   зависимости от случая. Склеенная строка с обычным \`:\`
   (например \`a,b:1\`, без пробела после разделителя) кандидатом
   в pair не является и проваливается в правило 7 (голый
   скалярный элемент массива); склеенная строка с \`::\` кандидатом
   является, а склейка проявляется в фазе 2 как
   \`MissingSeparatorSpace\` (§ 6.10).
7. Иначе, если первая содержательная строка после trim распознана
   как **array-item line** по § 5.4 (за исключением правил 4 / 5
   выше) — голый скаляр, raw-маркер \`:: …\`, многострочный опенер
   \`(\` / \`((\`, пустые-составные сокращения \`{}\` / \`[]\` / \`()\` /
   \`(())\`, или замкнутое inline-составное, не подошедшее под
   правила 2 / 3 — → корень — **Array** с этой строкой как
   первым элементом.
8. Иначе (голый закрывающий \`}\` / \`]\` на первой содержательной
   строке или иначе неклассифицируемая строка) — ошибка
   \`UnbalancedBracket\` (§ 6.1).

Тип корня **фиксирован** первой содержательной строкой. Последующие
строки диспетчеризуются по § 5.1 согласно выбранному типу:

- Внутри top-level **Array** каждая непустая строка, не являющаяся
  комментарием, является array-item line (§ 5.4). Строка, выглядящая
  как pair (например \`host: localhost\`), — просто голый скаляр String
  по § 5.4 правило 9; неявной переклассификации обратно в pair не
  происходит. Используйте raw-маркерную форму, чтобы сделать скаляр
  с двоеточием однозначным.
- Внутри top-level **Object** каждая строка — pair-строка (§ 5.3).
  Голый скаляр без \`:\` — ошибка \`MissingSeparator\`.

Замечание (vs. 0.1.1): правила 4 и 5 отличаются от предыдущих
версий. В 0.1.1 одиночный \`{\` или \`[\` на первой содержательной
строке открывал одиночный Object / Array элемент внутри
корневого Array. В 0.5.0 одиночный опенер — сам корень: один
многострочный Object / Array на весь документ, без обёртки Array.
JSONL-стиль (несколько top-level inline-объектов \`{a:1}\` и
\`{b:2}\`, дающие корневой Array) больше не принимается.

`,
  zh: `
「首条内容行」即既非空白(§ 5.1 规则 1)亦非注释(§ 5.1 规则 2)
的第一行。根按此行判定。规则按顺序应用;首条匹配规则胜出。

1. 若文档**无内容行**(空文档,或仅含空白/注释)→ 根为空 **Object**。
2. 若首条内容行经 trim 后为**闭合 inline 对象** \`{ … }\`(同一行
   内有平衡内容,匹配的 \`}\` 为 trim 后行末非空白码点)→ 根**就是**
   该 inline Object。文档 MUST 无其他内容行;任何后续的非空白
   非注释行都是 \`OrphanLineAfterTopLevelInline\` 错误(§ 6.14)。
3. 若首条内容行经 trim 后为**闭合 inline 数组** \`[ … ]\`(同一行
   内有平衡内容,匹配的 \`]\` 为 trim 后行末非空白码点)→ 根**就
   是**该 inline Array。文档 MUST 无其他内容行;任何后续的
   非空白非注释行都是 \`OrphanLineAfterTopLevelInline\` 错误
   (§ 6.14)。
4. 若首条内容行经 trim 后为**单独的 \`{\`**(仅开启大括号,可能前
   后有空白)→ 根为**多行 Object**,由此括号开启。其匹配的 \`}\`
   在后续行关闭根;关闭行之后的任何内容是
   \`OrphanLineAfterTopLevelInline\`(§ 6.14)。
5. 若首条内容行经 trim 后为**单独的 \`[\`** → 根为**多行 Array**,
   由此括号开启。其匹配的 \`]\` 关闭根;关闭行之后的内容是
   \`OrphanLineAfterTopLevelInline\`(§ 6.14)。

   若首条内容行经 trim 后以 \`[\` 或 \`{\` 开头,但不符合上述规则
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

根类型由首条内容行**固定**。随后的各行根据所选类型按 § 5.1 分发:

- 在 top-level **Array** 内,每一条非空白、非注释行都是
  array-item line(§ 5.4)。看似 pair 的行(如 \`host: localhost\`)
  按 § 5.4 规则 9 只是裸标量 String;不存在隐式重新归类回 pair 的
  机制。请使用原始标记形式,使含冒号的标量无歧义。
- 在 top-level **Object** 内,每一行都是 pair 行(§ 5.3)。
  不含 \`:\` 的裸标量是 \`MissingSeparator\` 错误。

说明(vs. 0.1.1):规则 4 与 5 与早期版本不同。0.1.1 中,首条内容
行的单独 \`{\` 或 \`[\` 在根级 Array 内打开一个 Object / Array 项;
0.5.0 中单独开启符即为根本身:整篇文档是一个多行 Object / Array,
无外包 Array。JSONL 式形式(多个 top-level inline 对象 \`{a:1}\`
后跟 \`{b:2}\` 产生根 Array)不再被接受。

`,
};
