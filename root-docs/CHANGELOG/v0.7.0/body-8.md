>>>>> lang=en
- **`\uXXXX` escape (new § 3.7.1)** — exactly four hex digits, surrogate
  pairs for code points above the Basic Multilingual Plane, lone
  surrogates rejected as `BadEscapeSequence`. Recognised wherever the
  existing ten escapes are recognised (inline scalars and keys); not
  processed in multi-line scalars, multi-line string content, or
  comments. Purely additive to the escape table — no existing escape
  sequence's meaning changes.
- **Appendix D — migration guide 0.6.x → 0.7.0.**
- **`unrepresentable/` conformance category (spec#4) — reason codes
  for non-representable Values are now normative (§ 5.9.0), and
  `§ 8.2` requires a writer-conforming implementation to reject each
  `versions/0.7/tests/unrepresentable/` fixture's Value with the
  named reason code.** The three programmatic-only reason codes
  `ScalarRoot`, `EmptyKeyName`, and `NonFiniteFloat` have fixtures in this
  category. `NonFiniteFloat` uses the three fixtures
  `versions/0.7/tests/unrepresentable/nan.json`,
  `versions/0.7/tests/unrepresentable/negative_infinity.json`, and
  `versions/0.7/tests/unrepresentable/positive_infinity.json`; each uses
  a contextual `{"$float": ...}` sentinel in this fixture encoding only,
  since JSON has no portable NaN/Infinity literal. The sentinel does not
  reserve `$float` as a parser Object key. The API shape a
  writer uses to report the rejection is
  implementation-defined; only the code names are normative. README
  (en/ru/zh) documents the new category and the existing `valid/` /
  `invalid/` ones in the same place, and states runners MUST walk
  every category present rather than silently skip an unrecognised
  one. Does not close rust#5 or rust#12 — those need corresponding
  work in the `rust` core and the six language bindings, tracked
  separately.
- **Quoted keys (§ 5.3.3)** — a key segment MAY be written `"…"`,
  `'…'`, or `` `…` `` instead of bare; inside the delimiters, `.`,
  `:`, `,`, `{`, `}`, `[`, `]`, and the two other quote characters are
  ordinary content needing no escape, and content is never trimmed.
  Three new named escapes, `\"` / `\'` / `` \` `` (§ 3.7), let a
  segment's own delimiter appear literally inside it — the escape
  table grows from eleven entries to fourteen. These same three
  escapes are also recognised inside inline scalar **values**, not
  only keys — `\"` / `\'` / `` \` `` now decode to a literal quote
  byte there too (previously each was `BadEscapeSequence` in every
  context, values included); a quote character still has no
  structural role in a value, so it is never a delimiter and is never
  stripped, escaped or not. Adds a `<quoted-segment>` production to
  the grammar and narrows the existing `<bare-segment>` production (a
  bare segment's first token now excludes an unescaped leading quote
  character) — not purely additive; the one behavior change this
  narrowing introduces — a key or segment already beginning with a
  quote character — is a separate Breaking entry above, not covered
  by this bullet. New error category `UnterminatedQuotedKey` (§ 6.16)
  is reported when a quote
  opens a key segment with no matching closer before end-of-line on a
  line already known to be a pair line; `InvalidKey` (§ 6.4) and
  `EmptyKey` (§ 6.5) each gain one new triggering case.
- **`parseable-unrepresentable/` conformance category (0.7+)** — parser-
  produced Values that a conforming writer MUST reject now have paired
  `<name>.ktav` / `<name>.json` fixtures and four normative String reason
  codes: `CRByte`, `BothFormsRequired`, `TrailingWhitespaceCollision`,
  and `LeadingWhitespaceCollision`. This category is distinct from the
  programmatic-only `unrepresentable/` category and has no canonical-output
  files.
- **Corpus and section inventory locks (0.7+)** —
  `scripts/locks/corpus-inventory.0.7.lock.json` locks every corpus path and
  digest, while `scripts/locks/section-inventory.0.7.lock.json` locks the
  ordered content-unit manifest; the builder and corpus validator reject
  additions, deletions, drift, and order changes outside an intentional
  lock update.
- **`versions/0.7/content/README.source.js` is the single README source
  object** for the English, Russian, and Chinese content READMEs. The
  builder statically validates and decodes it, then byte-compares all three
  generated files; the per-section `content/` units are likewise the source
  of truth for the generated specification files.

>>>>> lang=ru
- **Escape-последовательность `\uXXXX` (новый § 3.7.1)** — ровно четыре
  hex-цифры, суррогатные пары для кодовых точек выше Basic Multilingual
  Plane, одинокие суррогаты отклоняются как `BadEscapeSequence`.
  Распознаётся везде, где распознаются уже существующие десять escape
  (inline-скаляры и ключи); не обрабатывается в многострочных скалярах,
  содержимом многострочных строк или комментариях. Чисто аддитивное
  дополнение таблицы escape — смысл ни одной существующей
  escape-последовательности не меняется.
- **Приложение D — гайд по миграции 0.6.x → 0.7.0.**
- **Категория соответствия `unrepresentable/` (spec#4) — коды причин
  для непредставимых Value теперь нормативны (§ 5.9.0), а § 8.2
  требует от writer-conforming реализации отклонять Value каждой
  фикстуры `versions/0.7/tests/unrepresentable/` с указанным кодом
  причины.** Три программно создаваемых кода причины — `ScalarRoot`,
  `EmptyKeyName` и `NonFiniteFloat` — представлены фикстурами в этой
  категории. Для `NonFiniteFloat` есть три
  фикстуры: `versions/0.7/tests/unrepresentable/nan.json`,
  `versions/0.7/tests/unrepresentable/negative_infinity.json` и
  `versions/0.7/tests/unrepresentable/positive_infinity.json`; каждая
  использует контекстный сентинел `{"$float": ...}` только в этой
  кодировке фикстуры, поскольку у JSON нет портируемого литерала
  NaN/Infinity. Сентинел не резервирует `$float` как имя ключа Object
  парсера. Форма API, которой writer сообщает об отказе, —
  implementation-defined, нормативны только имена кодов. README
  (en/ru/zh) документирует новую категорию рядом с уже
  существующими `valid/` / `invalid/` и заявляет, что runner'ы MUST
  обходить каждую присутствующую категорию, а не молча пропускать
  незнакомую. Не закрывает rust#5 и rust#12 — им нужна отдельная
  работа в ядре `rust` и шести биндингах, отслеживается отдельно.
- **Quoted keys (§ 5.3.3)** — сегмент ключа MAY быть записан как
  `"…"`, `'…'` или `` `…` `` вместо bare-формы; внутри разделителей
  `.`, `:`, `,`, `{`, `}`, `[`, `]` и два ДРУГИХ символа кавычки —
  обычное содержимое, не требующее экранирования, а содержимое
  никогда не обрезается. Три новых именованных escape, `\"` / `\'` /
  `` \` `` (§ 3.7), позволяют собственному разделителю сегмента
  встречаться в нём буквально — таблица escape вырастает с
  одиннадцати записей до четырнадцати. Эти же три escape также
  распознаются внутри inline-скалярных **значений**, а не только в
  ключах — `\"` / `\'` / `` \` `` теперь декодируются в буквальный
  байт кавычки и там тоже (раньше каждая была `BadEscapeSequence` в
  любом контексте, включая значения); символ кавычки по-прежнему не
  имеет структурной роли в значении — он никогда не является
  разделителем и никогда не обрезается, экранирован он или нет.
  Добавляет продукцию `<quoted-segment>` в грамматику и сужает
  существующую продукцию `<bare-segment>` (первый токен bare-сегмента
  теперь исключает неэкранированный ведущий символ кавычки) — это не
  чисто аддитивное изменение; единственное изменение поведения,
  вносимое этим сужением, — ключ или сегмент, уже начинающийся с
  символа кавычки, — вынесено отдельным пунктом выше (Breaking) и
  здесь не заявляется. Новая
  категория ошибок `UnterminatedQuotedKey` (§ 6.16) сообщается, когда
  кавычка открывает сегмент ключа без парного закрывающего до конца
  строки на строке, уже опознанной как pair line; `InvalidKey`
  (§ 6.4) и `EmptyKey` (§ 6.5) каждая получают по одному новому
  триггерящему случаю.
- **Категория соответствия `parseable-unrepresentable/` (0.7+)** —
  порождённые парсером Values, которые writer-conforming реализация MUST
  отклонять, теперь имеют пары `<name>.ktav` / `<name>.json` и четыре
  нормативных String-кода: `CRByte`, `BothFormsRequired`,
  `TrailingWhitespaceCollision` и `LeadingWhitespaceCollision`. Эта
  категория отличается от создаваемой программно `unrepresentable/` и
  не содержит canonical-output файлов.
- **Locks inventory корпуса и секций (0.7+)** —
  `scripts/locks/corpus-inventory.0.7.lock.json` фиксирует каждый путь и
  digest корпуса, а `scripts/locks/section-inventory.0.7.lock.json` —
  упорядоченный манифест content-юнитов; builder и валидатор корпуса
  отвергают добавления, удаления, drift и изменения порядка вне
  преднамеренного обновления lock.
- **`versions/0.7/content/README.source.js` — единый source object** для
  английского, русского и китайского README контента. Builder статически
  проверяет и декодирует его, затем сравнивает все три сгенерированных
  файла побайтно; per-section `content/` units так же являются источником
  истины сгенерированных файлов спецификации.

>>>>> lang=zh
- **`\uXXXX` escape(新增 § 3.7.1)** —— 恰好四位十六进制数字,基本
  多文种平面之外的码点使用代理对,孤立代理项被拒绝为
  `BadEscapeSequence`。在已有十个 escape 被识别之处(inline 标量与键)
  同样被识别;不在多行标量、多行字符串内容或注释中处理。对 escape 表
  纯属新增 —— 已有任何一个 escape 序列的含义均未改变。
- **附录 D —— 从 0.6.x 迁移到 0.7.0 的指南。**
- **`unrepresentable/` 一致性类别(spec#4)—— 不可表示 Value 的
  原因代码现已规范化(§ 5.9.0),§ 8.2 要求 writer-conforming 实现
  以指定原因代码拒绝 `versions/0.7/tests/unrepresentable/` 中每个
  fixture 的 Value。** 三个只能编程构造的原因码——`ScalarRoot`、
  `EmptyKeyName` 与 `NonFiniteFloat`——在此类别中都有 fixture。
  `NonFiniteFloat` 有三个 fixture:
  `versions/0.7/tests/unrepresentable/nan.json`、
  `versions/0.7/tests/unrepresentable/negative_infinity.json` 与
  `versions/0.7/tests/unrepresentable/positive_infinity.json`;每个都在
  unrepresentable fixture 的 JSON 编码中使用上下文限定的
  `{"$float": ...}` 哨兵,因为 JSON 没有可移植的 NaN/Infinity 字面量。
  该哨兵不会把 `$float` 保留为 parser Object 的键名。writer
  用以报告拒绝的 API 形式是 implementation-defined,规范性的只是
  代码名称。README(en/ru/zh)在既有 `valid/` / `invalid/` 旁记录了
  新类别,并要求 runner MUST 遍历每个存在的类别,而非静默跳过不
  认识的类别。不解决 rust#5 或 rust#12 —— 二者需要在 `rust` 核心
  与六个语言绑定中另行完成。
- **Quoted keys(§ 5.3.3)** —— 键段 MAY 写作 `"…"`、`'…'` 或
  `` `…` `` 以代替 bare 形式;在分隔符内部,`.`、`:`、`,`、`{`、
  `}`、`[`、`]` 以及另外两种引号字符均为普通内容,无需转义,且
  内容永不被修剪。三个新增的具名 escape,`\"` / `\'` / `` \` ``
  (§ 3.7),使得段自身的分隔符可以字面出现在段内 —— escape 表从
  十一项增至十四项。这三个 escape 同样在 inline 标量**值**中被识别,
  不仅限于键 —— `\"` / `\'` / `` \` `` 现在在值中也解码为字面引号
  字节(此前三者在任何上下文中——包括值——都是
  `BadEscapeSequence`);引号字符在值中仍无结构性作用,既不作为
  分隔符,也不会被剥离,无论是否转义。为语法新增
  `<quoted-segment>` 产生式,同时收窄了既有的 `<bare-segment>`
  产生式(bare 段的首个 token 现在排除未转义的引号字符开头)——
  并非纯属新增;此次收窄带来的唯一行为变化——已经以引号字符开头
  的键或段——已在上方单独的 Breaking 条目中说明,此处不再重复
  声称。新增错误类别 `UnterminatedQuotedKey`(§ 6.16),
  在已知为 pair line 的行上,当引号开启键段却在行末前没有匹配
  闭合符时报告;`InvalidKey`(§ 6.4)与 `EmptyKey`(§ 6.5)各自
  新增一种触发场景。
- **`parseable-unrepresentable/` 一致性类别(0.7 起)** —— parser 产生、但
  conforming writer MUST 拒绝的 Value 现在使用
  `<name>.ktav` / `<name>.json` 配对 fixture,并限定四个规范性 String
  原因码:`CRByte`、`BothFormsRequired`、`TrailingWhitespaceCollision`
  与 `LeadingWhitespaceCollision`。它区别于只能编程构造的
  `unrepresentable/`,不包含 canonical-output 文件。
- **语料库与节 inventory lock(0.7 起)** ——
  `scripts/locks/corpus-inventory.0.7.lock.json` 锁定每个语料路径及
  digest,而 `scripts/locks/section-inventory.0.7.lock.json` 锁定有序的
  content-unit manifest;builder 与语料校验器会拒绝未伴随有意 lock
  更新的新增、删除、漂移与顺序变化。
- **`versions/0.7/content/README.source.js` 是 README 的单一源对象**,
  为英文、俄文与中文 content README 提供 `{ en, ru, zh }`。Builder
  静态校验并解码它,再逐字节比较三个生成文件;各节 `content/` unit
  同样是生成规范文件的事实来源。

