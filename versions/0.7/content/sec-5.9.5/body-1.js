export default {
  en: `
A pair separator is selected by the kind/content of its value. The writer
MUST test the following branches in order; exactly one branch applies:

- **Non-String scalar pair:** emit the key, the plain \`: \` separator with
  exactly one ASCII U+0020 SPACE, and the canonical scalar body. Null emits
  \`null\`; Bool emits \`true\` or \`false\`, using the exact § 5.2 keyword
  spellings; Integer and Float use the canonical bodies of § 5.9.8. This
  branch never uses the raw marker \`::\`.

- **\`key:\` (no body after the colon):** when the value is the
  empty String \`""\`.
- **\`key: <bytes>\` (plain separator + exactly one ASCII U+0020 SPACE +
  String body):**
  when the value is a non-empty bare String whose body (a)
  contains no \`LF\` and no \`CR\` byte, (b) has no leading or
  trailing whitespace (§ 3.3 — the fixed 25-code-point set, not
  ASCII-only), (c) contains no ASCII control byte
  (0x00–0x1F other than 0x09 \`TAB\`), (d) does not match the
  integer or float literal grammar of § 3.6 — regardless of
  whether its numeric value fits the implementation's own
  supported domain (§ 5) — and is not exactly \`null\`, \`true\`, or
  \`false\`, (e) does not
  start with \`{\` or \`[\` (which would cause § 5.2 to dispatch
  the body as an inline compound rather than a String), and
  (f) is not exactly \`()\`, \`(())\`, \`(\`, or \`((\` (the first two
  are § 5.7's empty-compound shortcuts, reinterpreted as the
  empty String rather than this literal body; the last two are
  a multi-line-string opener per § 4's \`<value-start>\` grammar,
  reinterpreted as opening a block rather than a one-byte or
  two-byte String — the same class of hazard as (e) above, and
  resolved the same way, via the raw marker below). Condition (d)
  is deliberately domain-independent: a String whose body merely
  *looks* like a number to a wider-domain reader — e.g.
  \`9223372036854775808\`, a String on a minimum (i64) domain but a
  valid Integer literal on a wider one — still needs the raw
  marker below, precisely so that a reader with a different
  numeric domain does not silently reclassify it (§ 5.2's own
  same-kind guarantee, § 5.2, is about domain-*consistent*
  classification; the canonical writer of a String must not
  depend on which domain happens to be doing the writing).
- **\`key:: <bytes>\` (raw-marker String pair):** when the bytes are a physically
  safe non-empty one-line String under § 5.9.7 — with no \`LF\` or \`CR\`,
  leading/trailing whitespace, or ASCII control byte other than \`TAB\` —
  that would otherwise be reinterpreted by § 5.2
  if emitted with plain \`:\` — either as matching the integer or
  float literal grammar of § 3.6 (regardless of whether the value
  fits the writer's own numeric domain), as exactly \`null\` /
  \`true\` / \`false\`, as an inline compound (a body starting
  with \`{\` or \`[\`), as a multi-line-string opener (a body of
  exactly \`(\` or \`((\`), as the empty String via § 5.7's shortcuts
  (a body of exactly \`()\` or \`(())\`), or any other non-String
  classification.
- **\`key: <multi-line>\`:** when the value is a String containing
  \`LF\`, leading/trailing whitespace, or any control byte other
  than \`LF\` / \`TAB\` (and not \`CR\`, which is not representable —
  see § 5.9.7).
- **\`key: <compound>\`:** when the value is a non-empty Object or
  Array (per § 5.9.4) or an empty \`{}\` / \`[]\`.

`,
  ru: `
Разделитель пары выбирается по типу/содержимому значения. Writer MUST
проверять следующие ветви по порядку; применяется ровно одна ветвь:

- **Пара с не-String скаляром:** вывести имя ключа, обычный разделитель
  \`: \` с ровно одним ASCII-пробелом U+0020 и каноническое тело скаляра.
  Null выводится как \`null\`; Bool — как \`true\` или \`false\`, с точным
  написанием ключевых слов § 5.2; Integer и Float используют канонические
  тела § 5.9.8. Эта ветвь никогда не использует raw-маркер \`::\`.

- **\`key:\` (без тела):** когда значение — пустая String \`""\`.
- **\`key: <bytes>\` (обычный разделитель + ровно один ASCII-пробел U+0020 + тело
  String):** когда значение — непустая обычная String, тело
  которой (a) не содержит \`LF\` и не содержит байта \`CR\`, (b) не
  имеет ведущих или хвостовых пробелов (§ 3.3 — фиксированный
  набор из 25 кодовых точек, не только ASCII), (c) не содержит
  ASCII управляющих байтов (0x00–0x1F кроме 0x09 \`TAB\`), (d) не
  совпадает с грамматикой integer- или float-литерала § 3.6 —
  независимо от того, помещается ли её числовое значение в
  поддерживаемый реализацией домен (§ 5), — и не равно в точности
  \`null\`, \`true\` или \`false\`, (e) не
  начинается с \`{\` или \`[\` (что заставило бы § 5.2 диспетчеризовать
  тело как inline-составное вместо String), и (f) не равно в
  точности \`()\`, \`(())\`, \`(\` или \`((\` (первые два — shortcut'ы
  § 5.7, переинтерпретируемые как пустая String, а не как этот
  буквальный текст; последние два — опенер многострочной строки
  по грамматике \`<value-start>\` § 4, переинтерпретируемый как
  открытие блока, а не как одно- или двухбайтовая String — тот
  же класс опасности, что и (e) выше, решаемый так же, через
  raw-маркер ниже). Условие (d) намеренно не зависит от домена:
  String, тело которой лишь *выглядит* числом для читателя с более
  широким доменом — например, \`9223372036854775808\`, String на
  минимальном (i64) домене, но валидный Integer-литерал на более
  широком, — всё равно требует raw-маркера ниже, именно чтобы
  читатель с другим числовым доменом не переклассифицировал её
  молча (гарантия одинакового kind из § 5.2 — про
  домен-*согласованную* классификацию; каноническая форма String
  не должна зависеть от того, какой именно домен её пишет).
- **\`key:: <bytes>\` (raw-маркер String-пары):** когда байты — физически
  безопасная по § 5.9.7 непустая однострочная String без \`LF\` или \`CR\`,
  ведущего/хвостового пробела и ASCII управляющих байтов, кроме \`TAB\`,
  которая иначе была бы переинтерпретирована
  по § 5.2 при выводе с обычным \`:\` — либо как совпадающая с
  грамматикой integer- или float-литерала § 3.6 (независимо от
  того, помещается ли значение в собственный числовой домен
  writer'а), либо как в точности \`null\` / \`true\` / \`false\`, либо
  как inline-составное (тело, начинающееся
  с \`{\` или \`[\`), либо как опенер многострочной строки (тело в
  точности \`(\` или \`((\`), либо как пустая String через shortcut'ы
  § 5.7 (тело в точности \`()\` или \`(())\`), либо любая иная
  не-String классификация.
- **\`key: <multi-line>\`:** когда значение — String, содержащая
  \`LF\`, ведущий/хвостовой пробел, или любой управляющий байт кроме
  \`LF\` / \`TAB\` (и не \`CR\`, которая не представима — см. § 5.9.7).
- **\`key: <compound>\`:** когда значение — непустой Object или Array
  (по § 5.9.4) или пустые \`{}\` / \`[]\`.

`,
  zh: `
对分隔符由值的类型/内容选择。Writer MUST 按以下顺序检查各分支;
恰好适用一个分支:

- **非 String 标量对:** 输出键、普通 \`: \` 分隔符、恰好一个 ASCII
  U+0020 空格以及规范标量体。Null 输出为 \`null\`; Bool 输出为
  \`true\` 或 \`false\`,使用 § 5.2 的精确关键词拼写; Integer 与 Float
  使用 § 5.9.8 的规范体。此分支绝不使用原始标记 \`::\`。

- **\`key:\`(冒号后无体)** 当值为空 String \`""\`。
- **\`key: <bytes>\`(常规 + 恰好一个 ASCII U+0020 空格 + String 体)** 当值是非空 String,
  其体 (a) 不含 \`LF\`,也不含 \`CR\` 字节,(b) 无前后空白(§ 3.3
  —— 固定的 25 码点集合,不仅是 ASCII),(c) 不含 ASCII 控制
  字节(0x00–0x1F 除 0x09 \`TAB\`),(d) 不匹配 § 3.6 的 integer
  或 float 字面量语法 —— 无论其数值是否落在实现自身支持的数值域
  内(§ 5)—— 且不恰好等于 \`null\`、\`true\` 或 \`false\`,
  (e) 不以 \`{\` 或 \`[\` 开头(否则 § 5.2 会将体派发为 inline 复合
  值而非 String),且 (f) 不恰好等于 \`()\`、\`(())\`、\`(\` 或 \`((\`
  (前两者是 § 5.7 的空复合值 shortcut,会被重新解释为空 String
  而非这段字面内容;后两者是 § 4 \`<value-start>\` 语法中的多行
  字符串开启符,会被重新解释为打开一个块而非一/二字节的 String
  —— 与上面 (e) 同类的风险,解法也相同:通过下面的原始标记)。
  条件 (d) 刻意与数值域无关:一个 String,其体仅仅对更宽域的
  读者*看起来*像数字 —— 例如 \`9223372036854775808\`,在最小
  (i64)域上是 String,但在更宽域上是合法的 Integer 字面量 ——
  仍然需要下面的原始标记,正是为了让持有不同数值域的读者不会
  悄悄地重新分类它(§ 5.2 自身的同 kind 保证针对的是域*内部*
  一致的分类;String 的规范形式不应取决于写出它的究竟是哪个域)。
- **\`key:: <bytes>\`(原始标记 String 对)** 当字节是 § 5.9.7 所定义的物理
  安全非空单行 String —— 不含 \`LF\` 或 \`CR\`、前后空白,也不含除 \`TAB\`
  外的 ASCII 控制字节 —— 且若以普通 \`:\` 输出会被 § 5.2 重解释 ——
  或作为匹配 § 3.6 integer /
  float 字面量语法(无论其值是否落在 writer 自身的数值域内),
  或恰好等于 \`null\` /
  \`true\` / \`false\`,或作为 inline 复合值(以 \`{\` 或 \`[\` 开头的
  体),或作为多行字符串开启符(体恰好为 \`(\` 或 \`((\`),或通过
  § 5.7 的 shortcut 作为空 String(体恰好为 \`()\` 或 \`(())\`),
  或任何其他非 String 分类。
- **\`key: <multi-line>\`** 当值是含 \`LF\`、前后空白,或除 \`LF\` /
  \`TAB\` 之外任意控制字节(而非 \`CR\`—— 它不可表示,见 § 5.9.7)
  的 String。
- **\`key: <compound>\`** 当值为非空 Object / Array(§ 5.9.4)或
  空 \`{}\` / \`[]\`。

`,
};
