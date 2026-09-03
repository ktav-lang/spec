export default {
  en: `
Let *body* be the byte sequence of a String Value.

- **Empty String (\`""\`):** emit as \`key:\` (no body after the
  colon) for a pair, or \`::\` (no body) for an array item.
- **One-line printable, no edge-whitespace, no numeric/keyword
  collision:** emit as \`key: <body>\` (pair) or \`<body>\` (item).
- **One-line, but matches the integer or float literal grammar of
  § 3.6 (regardless of whether the value fits the writer's own
  numeric domain — § 5) or is exactly \`null\` / \`true\` / \`false\`:**
  emit as \`key:: <body>\` (pair) or \`:: <body>\` (item), using the
  raw marker.
- **Contains \`LF\`, leading/trailing whitespace, or any control byte
  (\`0x00\`–\`0x1F\` other than \`0x09\` \`TAB\` and \`0x0A\` \`LF\`, and not
  \`0x0D\` \`CR\`, which the next bullet handles separately):** emit
  as verbatim multi-line \`((\` … \`))\`. The opener \`((\` is emitted
  on the value line (preceded by \`key: \` for a pair, or alone for
  an item) at the current indent. The body is split on \`LF\`; each
  resulting segment is emitted as one line at **indent 0** (no
  leading whitespace — because verbatim form preserves bytes
  exactly, any indentation would be injected into the value). The
  closer \`))\` is emitted on its own line at the current indent.
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

- **Пустая String (\`""\`):** выводить как \`key:\` (без тела после
  двоеточия) для пары или \`::\` (без тела) для элемента массива.
- **Однострочная печатная, без edge-пробелов, без числового /
  ключевого коллизии:** выводить как \`key: <body>\` (пара) или
  \`<body>\` (элемент).
- **Однострочная, но совпадает с грамматикой integer- или
  float-литерала § 3.6 (независимо от того, помещается ли значение
  в собственный числовой домен writer'а — § 5) или равна в точности
  \`null\` / \`true\` / \`false\`:** выводить как \`key:: <body>\` (пара)
  или \`:: <body>\` (элемент), используя raw-маркер.
- **Содержит \`LF\`, ведущий/хвостовой пробел, или управляющий байт
  (\`0x00\`–\`0x1F\` кроме \`0x09\` \`TAB\` и \`0x0A\` \`LF\`, и не \`0x0D\`
  \`CR\`, который обрабатывает следующий пункт отдельно):** выводить
  как verbatim multi-line \`((\` … \`))\`. Опенер \`((\` выводится на строке
  значения (с предшествующим \`key: \` для пары или отдельно для
  элемента) на текущем отступе. Тело разбивается по \`LF\`; каждый
  сегмент выводится одной строкой на **отступе 0** (без ведущих
  пробелов — verbatim сохраняет байты в точности, любая индентация
  была бы инжектирована в значение). Закрытие \`))\` выводится
  отдельной строкой на текущем отступе.
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

- **空 String (\`""\`)**:对输出 \`key:\`(冒号后无体);数组项输出
  \`::\`(无体)。
- **单行可打印,无边缘空白,无 number/keyword 冲突**:对输出
  \`key: <body>\`;项输出 \`<body>\`。
- **单行,但匹配 § 3.6 的 integer 或 float 字面量语法(无论其值
  是否落在 writer 自身的数值域内 —— § 5),或恰好等于 \`null\` /
  \`true\` / \`false\`**:
  使用原始标记输出 \`key:: <body>\` 或 \`:: <body>\`。
- **含 \`LF\`、前后空白或控制字节(\`0x00\`–\`0x1F\` 除 \`0x09\` \`TAB\`
  与 \`0x0A\` \`LF\`,且非 \`0x0D\` \`CR\`—— 由下一条单独处理)**:输出
  为 verbatim 多行 \`((\` … \`))\`。开启
  \`((\` 在值行上输出(对前缀 \`key: \`,项单独),位于当前缩进。
  体按 \`LF\` 切分;每段以一行的形式在**缩进 0**(无前导空白 ——
  verbatim 精确保留字节,任何缩进会被注入值)输出。关闭 \`))\` 在
  自身行上、当前缩进输出。
- **含 \`CR\` 字节(\`0x0D\`)**:Value 在规范形式中**不可表示**。
  String 中的 \`CR\` 字节只能通过 inline 复合值内的 \`\\r\` 转义,
  或指称码点 000D 的通用 \`\\uXXXX\` escape(§ 3.7、§ 3.7.1)生成,
  而规范形式从不为非空标量输出 inline 复合值。
  writer-conforming 实现 MUST 以错误拒绝此类 Value,而不是将其
  序列化;它不在 § 8.3 round-trip 性质的范围内。可移植文档
  SHOULD NOT 在 String 值中依赖 \`CR\` 字节。

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
