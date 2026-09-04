export default {
  en: `
Let *body* be the byte sequence of a String Value.

The writer MUST test the following branches in order; the first matching
branch determines the result or form-selection path:

- **Contains a \`CR\` byte (\`0x0D\`):** the Value is **not
  representable** in canonical form. A \`CR\` byte in a String can
  only be produced through the \`\\r\` escape or the generic \`\\uXXXX\`
  escape naming code point 000D, inside an inline compound
  (§ 3.7, § 3.7.1), and canonical form never emits inline
  compounds for non-empty scalars. A writer-conforming
  implementation MUST reject such a Value with an error rather
  than serialise it; it is outside the scope of the round-trip
  property of § 8.3. Portable documents SHOULD NOT rely on \`CR\`
  bytes in String values.
- **Requires multi-line representation:** when *body* contains \`LF\`,
  has leading or trailing whitespace (§ 3.3), or contains an ASCII
  control byte in \`0x00\`–\`0x1F\` other than \`0x09\` \`TAB\`, \`0x0A\`
  \`LF\`, and \`0x0D\` \`CR\` (which the preceding branch rejects), select
  multi-line representation and apply the collision and
  representability checks below. Subject to those checks, use verbatim
  form \`((\` … \`))\`: emit the opener on the value line (preceded by
  \`key: \` for a pair, or alone for an item) at the current indent,
  split *body* on \`LF\`, emit every resulting segment as one line at
  **indent 0**, and emit the closer \`))\` on its own line at the current
  indent. Verbatim body segments have no writer-added indentation,
  because verbatim form preserves bytes exactly. The checks below
  override this default by requiring stripped form or rejection where
  applicable.
- **Empty String (\`""\`):** emit as \`key:\` (no body after the
  colon) for a pair, or \`::\` (no body) for an array item.
- **Physically safe non-empty one-line String:** this branch applies
  only when no preceding branch matched. The writer MUST then apply the
  exhaustive rule for the actual syntactic position. For a pair, apply
  § 5.9.5: use plain \`key: <body>\` only when its dispatch conditions
  hold, and otherwise use raw-marker \`key:: <body>\`. For an array item,
  apply § 5.9.6: use bare \`<body>\` only when the same plain-form
  dispatch conditions hold and none of the item-position hazards apply,
  and otherwise use raw-marker \`:: <body>\`. These delegated rules
  include numeric and \`null\` / \`true\` / \`false\` collisions, \`{\` /
  \`[\` prefixes, the \`(\` / \`((\` / \`()\` / \`(())\` dispatch forms,
  item bodies exactly \`}\` or \`]\`, item bodies starting with \`##\` or
  \`::\`, and the first-Array-root-item pair-shape and U+FEFF hazards.
  They are exhaustive within this branch; this section MUST NOT select
  plain or bare form where § 5.9.5 or § 5.9.6 requires a raw marker.

For example, String bodies \`" x"\` and \`"x "\` select the multi-line
branch and round-trip through verbatim form, whereas \`"{abc"\` reaches
the physically safe one-line branch and uses \`key:: {abc\` in a pair or
\`:: {abc\` in an array-item position because its \`{\` prefix collides
with compound dispatch.

The canonical writer prefers verbatim multi-line form \`((\` … \`))\`
for strings requiring multi-line representation. If any segment of
the body (after splitting on \`LF\`), when trimmed of leading and
trailing whitespace (§ 3.3), is exactly \`))\` — matching § 5.6.1's
parser-side closer trigger, which trims a content line before
comparing it to \`))\` — verbatim form is impossible: the segment
would be misread as the closer regardless of any leading or
trailing whitespace of its own (e.g. a segment \`"  ))"\` collides
just as much as a bare \`"))"\`). In that case the canonical writer
MUST switch to stripped form \`(\` … \`)\` with no leading indent (the
writer emits body segments at indent 0 so the common-indent
computation yields zero). The closing \`)\` line is then at the
outer indent.

(Rationale: stripped form's \`)\` closer leaves \`))\` available as
content, which is the only way to represent that byte sequence in
a multi-line value — provided no segment also collides with the
\`)\` closer; see below.)

A String whose body would require both forms — containing a
segment that trims to exactly \`))\` (forcing the stripped-form
fallback above) AND a segment that trims to exactly \`)\` (which
would then collide with the stripped-form closer) — is not
representable in the canonical multi-line form. A writer-conforming
implementation MUST reject such a Value with an error rather than
serialise it; it is outside the scope of the round-trip property of
§ 8.3. Portable documents SHOULD NOT rely on such content.

As of 0.7.0, a body containing a segment that trims to exactly
\`))\` (forcing the stripped-form fallback above) that ALSO has
trailing whitespace (§ 3.3) on any content line is likewise not
representable: the stripped form now strips that trailing
whitespace on emission, so the fallback would silently lose it. A
writer-conforming implementation MUST reject such a Value with an
error rather than serialise it, exactly as for the
both-forms-required case above. Portable documents SHOULD NOT rely
on trailing whitespace inside a multi-line String body that also
requires a segment trimming to \`))\`.

Independently of the trailing-whitespace case above, a body forced
into stripped form (via a segment trimming to exactly \`))\`) where
every non-blank segment shares at least one leading whitespace code
point in the same position is likewise not representable: on
re-parse, § 5.6's minimum-leading-whitespace computation cannot
distinguish that shared leading whitespace from writer-added
structural indentation, and would strip it. This ambiguity in the
stripped form's parsing rule predates 0.7.0 — it is documented here
for the first time, alongside the other non-representable cases
this form already has. A writer-conforming implementation MUST
reject such a Value with an error rather than serialise it, exactly
as for the other cases above. Portable documents SHOULD NOT rely on
shared leading whitespace inside a multi-line String body that also
requires a segment trimming to \`))\`.

`,
  ru: `
Пусть *body* — байтовая последовательность String Value.

Writer MUST проверять следующие ветви по порядку; первая совпавшая ветвь
определяет результат или путь выбора формы:

- **Содержит байт \`CR\` (\`0x0D\`):** Value **не представимо** в
  канонической форме. Байт \`CR\` в String может появиться только
  через escape \`\\r\` либо через обобщённый escape \`\\uXXXX\`,
  называющий кодовую точку 000D, внутри inline-составного
  (§ 3.7, § 3.7.1), а канонический эмиттер никогда не выводит
  inline-составные для непустых скаляров.
  Реализация-эмиттер MUST отклонить такое Value с ошибкой, а не
  сериализовать его; это вне области действия round-trip свойства
  § 8.3. Переносимые документы SHOULD NOT полагаться на байты \`CR\`
  в String-значениях.
- **Требует multi-line представления:** когда *body* содержит \`LF\`,
  имеет ведущий или хвостовой пробел (§ 3.3) либо содержит ASCII
  управляющий байт из диапазона \`0x00\`–\`0x1F\`, кроме \`0x09\` \`TAB\`,
  \`0x0A\` \`LF\` и \`0x0D\` \`CR\` (который отклоняет предыдущая ветвь),
  выбрать
  multi-line представление и применить описанные ниже проверки коллизий
  и представимости. С учётом этих проверок используется verbatim-форма
  \`((\` … \`))\`: опенер выводится на строке значения (с предшествующим
  \`key: \` для пары или отдельно для элемента) на текущем отступе, *body*
  разбивается по \`LF\`, каждый получившийся сегмент выводится отдельной
  строкой на **отступе 0**, а закрытие \`))\` — отдельной строкой на
  текущем отступе. Writer не добавляет отступ к сегментам verbatim-тела,
  поскольку verbatim-форма сохраняет байты в точности. Проверки ниже
  имеют приоритет над этой формой по умолчанию и требуют stripped-форму
  либо отклонение там, где это применимо.
- **Пустая String (\`""\`):** выводить как \`key:\` (без тела после
  двоеточия) для пары или \`::\` (без тела) для элемента массива.
- **Физически безопасная непустая однострочная String:** эта ветвь
  применяется, только если ни одна предыдущая ветвь не совпала. Затем
  writer MUST применить исчерпывающее правило для фактической
  синтаксической позиции. Для пары применяется § 5.9.5: обычная форма
  \`key: <body>\` используется только при выполнении её условий
  диспетчеризации, иначе используется raw-маркер \`key:: <body>\`. Для
  элемента массива применяется § 5.9.6: голая форма \`<body>\`
  используется только при выполнении тех же условий обычной формы и
  отсутствии позиционных коллизий элемента, иначе используется
  raw-маркер \`:: <body>\`. Эти делегированные правила включают числовые
  коллизии и \`null\` / \`true\` / \`false\`, префиксы \`{\` / \`[\`, формы
  диспетчеризации \`(\` / \`((\` / \`()\` / \`(())\`, тела элементов,
  равные в точности \`}\` или \`]\`, тела элементов с префиксом \`##\` или
  \`::\`, а также pair-shape- и U+FEFF-коллизии первого элемента корневого
  Array. Внутри этой ветви они исчерпывающи; этот раздел MUST NOT
  выбирать обычную или голую форму, если § 5.9.5 или § 5.9.6 требует
  raw-маркер.

Например, тела String \`" x"\` и \`"x "\` выбирают multi-line ветвь и
round-trip через verbatim-форму, тогда как \`"{abc"\` достигает ветви
физически безопасной однострочной String и из-за коллизии префикса \`{\`
с диспетчеризацией составного значения использует \`key:: {abc\` в паре
или \`:: {abc\` в позиции элемента массива.

Канонический эмиттер предпочитает verbatim multi-line \`((\` … \`))\`
для строк, требующих многострочного представления. Если какой-то
сегмент тела (после разбивки по \`LF\`), будучи обрезан от ведущих
и хвостовых пробельных символов (§ 3.3), в точности равен \`))\` —
совпадая с триггером закрывателя на стороне парсера из § 5.6.1,
который обрезает содержательную строку перед сравнением с \`))\` —
verbatim форма невозможна: сегмент был бы ошибочно принят за
закрыватель независимо от собственных ведущих или хвостовых
пробелов (например, сегмент \`"  ))"\` сталкивается так же, как и
голый \`"))"\`). В этом случае канонический эмиттер MUST переключиться
на stripped форму \`(\` … \`)\` без ведущего отступа (writer выводит
сегменты тела на отступе 0, так что вычисление общего отступа даёт
ноль). Закрывающая \`)\` строка выводится на внешнем отступе.

(Обоснование: stripped-форма с закрывателем \`)\` оставляет \`))\`
доступным как содержание — единственный способ представить такую
последовательность байтов в multi-line значении — при условии, что
ни один сегмент также не сталкивается с закрывателем \`)\`; см. ниже.)

String, тело которой требует обеих форм — содержит сегмент,
обрезающийся в точности до \`))\` (вынуждающий откат к
stripped-форме выше), И сегмент, обрезающийся в точности до \`)\`
(который тогда столкнётся с закрывателем stripped-формы) — не
представима в канонической multi-line форме. Реализация-эмиттер
MUST отклонить такое Value с ошибкой, а не сериализовать его; это
вне области действия round-trip свойства § 8.3. Переносимые
документы SHOULD NOT полагаться на такое содержимое.

Начиная с 0.7.0, тело, содержащее сегмент, обрезающийся в точности
до \`))\` (вынуждающий откат к stripped-форме выше), которое ТАКЖЕ
имеет хвостовой пробел (§ 3.3) на какой-либо содержательной
строке, также не представимо: stripped-форма теперь обрезает этот
хвостовой пробел при выводе, так что откат незаметно потерял бы
его. Реализация-эмиттер MUST отклонить такое Value с ошибкой, а не
сериализовать его, точно так же, как и для случая, требующего
обеих форм выше. Переносимые документы SHOULD NOT полагаться на
хвостовой
пробел внутри multi-line String, которая также требует сегмента,
обрезающегося до \`))\`.

Независимо от случая с хвостовым пробелом выше, тело, вынужденное
перейти в stripped-форму (через сегмент, обрезающийся в точности
до \`))\`), в котором каждый непустой сегмент разделяет как минимум
одну пробельную кодовую точку на одной и той же позиции, также не
представимо: при повторном парсинге вычисление общего ведущего
пробела из § 5.6 не может отличить этот общий ведущий пробел от
структурного отступа, добавленного writer'ом, и обрежет его. Эта
неоднозначность в правиле парсинга stripped-формы существовала до
0.7.0 — здесь она задокументирована впервые, наряду с другими
непредставимыми случаями, уже существующими для этой формы.
Реализация-эмиттер MUST отклонить такое Value с ошибкой, а не
сериализовать его, точно так же, как и для других случаев выше.
Переносимые документы
SHOULD NOT полагаться на общий ведущий пробел внутри multi-line
String, которая также требует сегмента, обрезающегося до \`))\`.

`,
  zh: `
设 *body* 为 String Value 的字节序列。

Writer MUST 按顺序检查以下分支;第一个匹配的分支决定结果或形式选择路径:

- **含 \`CR\` 字节(\`0x0D\`)**:Value 在规范形式中**不可表示**。
  String 中的 \`CR\` 字节只能通过 inline 复合值内的 \`\\r\` 转义,
  或指称码点 000D 的通用 \`\\uXXXX\` escape(§ 3.7、§ 3.7.1)生成,
  而规范形式从不为非空标量输出 inline 复合值。
  writer-conforming 实现 MUST 以错误拒绝此类 Value,而不是将其
  序列化;它不在 § 8.3 round-trip 性质的范围内。可移植文档
  SHOULD NOT 在 String 值中依赖 \`CR\` 字节。
- **需要多行表示:** 当 *body* 含 \`LF\`、带前导或尾部空白
  (§ 3.3),或含 \`0x00\`–\`0x1F\` 范围内除 \`0x09\` \`TAB\`、\`0x0A\`
  \`LF\` 和 \`0x0D\` \`CR\` 之外的 ASCII 控制字节(\`CR\` 由前一分支
  拒绝)时,选择多行
  表示并应用下文的碰撞与可表示性检查。在这些检查约束下,使用
  verbatim 形式 \`((\` … \`))\`:在当前缩进的值行输出开启符(对带
  \`key: \` 前缀,项则单独输出),按 \`LF\` 切分 *body*,将每个所得段
  作为一行在**缩进 0**输出,并在当前缩进的单独一行输出关闭符
  \`))\`。Writer 不为 verbatim 体段添加缩进,因为 verbatim 形式精确
  保留字节。下文的检查优先于此默认形式,在适用时要求 stripped
  形式或拒绝该 Value。
- **空 String (\`""\`)**:对输出 \`key:\`(冒号后无体);数组项输出
  \`::\`(无体)。
- **物理安全的非空单行 String:** 仅当此前分支均不匹配时才进入
  此分支。Writer MUST 随后应用实际语法位置的完整规则。对 pair
  应用 § 5.9.5:仅当其分发条件成立时使用普通形式
  \`key: <body>\`,否则使用原始标记 \`key:: <body>\`。对数组项应用
  § 5.9.6:仅当相同的普通形式条件成立且不存在项位置冲突时使用裸
  形式 \`<body>\`,否则使用原始标记 \`:: <body>\`。这些委托规则包括
  number 与 \`null\` / \`true\` / \`false\` 冲突、\`{\` / \`[\` 前缀、
  \`(\` / \`((\` / \`()\` / \`(())\` 分发形式、恰好为 \`}\` 或 \`]\` 的
  项体、以 \`##\` 或 \`::\` 开头的项体,以及根 Array 第一项的
  pair-shape 和 U+FEFF 风险。在此分支内这些规则是完整的;当
  § 5.9.5 或 § 5.9.6 要求原始标记时,本节 MUST NOT 选择普通或裸形式。

例如,String 体 \`" x"\` 和 \`"x "\` 选择多行分支并通过 verbatim
形式 round-trip,而 \`"{abc"\` 到达物理安全的单行分支;由于其 \`{\`
前缀与复合值分发冲突,它在 pair 中使用 \`key:: {abc\`,在数组项位置
使用 \`:: {abc\`。

规范 writer 对需要多行表示的字符串优先 verbatim 多行 \`((\` …
\`))\`。若体的某个段(按 \`LF\` 切分后),在修剪前后空白(§ 3.3)后
恰为 \`))\`—— 与 § 5.6.1 中解析器侧的关闭符触发条件一致,该条件
在比较前先修剪内容行 —— 则 verbatim 形式不可能:无论该段自身
是否带有前导或尾部空白,都会被误判为关闭符(例如段 \`"  ))"\`
与裸 \`"))"\` 一样会发生碰撞)。此时规范 writer MUST 切换到
stripped 形式 \`(\` … \`)\`,无前导缩进(writer 在缩进 0 输出体段,
使公共缩进计算为零)。关闭的 \`)\` 行在外层缩进。

(理由:stripped 形式的 \`)\` 关闭符让 \`))\` 可作为内容 —— 这是
多行值中表达该字节序列的唯一方式 —— 前提是没有其他段也与 \`)\`
关闭符发生碰撞;见下文。)

体同时需要两种形式的 String —— 既含有修剪后恰为 \`))\` 的段
(迫使采用上述 stripped 回退),又含有修剪后恰为 \`)\` 的段(会与
stripped 形式的关闭符碰撞)—— 不能以规范多行形式表示。
writer-conforming 实现 MUST 以错误拒绝此类 Value,而不是将其
序列化;它不在 § 8.3 round-trip 性质的范围内。可移植文档
SHOULD NOT 依赖此类内容。

自 0.7.0 起,若体含有修剪后恰为 \`))\` 的段(迫使采用上述 stripped
回退),且**同时**在任意内容行上还有尾部空白(§ 3.3),同样不可
表示:stripped 形式现在会在输出时去除该尾部空白,导致回退悄悄
丢失它。writer-conforming 实现 MUST 以错误拒绝此类 Value,而不是
将其序列化,与上述两种形式皆需的情形处理方式相同。可移植文档
SHOULD NOT 在同时需要修剪后恰为 \`))\` 的段的多行 String 内容中
依赖尾部空白。

与上面的尾部空白情形无关,若体被迫采用 stripped 形式(通过修剪后
恰为 \`))\` 的段),且每个非空段在相同位置至少共享一个空白码点,
同样不可表示:重解析时,§ 5.6 的公共前导空白计算无法将这一共享
前导空白与 writer 添加的结构性缩进区分开,会将其去除。stripped
形式解析规则中的这一模糊性早于 0.7.0 就已存在 —— 此处首次将其
记录下来,与该形式已有的其他不可表示情形并列。writer-conforming
实现 MUST 以错误拒绝此类 Value,而不是将其序列化,与上述其他
情形处理方式相同。可移植文档 SHOULD NOT 在同时需要修剪
后恰为 \`))\` 的段的多行 String 内容中依赖共享的前导空白。

`,
};
