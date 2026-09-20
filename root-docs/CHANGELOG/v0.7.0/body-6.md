>>>>> lang=en
- **§ 6.13 `BadEscapeSequence`** — extended to cover malformed `\uXXXX`
  forms (fewer than four hex digits) and lone surrogates, alongside the
  existing unrecognised-`\X` case.
- **§ 6.15 `InvalidUtf8` (new error category)** — documents that are
  not valid UTF-8 (§ 3.1, § 9.3) now have an explicit § 6 category
  name. § 3.1 already required rejecting them; this closes the gap
  where § 6 had no matching category for that rejection. The check
  happens before any line-oriented or grammar-level processing, and
  the error span SHOULD point at the byte offset of the first invalid
  sequence.
- **§ 5.9.10's key re-escape rule** now enumerates every code point
  `<key-char>` excludes (not just `\`/`.`/`:`) and requires `\uXXXX` for
  edge whitespace and for structural bytes with no named form (`(`, `)`,
  DEL, control bytes). Keys containing `(`, `)`, DEL, or a control code
  point are emittable in canonical form for the first time.
  Also newly documented (a pre-existing hazard, not new
  behaviour): a bare `\u0023` escape is accepted input for a key beginning
  with `##`, but the canonical writer MUST quote that key, for example
  `"##a:b": 1`, so the canonical line is not silently read as a comment.
- **`<key-char>` (§ 4)** now admits raw VT (`0x0B`) and FF (`0x0C`) as
  literal key content, matching the § 3.3 widening. Non-breaking — only
  accepts documents previously rejected as `InvalidKey`.
- **§ 5.9 / § 8.3** now define the round-trip guarantee over
  *representable* Values only. Strings containing a `CR` byte or one
  of the pathological multi-line stripped-form collisions are
  explicitly excluded from the representable domain by § 5.9.0. A
  writer-conforming implementation MUST reject a non-representable
  Value with an error rather than serialise it; previously § 5.9.7
  separately allowed any implementation-chosen or lossy encoding for
  the same Values, which was incompatible with § 5.9's byte-
  determinism requirement.
- **§ 5.9.6** — a root Array's first item, if its bare rendering would
  itself be recognised by § 5.0.1 rule 6 as a pair line (e.g.
  `host: localhost`, or a bare `a:`), now MUST use the raw-marker
  (`::`) form. Previously the canonical writer could produce such an
  item bare, and the resulting document's root re-parsed as an Object
  instead of the original Array — a round-trip failure specific to an
  Array root's first item (every other item position is unaffected).
- **§ 5.9.8 — Float zero canonicalisation clarified.** The notation
  threshold now reads `0 < abs < 1e-2` (was `abs < 1e-2`), which taken
  literally would have demanded scientific notation for zero. The
  canonical form of zero is `0.0` / `-0.0` — decimal, never scientific,
  sign preserved (unlike an Integer's `-0` → `0`). This matches the
  Rust reference core's existing behaviour; only the normative text
  changes. New fixtures `float/positive_zero` and `float/negative_zero`
  lock it in.
- **§ 8.1 (with § 5's Integer definition) — ordinary fixture numeric
  equivalence is interpreted, or comparison-coerced, in the tested
  implementation's declared Integer or Float domain, not against a
  universal minimum-domain Value.** Thus an ordinary Float token such
  as `3.14` does not require a wider decimal implementation to
  manufacture binary64's rounded value. A manifest exemption applies
  only when the source Ktav literal, interpreted in the tested
  implementation's declared domain, diverges in value or kind from the
  minimum-domain oracle token because it crosses that leaf's named
  boundary. If no such divergence occurs, the listed leaf MUST match
  normally; the exemption never extends to another leaf.
- **§ 8.2 (with § 5.9.5) — the writer-conforming byte-exact fixture
  requirement follows the same domain rule.** Every ordinary,
  non-exempt field MUST match its JSON oracle in the tested
  implementation's declared domain; an ordinary numeric field is not
  required to hold a universal minimum-domain Value. A listed boundary
  leaf MAY differ only when the source Ktav literal crosses that leaf's
  named boundary in the tested domain and the implementation supports a
  wider domain along that boundary class. Every other field MUST match
  normally, and its contribution MUST remain byte-exactly equal to the
  fixture's `canonical.ktav`. This corrects the former § 8.2 reading
  under which an arbitrary-precision implementation failed on
  `i64_overflow_to_string` merely because it retained the body as an
  Integer and wrote it bare.
- **§ 5.9.10 — the canonical writer now prefers quoted form when
  escaping a structural byte.** The writer prefers a quoted key
  segment (delimiter `"`) over bare-with-escape whenever escaping a
  structural byte (`.` `:` `,` `{` `}` `[` `]`), `(` / `)`, a
  `##`-prefix, or edge whitespace would otherwise be needed (escaping
  only a backslash, LF, CR, a control byte, or DEL does not switch the
  form, since quoting does not remove that escape). This changes the
  canonical bytes of every key previously requiring a `\.` / `\:` /
  bracket / comma / paren escape, or a `##`-prefix escape — e.g.
  `a\.b: 1` now canonicalises to `"a.b": 1`, not `a\.b: 1`; existing
  `valid/key_escaping/*.canonical.ktav` fixtures update accordingly
  (tracked separately from this text change).

>>>>> lang=ru
- **§ 6.13 `BadEscapeSequence`** — расширена для покрытия некорректных
  форм `\uXXXX` (менее четырёх hex-цифр) и одиноких суррогатов, наряду
  с существующим случаем нераспознанного `\X`.
- **§ 6.15 `InvalidUtf8` (новая категория ошибок)** — документы, не
  являющиеся корректным UTF-8 (§ 3.1, § 9.3), теперь имеют явное
  имя категории в § 6. § 3.1 уже требовал отвергать их; это
  закрывает пробел, при котором у этого отказа в § 6 не было
  соответствующей категории. Проверка выполняется до какой-либо
  построчной или грамматической обработки; диапазон ошибки SHOULD
  указывать на байтовое смещение первой некорректной
  последовательности.
- **Правило ре-экранирования ключей в § 5.9.10** теперь перечисляет
  каждую кодовую точку, исключаемую `<key-char>` (не только `\`/`.`/`:`),
  и требует `\uXXXX` для пограничного пробела и структурных байтов без
  именованной формы (`(`, `)`, DEL, управляющие байты). Ключи,
  содержащие `(`, `)`, DEL или управляющую кодовую точку, впервые
  становятся выводимыми в канонической форме.
  Также впервые задокументировано (существовавшая ранее
  опасность, не новое поведение): bare-форма `\u0023` принимается как
  ввод для ключа, начинающегося с `##`, но canonical writer MUST
  использовать кавычки, например `"##a:b": 1`, чтобы каноническая
  строка не была молча прочитана как комментарий.
- **`<key-char>` (§ 4)** теперь допускает сырые VT (`0x0B`) и FF
  (`0x0C`) как буквальное содержимое ключа, в соответствии с
  расширением § 3.3. Не ломающее — принимает только документы, ранее
  отвергавшиеся как `InvalidKey`.
- **§ 5.9 / § 8.3** теперь определяют гарантию round-trip только для
  **представимых** (representable) Value. Строки с байтом `CR` или с
  одной из патологических коллизий stripped multi-line формы явно
  исключены § 5.9.0 из множества представимых и являются
  непредставимыми. Реализация-эмиттер MUST отклонять непредставимое
  Value с ошибкой, а не сериализовать его; ранее § 5.9.7 отдельно
  разрешал произвольную или lossy кодировку для тех же Value, что было
  несовместимо с требованием байт-детерминизма из § 5.9.
- **§ 5.9.6** — первый элемент корневого Array, если его голая
  форма сама была бы распознана правилом 6 из § 5.0.1 как
  строка-пара (например, `host: localhost` или голое `a:`), теперь
  MUST использовать raw-маркерную (`::`) форму. Ранее канонический
  эмиттер мог выдать такой элемент голым, и результирующий документ
  при повторном парсинге давал корень-Object вместо исходного
  Array — сбой round-trip, специфичный именно для первого элемента
  корневого Array (любая другая позиция элемента не затронута).
- **§ 5.9.8 — канонизация нуля Float уточнена.** Порог формы записи
  теперь читается как `0 < abs < 1e-2` (было `abs < 1e-2`), что при
  буквальном прочтении требовало бы научной записи для нуля.
  Каноническая форма нуля — `0.0` / `-0.0` — десятичная, никогда
  научная, со сохранением знака (в отличие от `-0` у Integer →
  `0`). Это соответствует существующему поведению эталонного
  Rust-ядра; меняется только нормативный текст. Новые фикстуры
  `float/positive_zero` и `float/negative_zero` фиксируют это.
- **§ 8.1 (вместе с определением Integer в § 5) — обычная числовая
  эквивалентность фикстур интерпретируется или приводится для
  сравнения в заявленном Integer- или Float-домене тестируемой
  реализации, а не относительно универсального Value минимального
  домена.** Поэтому обычный Float-токен вроде `3.14` не требует от
  реализации с более широким decimal-доменом искусственно
  воспроизводить округлённое значение binary64. Освобождение
  manifest применяется только когда исходный Ktav-литерал в заявленном
  домене тестируемой реализации расходится по значению или kind с
  токеном оракула минимального домена из-за пересечения названной
  границы этого листа. Если такого расхождения нет, перечисленный
  лист MUST совпадать обычным образом; освобождение никогда не
  распространяется на другой лист.
- **§ 8.2 (вместе с § 5.9.5) — байт-точное требование
  writer-conforming-реализации к фикстурам следует тому же правилу
  домена.** Каждое обычное, не освобождённое поле MUST совпадать с
  JSON-оракулом в заявленном домене тестируемой реализации; обычное
  числовое поле не обязано содержать универсальное Value минимального
  домена. Перечисленный граничный лист MAY отличаться только если
  исходный Ktav-литерал пересекает названную для него границу в
  тестируемом домене и реализация поддерживает более широкий домен
  вдоль этого класса границы. Каждое прочее поле MUST совпадать
  обычно, а его вклад MUST оставаться байт-точно равным
  `canonical.ktav` фикстуры. Это исправляет прежнее прочтение § 8.2,
  при котором реализация с произвольной точностью проваливала
  `i64_overflow_to_string` лишь потому, что сохраняла тело как Integer
  и записывала его голым.
- **§ 5.9.10 — канонический writer теперь предпочитает quoted-форму
  при экранировании структурного байта.** writer предпочитает
  quoted-сегмент ключа (разделитель `"`) форме bare-с-экранированием
  всякий раз, когда потребовалось бы экранировать структурный байт
  (`.` `:` `,` `{` `}` `[` `]`), `(` / `)`, `##`-префикс или
  граничный пробел (экранирование только обратного слеша, LF, CR,
  управляющего байта или DEL форму не переключает, поскольку quoting
  это экранирование не убирает). Это меняет канонические байты
  каждого ключа, ранее требовавшего экранирования `\.` / `\:` /
  скобки / запятой / круглой скобки, либо экранирования
  `##`-префикса — например, `a\.b: 1` теперь канонизируется в
  `"a.b": 1`, а не в `a\.b: 1`; существующие фикстуры
  `valid/key_escaping/*.canonical.ktav` обновляются соответственно
  (отслеживается отдельно от этого изменения текста).

>>>>> lang=zh
- **§ 6.13 `BadEscapeSequence`** —— 扩展以覆盖不合法的 `\uXXXX` 形式
  (少于四位十六进制数字)与孤立代理项,与既有的未识别 `\X` 情形并列。
- **§ 6.15 `InvalidUtf8`(新增错误类别)** —— 原始字节不是有效 UTF-8
  (§ 3.1、§ 9.3)的文档现在有了显式的 § 6 类别名称。§ 3.1 已要求
  拒绝此类文档;这补上了该拒绝在 § 6 中没有对应类别名称的缺口。
  该检查在任何面向行的或文法级处理之前进行;错误 span SHOULD 指向
  第一个无效序列的字节偏移。
- **§ 5.9.10 的键重新 escape 规则** 现在列举 `<key-char>` 排除的每个
  码点(不仅是 `\`/`.`/`:`),并要求对边界空白与没有命名形式的结构
  字节(`(`、`)`、DEL、控制字节)使用 `\uXXXX`。含有 `(`、`)`、DEL
  或控制码点的键首次可在规范形式中输出。
  另外首次记录(此前就存在的风险,并非新行为):以 `##` 开头的键接受
  `\u0023` bare 形式作为输入,但规范 writer MUST 使用引号,例如
  `"##a:b": 1`,从而不会让规范输出的该行被悄悄读作注释。
- **`<key-char>`(§ 4)** 现在允许原始 VT(`0x0B`)与 FF(`0x0C`)
  作为字面键内容,与 § 3.3 的扩展一致。非破坏性 —— 仅接受此前被
  拒绝为 `InvalidKey` 的文档。
- **§ 5.9 / § 8.3** 现在仅对**可表示**(representable)的 Value
  定义 round-trip 保证。含 `CR` 字节或 stripped 多行形式的某种
  病态碰撞的 String,已由 § 5.9.0 明确排除在可表示域之外,属于
  不可表示 Value。writer-conforming 实现 MUST 以错误拒绝不可
  表示的 Value,而不是将其序列化;此前 § 5.9.7 单独允许为同一类
  Value 输出任意或 lossy 编码,这与 § 5.9 的字节确定性要求不兼容。
- **§ 5.9.6** —— 根 Array 的第一个项,若其裸形式本身会被 § 5.0.1
  规则 6 识别为 pair line(例如 `host: localhost`,或裸
  `a:`),现在 MUST 使用原始标记(`::`)形式。此前规范 writer 可能
  以裸形式输出该项,导致结果文档重解析时根变为 Object 而非原本的
  Array —— 这一 round-trip 失败专属于根 Array 的第一个项(其余
  任何项位置不受影响)。
- **§ 5.9.8 —— Float 零的规范化得到澄清。** 表示形式阈值现在为
  `0 < abs < 1e-2`(原为 `abs < 1e-2`),按字面理解后者会要求零
  使用科学形式。零的规范形式为 `0.0` / `-0.0` —— 十进制,绝非
  科学形式,符号保留(不同于 Integer 的 `-0` → `0`)。这与 Rust
  参考核心的既有行为一致;改变的只是规范文本。新 fixture
  `float/positive_zero` 与 `float/negative_zero` 将其锁定。
- **§ 8.1(连同 § 5 的 Integer 定义)——普通 fixture 的数值等价性
  在被测实现声明的 Integer 或 Float 域中解释,或转换到该域后比较,
  而不是相对于一个普遍适用的最小域 Value。** 因此普通 Float token
  (例如 `3.14`)不要求更宽的 decimal 实现伪造 binary64 的舍入值。
  只有当源 Ktav 字面量在被测实现声明的域中解释后,因越过该叶指明的
  边界而在值或 kind 上不同于最小域 oracle token 时,manifest 豁免才
  适用。若没有这种差异,列出的叶 MUST 正常匹配;豁免绝不扩展到其他叶。
- **§ 8.2(连同 § 5.9.5)—— writer-conforming 的逐字节 fixture
  要求遵循同一数值域规则。** 每个普通且未豁免的字段 MUST 在被测
  实现声明的域中与 JSON oracle 匹配;普通数值字段不要求持有一个普遍
  适用的最小域 Value。列出的边界叶 MAY 不同,仅当源 Ktav 字面量在
  被测域中越过该叶命名的边界,且实现沿该边界类支持更宽域时才可如此。
  其他每个字段 MUST 正常匹配,其贡献 MUST 与 fixture 的
  `canonical.ktav` 保持字节精确相同。这修正了 § 8.2 的旧读法:该读法
  会仅因任意精度实现将 `i64_overflow_to_string` 的 body 保留为
  Integer 并以裸形式写出,就判定其不合规。
- **§ 5.9.10 —— 规范 writer 现在在需要转义结构字节时优先选择
  quoted 形式。** 每当需要转义结构字节(`.` `:` `,` `{` `}` `[`
  `]`)、`(` / `)`、`##` 前缀或边界空白时,writer 现在优先选择
  quoted 键段(分隔符 `"`)而非 bare-加转义(仅需转义反斜杠、LF、
  CR、控制字节或 DEL 时不切换形式,因为 quoting 并不能省去该
  转义)。这改变了此前需要转义 `\.` / `\:` / 括号 / 逗号 / 圆括号,
  或需要转义 `##` 前缀的每一个键的规范字节 —— 例如,`a\.b: 1`
  现在规范化为 `"a.b": 1`,而非 `a\.b: 1`;既有的
  `valid/key_escaping/*.canonical.ktav` fixture 相应更新
  (与此文本改动分开跟踪)。

