>>>>> lang=en
- **Contains a `CR` byte (`0x0D`):** the Value is **not
  representable** in canonical form. A `CR` byte in a String can
  only be produced through the `\r` escape or the generic `\uXXXX`
  escape naming code point 000D, inside an inline compound
  (§ 3.7, § 3.7.1), and canonical form never emits inline
  compounds for non-empty scalars. A writer-conforming
  implementation MUST reject such a Value with an error rather
  than serialise it; it is outside the scope of the round-trip
  property of § 8.3. Portable documents SHOULD NOT rely on `CR`
  bytes in String values.
- **Requires multi-line representation:** when *body* contains `LF`,
  has leading or trailing whitespace (§ 3.3), or contains an ASCII
  control byte in `0x00`–`0x1F` other than `0x09` `TAB`, `0x0A`
  `LF`, and `0x0D` `CR` (which the preceding branch rejects), select
  multi-line representation and apply the collision and
  representability checks below. Subject to those checks, use verbatim
  form `((` … `))`: emit the opener on the value line (preceded by
  `key: ` for a pair, or alone for an item) at the current indent,
  split *body* on `LF`, emit every resulting segment as one line at
  **indent 0**, and emit the closer `))` on its own line at the current
  indent. Verbatim body segments have no writer-added indentation,
  because verbatim form preserves bytes exactly. The checks below
  override this default by requiring stripped form or rejection where
  applicable.
- **Empty String (`""`):** emit as `key:` (no body after the
  colon) for a pair, or `::` (no body) for an array item.
- **Physically safe non-empty one-line String:** this branch applies
  only when no preceding branch matched. The writer MUST then apply the
  exhaustive rule for the actual syntactic position. For a pair, apply
  § 5.9.5: use plain `key: <body>` only when its dispatch conditions
  hold, and otherwise use raw-marker `key:: <body>`. For an array item,
  apply § 5.9.6: use bare `<body>` only when the same plain-form
  dispatch conditions hold and none of the item-position hazards apply,
  and otherwise use raw-marker `:: <body>`. These delegated rules
  include numeric and `null` / `true` / `false` collisions, `{` /
  `[` prefixes, the `(` / `((` / `()` / `(())` dispatch forms,
  item bodies exactly `}` or `]`, item bodies starting with `##` or
  `::`, and the first-Array-root-item pair-shape and U+FEFF hazards.
  They are exhaustive within this branch; this section MUST NOT select
  plain or bare form where § 5.9.5 or § 5.9.6 requires a raw marker.

For example, String bodies `" x"` and `"x "` select the multi-line
branch and round-trip through verbatim form, whereas `"{abc"` reaches
the physically safe one-line branch and uses `key:: {abc` in a pair or
`:: {abc` in an array-item position because its `{` prefix collides
with compound dispatch.

>>>>> lang=ru
- **Содержит байт `CR` (`0x0D`):** Value **не представимо** в
  канонической форме. Байт `CR` в String может появиться только
  через escape `\r` либо через обобщённый escape `\uXXXX`,
  называющий кодовую точку 000D, внутри inline-составного
  (§ 3.7, § 3.7.1), а канонический эмиттер никогда не выводит
  inline-составные для непустых скаляров.
  Реализация-эмиттер MUST отклонить такое Value с ошибкой, а не
  сериализовать его; это вне области действия round-trip свойства
  § 8.3. Переносимые документы SHOULD NOT полагаться на байты `CR`
  в String-значениях.
- **Требует multi-line представления:** когда *body* содержит `LF`,
  имеет ведущие или хвостовые пробельные символы (§ 3.3) либо
  содержит ASCII управляющий байт из диапазона `0x00`–`0x1F`, кроме
  `0x09` `TAB`, `0x0A` `LF` и `0x0D` `CR` (который отклоняет
  предыдущая ветвь),
  выбрать
  multi-line представление и применить описанные ниже проверки коллизий
  и представимости. С учётом этих проверок используется verbatim-форма
  `((` … `))`: опенер выводится на строке значения (с предшествующим
  `key: ` для пары или отдельно для элемента) на текущем отступе, *body*
  разбивается по `LF`, каждый получившийся сегмент выводится отдельной
  строкой на **отступе 0**, а закрытие `))` — отдельной строкой на
  текущем отступе. Writer не добавляет отступ к сегментам verbatim-тела,
  поскольку verbatim-форма сохраняет байты в точности. Проверки ниже
  имеют приоритет над этой формой по умолчанию и требуют stripped-форму
  либо отклонение там, где это применимо.
- **Пустая String (`""`):** выводить как `key:` (без тела после
  двоеточия) для пары или `::` (без тела) для элемента массива.
- **Физически безопасная непустая однострочная String:** эта ветвь
  применяется, только если ни одна предыдущая ветвь не совпала. Затем
  writer MUST применить исчерпывающее правило для фактической
  синтаксической позиции. Для пары применяется § 5.9.5: обычная форма
  `key: <body>` используется только при выполнении её условий
  диспетчеризации, иначе используется raw-маркер `key:: <body>`. Для
  элемента массива применяется § 5.9.6: голая форма `<body>`
  используется только при выполнении тех же условий обычной формы и
  отсутствии позиционных коллизий элемента, иначе используется
  raw-маркер `:: <body>`. Эти делегированные правила включают числовые
  коллизии и `null` / `true` / `false`, префиксы `{` / `[`, формы
  диспетчеризации `(` / `((` / `()` / `(())`, тела элементов,
  равные в точности `}` или `]`, тела элементов с префиксом `##` или
  `::`, а также pair-shape- и U+FEFF-коллизии первого элемента корневого
  Array. Внутри этой ветви они исчерпывающи; этот раздел MUST NOT
  выбирать обычную или голую форму, если § 5.9.5 или § 5.9.6 требует
  raw-маркер.

Например, тела String `" x"` и `"x "` выбирают multi-line ветвь и
round-trip через verbatim-форму, тогда как `"{abc"` достигает ветви
физически безопасной однострочной String и из-за коллизии префикса `{`
с диспетчеризацией составного значения использует `key:: {abc` в паре
или `:: {abc` в позиции элемента массива.

>>>>> lang=zh
- **含 `CR` 字节(`0x0D`)**:Value 在规范形式中**不可表示**。
  String 中的 `CR` 字节只能通过 inline 复合值内的 `\r` 转义,
  或指称码点 000D 的通用 `\uXXXX` escape(§ 3.7、§ 3.7.1)生成,
  而规范形式从不为非空标量输出 inline 复合值。
  writer-conforming 实现 MUST 以错误拒绝此类 Value,而不是将其
  序列化;它不在 § 8.3 round-trip 性质的范围内。可移植文档
  SHOULD NOT 在 String 值中依赖 `CR` 字节。
- **需要多行表示:** 当 *body* 含 `LF`、带前导或尾部空白
  (§ 3.3),或含 `0x00`–`0x1F` 范围内除 `0x09` `TAB`、`0x0A`
  `LF` 和 `0x0D` `CR` 之外的 ASCII 控制字节(`CR` 由前一分支
  拒绝)时,选择多行
  表示并应用下文的碰撞与可表示性检查。在这些检查约束下,使用
  verbatim 形式 `((` … `))`:在当前缩进的值行输出开启符(对带
  `key: ` 前缀,项则单独输出),按 `LF` 切分 *body*,将每个所得段
  作为一行在**缩进 0**输出,并在当前缩进的单独一行输出关闭符
  `))`。Writer 不为 verbatim 体段添加缩进,因为 verbatim 形式精确
  保留字节。下文的检查优先于此默认形式,在适用时要求 stripped
  形式或拒绝该 Value。
- **空 String (`""`)**:pair 输出 `key:`(冒号后无体);数组项输出
  `::`(无体)。
- **物理安全的非空单行 String:** 仅当此前分支均不匹配时才进入
  此分支。Writer MUST 随后应用实际语法位置的完整规则。对 pair
  应用 § 5.9.5:仅当其分发条件成立时使用普通形式
  `key: <body>`,否则使用原始标记 `key:: <body>`。对数组项应用
  § 5.9.6:仅当相同的普通形式条件成立且不存在项位置冲突时使用裸
  形式 `<body>`,否则使用原始标记 `:: <body>`。这些委托规则包括
  number 与 `null` / `true` / `false` 冲突、`{` / `[` 前缀、
  `(` / `((` / `()` / `(())` 分发形式、恰好为 `}` 或 `]` 的
  项体、以 `##` 或 `::` 开头的项体,以及根 Array 第一项的
  pair-shape 和 U+FEFF 风险。在此分支内这些规则是完整的;当
  § 5.9.5 或 § 5.9.6 要求原始标记时,本节 MUST NOT 选择普通或裸形式。

例如,String 体 `" x"` 和 `"x "` 选择多行分支并通过 verbatim
形式 round-trip,而 `"{abc"` 到达物理安全的单行分支;由于其 `{`
前缀与复合值分发冲突,它在 pair 中使用 `key:: {abc`,在数组项位置
使用 `:: {abc`。

