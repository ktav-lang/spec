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

`,
  ru: `
Пусть *body* — байтовая последовательность String Value.

Writer MUST проверять следующие ветви по порядку; первая совпавшая ветвь
определяет результат или путь выбора формы:

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

`,
};
