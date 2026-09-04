export default {
  en: `
- **Bare scalar item:** \`<bytes>\` on its own line at the current
  indent — when the body satisfies the same conditions as the
  \`key: <bytes>\` form of § 5.9.5 (including: does not start with
  \`{\` or \`[\`; is not exactly \`(\` or \`((\`), and — because an item
  line has no \`key: \` prefix, making the entire line the body — is
  additionally not exactly \`}\` or \`]\`, does not start with the
  two-byte sequence \`::\`, and does not start
  with the two-byte sequence \`##\`. A bare \`}\` or \`]\` line is
  unconditionally read by § 5.1's line-dispatch rules as closing
  the innermost open Object/Array (raising \`UnbalancedBracket\`,
  § 6.1, when the innermost open compound is actually an Array/Object);
  a body starting with the two-byte sequence \`::\` matches
  \`<item-literal>\`'s raw-marker form (§ 4) — consuming everything
  from that point on as the raw-marker's own body, per \`<sep-end>\` —
  rather than being read as literal content that happens to begin
  with those two bytes (this excludes not just a body of exactly
  \`::\`, but any body starting with it, e.g. \`:: x\` or \`::x\`: both
  are captured by the raw-marker grammar — the former as a
  raw-marker item with body \`x\`, the latter as \`MissingSeparatorSpace\`
  — so neither can ever survive as bare content); a body
  starting with \`##\` is unconditionally read by § 5.1 rule 2 as a
  comment (§ 3.4), dropping the entire line silently rather than
  raising an error. When the item is the **first item of an Array
  root** (§ 5.9.3), the bare form is additionally not used if the
  body would itself satisfy § 5.0.1 rule 6's phase-1 pair-candidate
  test — a first unescaped \`:\` or \`::\` separator (§ 4's
  separator-scanning rule) with a non-empty raw prefix before it,
  where a plain \`:\` separator is satisfied by \`<sep-end>\`; the
  prefix is not required to be a grammatically valid key at this
  stage, exactly as rule 6 itself does not require one (a first
  item like \`a,b: 1\` is a pair candidate here for the same reason
  it is one for root detection). Independently of the pair-candidate
  test, the bare form is also not used — regardless of whether that
  test applies — when the item is the first item of an Array root and
  the body begins with U+FEFF (§ 5.9.12): bare form would place the
  raw 3-byte UTF-8 encoding of U+FEFF at byte offset 0 of the
  document, which § 3.1 requires a conformant reader to strip as a
  metadata byte-order mark, silently losing the code point on
  re-parse. Only the Array root's
  first item is exposed to § 5.0.1's root-kind detection; every
  other item position is dispatched directly as an array-item line
  regardless of its shape (§ 5.1 rules 7–8), so neither exclusion
  applies there.
- **Raw-marker item:** \`:: <bytes>\` — when the body would otherwise
  be reinterpreted by § 5.2 as a number, keyword, an inline
  compound, a multi-line-string opener (a body of exactly \`(\` or
  \`((\`), or (via § 5.7's shortcuts) the empty String, or would
  otherwise collide with a line-level structural token (a body of
  exactly \`}\` or \`]\`, or starting with \`##\` or with the two-byte
  sequence \`::\`), or (when the
  item is the first item of an Array root) would otherwise satisfy
  § 5.0.1 rule 6's phase-1 pair-candidate test as described above, or
  (likewise only for the first item of an Array root) begins with
  U+FEFF (§ 5.9.12).
  The raw-marker form
  itself is immune to both of these first-item hazards: a line
  beginning \`::\` has
  no key segment before the separator, so it never matches
  \`<pair-line>\`'s grammar and is read as this Array's first item
  (§ 5.0.1 rule 7) without needing the root-wrap of § 5.9.3, and its
  content begins only after the literal \`:: \` prefix, never at byte
  offset 0.
- **Empty Object item:** \`{}\` on its own line.
- **Empty Array item:** \`[]\` on its own line.
- **Non-empty Object item:** \`{\` opening line, body lines at
  indent + 1, \`}\` closing line.
- **Non-empty Array item:** \`[\` opening line, body lines at
  indent + 1, \`]\` closing line.
- **Multi-line string item:** verbatim opener line \`((\` at the
  current indent, body lines emitted at indent 0 (because verbatim
  form preserves bytes exactly — any leading whitespace would be
  part of the String value), \`))\` closing line at the current
  indent. (Rationale: § 5.6 specifies verbatim joins content
  lines byte-for-byte. Adding indentation to body lines would
  inject whitespace code points into the parsed value.) Subject
  to § 5.9.7's stripped-form fallback when a body segment trims
  to exactly \`))\`.

`,
  ru: `
- **Голый скалярный элемент:** \`<bytes>\` на своей строке на
  текущем отступе — когда тело удовлетворяет тем же условиям,
  что и форма \`key: <bytes>\` § 5.9.5 (включая: не начинается с
  \`{\` или \`[\`; не равно в точности \`(\` или \`((\`), и — поскольку
  у строки-элемента нет префикса \`key: \`, так что вся строка и
  есть тело — дополнительно не равно в точности \`}\` или \`]\`, не
  начинается с двухбайтовой последовательности \`::\`, и не
  начинается с двухбайтовой последовательности \`##\`.
  Строка, состоящая ровно из \`}\` или \`]\`, безусловно
  читается правилами диспетчеризации § 5.1 как закрытие самого
  внутреннего открытого Object/Array (порождая \`UnbalancedBracket\`,
  § 6.1, когда самый внутренний открытый составной элемент на
  самом деле Array/Object); тело, начинающееся с двухбайтовой
  последовательности \`::\`, совпадает с raw-маркерной формой
  \`<item-literal>\` (§ 4) — поглощая всё с этой точки как тело
  самого raw-маркера, по \`<sep-end>\` — а не читается как буквальное
  содержимое, лишь начинающееся с этих двух байт (это исключает
  не только тело, равное \`::\` в точности, но и любое тело, с него
  начинающееся, например \`:: x\` или \`::x\`: оба перехватываются
  raw-маркерной грамматикой — первое как raw-маркерный элемент с
  телом \`x\`, второе как \`MissingSeparatorSpace\` — так что ни одно
  из них никогда не выживет как голое содержимое); тело, начинающееся с
  \`##\`, безусловно читается правилом 2 из § 5.1 как комментарий
  (§ 3.4), молча отбрасывая всю строку вместо ошибки. Когда элемент
  является **первым элементом корневого Array** (§ 5.9.3), голая
  форма дополнительно не используется, если тело само удовлетворяло
  бы фазе 1 теста «кандидат в пары» правила 6 из § 5.0.1 — первому
  неэкранированному разделителю \`:\` или \`::\` (по правилу сканирования
  разделителя § 4) с непустым сырым префиксом перед ним, где
  для обычного \`:\` разделитель удовлетворяет \`<sep-end>\`; префикс
  не обязан быть грамматически валидным ключом на этой стадии —
  ровно как этого не требует само правило 6 (первый элемент вроде
  \`a,b: 1\` — кандидат в пары здесь по той же причине, по которой он
  им является для детекции корня). Независимо от теста «кандидат в
  пары», голая форма также не используется — вне зависимости от
  того, применим ли этот тест, — когда элемент является первым
  элементом корневого Array, а тело начинается с U+FEFF (§ 5.9.12):
  голая форма разместила бы сырую 3-байтовую UTF-8-кодировку U+FEFF
  на байтовом смещении 0 документа, которую § 3.1 требует от
  conforming-читателя снимать как метаданный маркер порядка байтов,
  незаметно теряя кодовую точку при повторном парсинге. Только
  первый элемент корневого Array подвержен
  детекции корня по § 5.0.1; любая другая позиция элемента
  диспетчеризуется напрямую как строка-элемент массива независимо
  от своей формы (§ 5.1 правила 7–8), так что ни одно из этих
  исключений там не применяется.
- **Raw-маркерный элемент:** \`:: <bytes>\` — когда тело иначе было
  бы переинтерпретировано по § 5.2 как число, ключевое слово,
  inline-составное, опенер многострочной строки (тело в точности
  \`(\` или \`((\`), либо (через shortcut'ы § 5.7) как пустая String,
  либо иначе столкнулось бы со структурным токеном на уровне
  строки (тело в точности \`}\` или \`]\`, либо начинающееся
  с \`##\` или с двухбайтовой последовательности \`::\`), либо (когда элемент — первый элемент корневого Array)
  иначе удовлетворяло бы фазе 1 теста «кандидат в пары» правила 6
  из § 5.0.1, как описано выше, либо (также только для первого
  элемента корневого Array) начинается с U+FEFF (§ 5.9.12).
  Сама raw-маркерная форма невосприимчива к обеим этим угрозам
  первого элемента: строка, начинающаяся с \`::\`, не имеет сегмента
  ключа перед разделителем, поэтому никогда не совпадает с
  грамматикой \`<pair-line>\` и читается как первый элемент этого
  Array (§ 5.0.1 правило 7) без необходимости в обёртке корня из
  § 5.9.3, а её содержимое начинается только после литерального
  префикса \`:: \`, никогда на байтовом смещении 0.
- **Пустой Object элемент:** \`{}\` на своей строке.
- **Пустой Array элемент:** \`[]\` на своей строке.
- **Непустой Object элемент:** строка \`{\`, тело на отступе + 1,
  строка \`}\`.
- **Непустой Array элемент:** строка \`[\`, тело на отступе + 1,
  строка \`]\`.
- **Многострочный String элемент:** строка опенера \`((\` на
  текущем отступе, строки тела на отступе 0 (без ведущих
  пробелов — verbatim сохраняет байты в точности; любая
  индентация была бы инжектирована в значение), строка закрытия
  \`))\` на текущем отступе. Подчиняется откату к stripped-форме из
  § 5.9.7, когда сегмент тела обрезается в точности до \`))\`.

`,
  zh: `
- **裸标量项:** \`<bytes>\` 在当前缩进的自身行上 —— 当体满足
  § 5.9.5 中 \`key: <bytes>\` 形式的相同条件(包括:不以 \`{\` 或
  \`[\` 开头;不恰好等于 \`(\` 或 \`((\`),并且 —— 由于项行没有
  \`key: \` 前缀,整行即为体 —— 另外还不恰好等于 \`}\` 或 \`]\`,不以
  两字节序列 \`::\` 开头,也不以两字节序列 \`##\` 开头。恰好为 \`}\` 或 \`]\` 的行会被
  § 5.1 的逐行分发规则无条件读作关闭最内层已开启的
  Object/Array(当最内层已开启的复合值实际上是 Array/Object
  时,产生 \`UnbalancedBracket\`,§ 6.1);以两字节序列 \`::\` 开头的体
  会匹配
  \`<item-literal>\`(§ 4)的原始标记形式 —— 从该处起把其余内容
  全部吸收为原始标记自身的体(依据 \`<sep-end>\`)—— 而不会被读作
  恰好以这两个字节开头的字面内容(这不仅排除恰好等于 \`::\` 的体,
  也排除任何以它开头的体,例如 \`:: x\` 或 \`::x\`:二者都会被原始
  标记语法捕获 —— 前者成为体为 \`x\` 的原始标记项,后者成为
  \`MissingSeparatorSpace\`——因此二者都不可能以裸内容的形式存活);
  以 \`##\` 开头的体会被 § 5.1 规则 2 无条件读作注释
  (§ 3.4),悄悄丢弃整行而非报错。当该项是**根 Array 的第一个
项**(§ 5.9.3)时,若裸体本身会满足 § 5.0.1 规则 6 第一阶段的
「pair 候选」测试 —— 即存在一个首个未转义的 \`:\` 或 \`::\` 分隔符
(依 § 4 的分隔符扫描规则),其前有非空的原始前缀,其中普通 \`:\`
分隔符由 \`<sep-end>\` 满足 —— 则额外不使用裸形式;该阶段并不要求
前缀是语法上有效的键,规则 6 本身对根检测也是如此要求(例如
\`a,b: 1\` 这样的首项在此处是 pair 候选,原因与它在根检测中是 pair
候选相同)。独立于 pair 候选测试 —— 无论该测试是否适用 —— 当该项是
根 Array 的第一个项且体以 U+FEFF 开头(§ 5.9.12)时,裸形式同样不
使用:裸形式会把 U+FEFF 的原始 3 字节 UTF-8 编码放在文档的字节
偏移 0 处,而 § 3.1 要求 conforming 读取器将其作为元数据字节顺序
标记剥离,导致在重解析时悄悄丢失该码点。只有根
Array 的第一个项会经过 § 5.0.1 的根类型检测;其余任何位置的项
都直接按数组项行分发,与其形状无关(§ 5.1 规则 7–8),因此这些排除
条件在那里都不适用。
- **原始标记项:** \`:: <bytes>\` —— 当体本应被 § 5.2 重解释为数字、
  关键词、inline 复合值、多行字符串开启符(体恰好为 \`(\` 或
  \`((\`),或(通过 § 5.7 的 shortcut)空 String,或本会与行级别的
  结构性 token 冲突(体恰好为 \`}\` 或 \`]\`,或以 \`##\` 或两字节
  序列 \`::\` 开头),
  或(当该项是根 Array 的第一个项时)本应如上所述满足 § 5.0.1
  规则 6 第一阶段的「pair 候选」测试,或(同样仅当该项是根 Array
  的第一个项时)以 U+FEFF(§ 5.9.12)开头。原始标记形式本身对
  这两种首项风险均免疫:以 \`::\` 开头
  的行在分隔符前没有键段,因此永远不会匹配 \`<pair-line>\` 的语法,
  而是被读作该 Array 的第一个项(§ 5.0.1 规则 7),无需 § 5.9.3
  的根包裹,且其内容仅在字面前缀 \`:: \` 之后开始,绝不会在字节
  偏移 0 处。
- **空 Object 项:** \`{}\` 在自身行上。
- **空 Array 项:** \`[]\` 在自身行上。
- **非空 Object 项:** \`{\` 开启行,体行在缩进 + 1,\`}\` 关闭行。
- **非空 Array 项:** \`[\` 开启行,体行在缩进 + 1,\`]\` 关闭行。
- **多行字符串项:** verbatim 开启行 \`((\` 在当前缩进,体行在
  缩进 0(无前导空白 —— verbatim 精确保留字节;任何缩进会被
  注入值),\`))\` 关闭行在当前缩进。当体段修剪后恰为 \`))\` 时,
  遵循 § 5.9.7 的 stripped 形式回退。

`,
};
