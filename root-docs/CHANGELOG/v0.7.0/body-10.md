>>>>> lang=en
- **README "Version scheme"** — the cross-version parsing MUST now
  explicitly does not hold across a pre-1.0 breaking `MINOR` (the
  exception its preceding paragraph grants): an implementation
  targeting 0.6 is not required to parse 0.7.x documents identically.
  The previous wording contradicted the exception directly above it.
- **§ 4 grammar** — the `<header-line>` alternatives for `)` / `))`
  now carry a context-dependence note: they apply only while a
  multi-line string block is open (§ 5.6) and the trimmed line equals
  that block's own terminator; anywhere else a lone `)` / `))` line
  is ordinary text (§ 5.1, § 5.2, § 5.4; § 6.1), not a structural
  closer — matching § 6.1 and the `lone_paren_tokens` fixture.
- **§ 10.6** — a single canonical serialisation is defined for every
  **representable** Value (§ 5.9.0), not every Value outright.
- **Appendix A, 0.5.0** — removed the "bare `CR` is content, not a
  line terminator" bullet: the 0.5.0 spec's own § 3.2 states the
  opposite ("a `CR` byte never appears as a content byte at parse
  time"), so the bullet described a change that never happened.
- **§ 5.0.1 rule 6 — root-kind detection is now explicitly shape-based
  ("pair candidate").** The old wording ("a **pair line** under § 5.3")
  read as if the first line's key had to be fully grammatically valid
  before an Object root could be selected, contradicting the
  `InvalidKey` fixtures under `tests/invalid/invalid_key/` (e.g.
  `a,b: 1` as the entire document). Rule 6 now specifies a two-phase
  test: phase 1 is a purely lexical shape check (first unescaped `:` /
  `::` separator with a non-empty raw prefix, `<sep-end>` satisfied for
  a plain `:`); phase 2 is uniform § 5.3 / § 5.3.1 key validation,
  identical to any pair line inside an established Object (§ 5.1
  rule 8). Matching the reference parser, a glued plain-`:` first line
  (`a,b:1`) is not a pair candidate and falls to rule 7 (one-item
  Array), while a glued `::` line is a pair candidate and reports
  `MissingSeparatorSpace`.
- **§ 5.3 / § 5.3.1 — removed the unreachable `InvalidKey`-for-`##`
  claim.** § 5.1 rule 2 consumes any line whose trimmed form begins
  with `##` as a comment unconditionally, before pair-line processing,
  so a raw `##`-prefixed line can structurally never reach key
  validation. Both sections now state this and point to § 5.9.10's
  guidance: `\u0023` bare form is accepted input, but the canonical writer
  MUST quote the key, for example `"##a:b": 1`, to prevent the collision.
- **§ 5.3 / § 5.3.1 — error precedence made explicit:** for a
  dispatched pair line, checks run `MissingSeparator` (§ 6.6) →
  `EmptyKey` (§ 6.5, empty prefix) → `MissingSeparatorSpace` (§ 6.10)
  → key-segment validation; a key defect (e.g. `b,c:1` inside an
  established Object) therefore reports `MissingSeparatorSpace`, not
  `InvalidKey`, matching the reference parser.
- **§ 5.0.1 — a leading `[` / `{` pre-empts pair-candidate detection.**
  A first content line starting with `[` or `{` that matches none of
  rules 2–5 (no matching closer, not a lone opener) is diagnosed as
  an unterminated/malformed inline-compound attempt (§ 5.2 rules 8–9)
  before rule 6 is ever considered — confirmed against the reference
  parser, which reports `UnterminatedInlineCompound` for `[bad]: 1`,
  not `InvalidKey`. Only applies when the bracket/brace is the first
  non-whitespace code point of the trimmed line; elsewhere (`a{b: 1`)
  rule 6 proceeds normally and yields `InvalidKey`. Fixture
  `invalid_key/bracket_in_key` renamed to
  `invalid/inline/leading_bracket_before_separator` with its
  `expected_error` corrected to match.
- **§ 5.0.1 — the bracket-precedence sentence now reads "the first
  non-whitespace code point of the trimmed line"** (was "the line's
  first byte", which in isolation read as the raw, untrimmed line and
  gave the wrong answer for `  [bad]: 1` — leading whitespace before
  the bracket). The rule, like every rule in § 5.0.1, operates on the
  trimmed first content line; behaviour confirmed against the
  reference parser. New fixture
  `invalid/inline/leading_whitespace_bracket_before_separator` locks
  the leading-whitespace case in. The same correction applied to the
  RU and ZH translations of the paragraph.
- **§ 5.9.8 — restored to the RU and ZH translations the final
  sentence of the binary64 paragraph** ("implementations using
  arbitrary-precision decimal MAY produce different output only where
  their Value domain differs"), which both had dropped; EN unchanged.
- **README (en/ru/zh) — the Layout tree no longer lists a nonexistent
  `tests/README.md` and now shows `unrepresentable/` (0.7+); the
  bindings paragraph now states explicitly that the C ABI's function
  surface is unchanged since 0.1 and that bindings parse whatever
  format version the underlying Rust core supports (currently 0.6.4
  stable)**, instead of the ambiguous "Ktav 0.1 surface".
- **§ 5.9.0 — the representability predicate is split into the
  document-root check plus a new internal, recursive
  "node-representable" check.** The previous wording was a single
  flat conjunction of per-kind bullets; read literally, it made an
  ordinary child scalar (a String nested in an Object, say)
  non-representable, since as a Value in its own right it failed
  the very first bullet ("V is an Object or an Array"). Now only
  the outermost Value handed to a writer is subject to the
  root-kind constraint; "node-representability" recurses through
  Object pair values and Array items at any depth without
  re-imposing it. § 5.9.0 also now states a precedence rule for
  simultaneous violations: the document-root check is evaluated
  first, and when node-representability finds more than one
  violation among a Value's descendants an implementation MAY
  report any one of them (no traversal order is mandated; that
  belongs to the still-open structured-error contract, rust#12).
  The four `unrepresentable/` fixtures whose bare-String value
  tripped `ScalarRoot` and their intended String-specific code
  simultaneously (`cr_byte`, `both_forms_required`,
  `trailing_whitespace_collision`, `leading_whitespace_collision`)
  are rewrapped as `{"s": <string>}` so each now exercises exactly
  its named reason code.
- **§ 5.2 — the cross-implementation "same Value kind" `MUST` is now
  scoped to implementations sharing the same numeric domain.** The
  unconditional wording contradicted § 5 / § 8.1's own domain-widening
  allowance: an i64-only and a bignum-capable parser legitimately
  classify `9223372036854775808` differently (String vs. Integer), so
  both could simultaneously honour their own domain rules and violate
  the old blanket `MUST`.
- **§ 5 — the binary64 floor now specifies conversion semantics, not
  just range and precision.** Converting a decimal float literal to
  the minimum binary64 representation MUST use IEEE 754
  `roundTiesToEven`, and the minimum representation MUST support
  subnormal (gradual-underflow) values. Seven new fixtures cover the
  floor: `max_finite` and `min_positive_normal` (unambiguous at any
  supported domain), while `min_positive_subnormal` is a
  `float_precision` boundary-dependent fixture alongside four more
  boundary-dependent fixtures added to the new manifest —
  `just_above_max_finite_to_string` (finite in a wider decimal domain,
  overflows to String at binary64), `negative_underflow_to_negative_zero`
  and `half_min_subnormal_underflow_to_zero` (both finite in a wider
  domain, underflow to `±0.0` at binary64), and `decimal_rounding_tie`
  (`9007199254740993.0`, exactly halfway between two binary64 values;
  binary64 rounds to the even neighbour `9007199254740992.0`, a wider
  decimal domain keeps the literal exactly).
- **§ 5.9.0 — the "more than one violation" allowance now covers the
  current node and an Object's key, not only descendants.** The old
  wording ("among a Value's descendants") left a String satisfying two
  collision rules at once, or an Object with both an empty key and a
  separately non-representable child, technically uncovered, since a
  key is not itself a Value descendant.
- **`versions/0.7/tests/unrepresentable/nan.json`,
  `negative_infinity.json`, and `positive_infinity.json`** — the
  `NonFiniteFloat` reason has three fixtures because plain JSON cannot
  encode NaN or Infinity. Each uses a normative `{"$float": ...}`
  sentinel in the unrepresentable-fixture encoding only; it is contextual
  and does not reserve `$float` as a parser Object key. README documents
  the sentinel alongside the rest of the `unrepresentable/` schema.
- **§ 5.2 no longer conflates a general semantic rule with a fixture
  list.** The same-kind `MUST` (scoped to same numeric domain) is now
  stated as a rule about every document a parser might see; § 8.1 /
  § 8.2 separately name, for the shared conformance corpus only, which
  fixtures are known to probe such a boundary. Previously § 5.2 itself
  claimed the corpus's fixture list was the complete set of
  domain-dependent divergence in the *format*, which is false — an
  arbitrary out-of-domain body (e.g. `9223372036854775809`) crosses the
  same boundary without being a named fixture.
- **`numbers/float/decimal_rounding_tie.canonical.ktav` corrected from
  decimal to scientific notation** (`9007199254740992.0` →
  `9.007199254740992e15`): § 5.9.8 requires scientific notation for
  any nonzero Float with `abs >= 1e7`, which this value (~9×10^15)
  is far past. The wrong decimal form had been checked against
  `ktav::render::render()`, which does not apply § 5.9.8's notation
  threshold; `ktav::emit_canonical()` is the function that actually
  implements it, and is what a writer-conforming implementation must
  match. Re-verified all seven new Float fixtures, plus the
  pre-existing `notation_boundaries` / `exponent` fixtures, against
  `emit_canonical()` — this was the only mismatch.
- **README (en/ru/zh) — two numeric-model errors corrected.** Float
  overflow-to-non-finite and Integer out-of-i64-range both fall back
  to a String, but Float *underflow* does not: it rounds to a finite
  signed `0.0` and stays a Float, which the previous wording didn't
  distinguish. Separately, `1e2`'s canonical form is `100.0`, not
  `100` — a bare `100` would re-parse as an Integer, breaking the
  Float round-trip; § 5.9.8's decimal alternative always keeps the
  decimal point.
- **§ 5.9.0 — the `$float` sentinel is contextual to the
  unrepresentable-fixture JSON encoding**, not a reserved parser Object
  key name; ordinary parsed Objects may use `$float` as a key.
- **CHANGELOG — corrected stale NonFiniteFloat fixture references** to
  name the current `nan.json`, `negative_infinity.json`, and
  `positive_infinity.json` fixtures, and removed the claim that the reason
  had no fixture.
- **`boundary-fixtures.json` (`versions/0.7/tests/boundary-fixtures.json`,
  outside `valid/` so a runner enumerating `valid/**/*.json` never
  mistakes it for a fixture) gives the numeric-domain divergence
  § 8.1 / § 8.2 permit a machine-readable contract, letting a
  wider-numeric-domain implementation diverge from certain fixture
  oracles without failing conformance.** The manifest is leaf-level,
  not fixture-level: each entry names a `fixture`, a JSON Pointer
  `path` (RFC 6901) to one specific leaf inside it, and a
  `boundary_class` (`integer_range` / `float_range` /
  `float_underflow` / `float_precision`), so an implementation's
  exemption is scoped to the exact leaf and axis it actually supports
  a wider domain for — an implementation with a wider Integer domain
  but plain binary64 Float is exempt on `integer_range` leaves only,
  and vice versa. Leaf-level scoping means a fixture mixing
  boundary-dependent and ordinary fields is only partly exempt:
  `big_overflow_to_string`'s `big`/`bigger` fields (exceeding i64) are
  listed, but its `tiny` field (an ordinary `Integer(1)` in every
  domain) stays checked. The manifest also lists
  `numbers/float/min_positive_subnormal`'s leaf, whose exact input
  value an arbitrary-precision decimal domain keeps in full, where
  binary64 shortens it to `5e-324`. A wider-domain implementation is
  exempt from byte-matching a listed leaf, not bound to one specific
  alternative this corpus pins — its correctness there is governed by
  § 5 / § 5.9 directly. § 8.1 / § 8.2 reference this manifest, at the
  leaf level, instead of describing the exception in prose.
- **README — "passes the suite" is now stated as necessary but not
  sufficient for conformance.** With `boundary-fixtures.json` leaves
  now explicitly unverified by the shared corpus for a wider-domain
  implementation, README's unqualified "an implementation conforms if
  it passes every test" was no longer accurate — such an
  implementation additionally has to verify its own § 5 / § 5.9
  behaviour for the leaves this corpus exempts.
- **RU/ZH § 5.9.3 — restored the missing empty-first-item wrap case.**
  Both translations described only the non-empty-compound-opener wrap
  (§ 5.0.1 rules 4/5) and RU explicitly claimed wrapping was needed
  "only for a non-empty compound", omitting EN's equally-normative
  empty-compound case (rules 2/3, `{}` / `[]`). A writer built strictly
  from the RU or ZH text would emit an unwrapped Array root whose first
  item is an empty Object/Array, which re-parses with the wrong root
  kind — a real round-trip bug in the translated algorithm, not just a
  wording gap.
- **RU/ZH § 5.6 — restored the missing LIFO-pairing sentence** ("a
  multi-line string body MUST NOT cross another compound boundary: the
  opener and closer are unambiguously paired by the LIFO parser
  stack"), absent from both translations entirely.
- **RU/ZH § 5.8.4 — removed a fabricated "SHOULD stay below 64 levels"
  depth limit.** EN sets no normative depth limit and says only
  "SHOULD avoid pathologically deep nesting" — RU and ZH each invented
  a specific number not present anywhere in the authoritative EN text.

>>>>> lang=ru
- **§ 5.0.1 правило 6 — детекция корня теперь явно на основе формы
  («кандидат в pair»).** Старая формулировка («pair line по § 5.3»)
  читалась так, будто ключ первой строки должен быть полностью
  грамматически валиден для выбора корня Object, что противоречило
  фикстурам `InvalidKey` из `tests/invalid/invalid_key/` (например,
  `a,b: 1` как весь документ). Правило 6 теперь задаёт двухфазный
  тест: фаза 1 — чисто лексическая проверка формы (первый
  неэкранированный `:` / `::` с непустым сырым префиксом, `<sep-end>`
  удовлетворён для обычного `:`); фаза 2 — единообразная валидация
  ключа по § 5.3 / § 5.3.1, идентичная любой pair line внутри
  установленного Object (§ 5.1 правило 8). В соответствии с
  reference-парсером, склеенная первая строка с обычным `:`
  (`a,b:1`) не является кандидатом в pair и проваливается в правило 7
  (одноэлементный Array), а склеенная строка с `::` кандидатом
  является и даёт `MissingSeparatorSpace`.
- **§ 5.3 / § 5.3.1 — убрана недостижимая claim про `InvalidKey` для
  `##`.** Правило 2 из § 5.1 безусловно потребляет любую строку, чья
  обрезанная форма начинается с `##`, как комментарий, до обработки
  pair line, поэтому сырая строка с `##`-префиксом структурно никогда
  не может достичь валидации ключа. Оба раздела теперь констатируют
  это и указывают на правило § 5.9.10: bare-форма `\u0023` принимается
  как ввод, но canonical writer MUST заключить ключ в кавычки, например
  `"##a:b": 1`, чтобы предотвратить коллизию.
- **§ 5.3 / § 5.3.1 — приоритет ошибок сделан явным:** для
  диспетчеризованной pair line проверки идут в порядке
  `MissingSeparator` (§ 6.6) → `EmptyKey` (§ 6.5, пустой префикс) →
  `MissingSeparatorSpace` (§ 6.10) → валидация сегмента ключа; дефект
  ключа (например, `b,c:1` внутри установленного Object) поэтому даёт
  `MissingSeparatorSpace`, а не `InvalidKey`, в соответствии с
  reference-парсером.
- **§ 5.0.1 — ведущий `[` / `{` имеет приоритет над детекцией
  кандидата в pair.** Первая содержательная строка, начинающаяся с
  `[` или `{` и не подходящая ни под одно из правил 2–5 (нет
  закрывателя, не одиночный опенер), диагностируется как искажённая
  или незакрытая попытка inline-составного (§ 5.2 правила 8–9) ещё до
  рассмотрения правила 6 — подтверждено против reference-парсера,
  который даёт `UnterminatedInlineCompound` для `[bad]: 1`, а не
  `InvalidKey`. Применяется, только когда скобка/фигурная скобка —
  первая непробельная кодовая точка строки после trim; в другом месте
  (`a{b: 1`) правило 6 работает как обычно и даёт `InvalidKey`. Фикстура
  `invalid_key/bracket_in_key` переименована в
  `invalid/inline/leading_bracket_before_separator` с исправленным
  `expected_error`.
- **README «Схема версионирования»** — компатибилити-MUST теперь
  явно не распространяется на pre-1.0 ломающий `MINOR`-bump
  (исключение, которое предыдущий абзац как раз разрешает):
  реализация, ориентированная на 0.6, не обязана разбирать документы
  0.7.x идентично. Прежняя формулировка прямо противоречила
  исключению строкой выше.
- **§ 4 grammar** — альтернативы `<header-line>` для `)` / `))`
  теперь несут примечание о контекстной зависимости: они действуют,
  только пока открыт многострочный строковый блок (§ 5.6) и обрезанная
  строка совпадает с собственным терминатором этого блока; в любом
  другом месте одиночная строка `)` / `))` — обычный текст (§ 5.1,
  § 5.2, § 5.4; § 6.1), а не структурный closer — в соответствии с
  § 6.1 и фикстурой `lone_paren_tokens`.
- **§ 10.6** — единая каноническая сериализация определена для
  каждого **представимого** Value (§ 5.9.0), а не для любого Value
  безусловно.
- **Приложение A, 0.5.0** — убран bullet «голый `CR` — это данные, не
  терминатор строки»: собственный § 3.2 спеки 0.5.0 утверждает
  обратное («байт `CR` никогда не появляется как байт содержимого при
  парсинге»), то есть bullet описывал изменение, которого никогда не
  было.
- **§ 5.0.1 — уточнена формулировка приоритета: «первая непробельная
  кодовая точка строки после trim»** вместо «первый байт строки», что
  в отрыве от контекста читалось как первый байт сырой строки и давало
  неверный ответ для `  [bad]: 1` (пробелы перед скобкой). Правило,
  как и все правила § 5.0.1, работает с обрезанной первой
  содержательной строкой; поведение подтверждено против
  reference-парсера. Новая фикстура
  `invalid/inline/leading_whitespace_bracket_before_separator`
  фиксирует случай с ведущими пробелами. Та же правка внесена в
  перевод спецификации (spec.ru.md).
- **§ 5.9.8 — в RU- и ZH-переводах восстановлено последнее предложение
  абзаца про binary64** («реализации, использующие decimal произвольной
  точности, MAY давать иной вывод только там, где их домен Value
  отличается»), отсутствовавшее в обоих; английский оригинал не
  менялся.
- **README (en/ru/zh) — дерево Layout больше не содержит
  несуществующего `tests/README.md` и показывает `unrepresentable/`
  (0.7+); абзац о биндингах теперь явно говорит, что набор функций
  C ABI не менялся с 0.1, а биндинги разбирают ту версию формата,
  которую поддерживает ядро Rust (сейчас — стабильная 0.6.4)**,
  вместо двусмысленного «тот же Ktav интерфейс».
- **§ 5.9.0 — предикат представимости разделён на проверку корня
  документа и новую внутреннюю рекурсивную проверку «узловой
  представимости» (node-representable).** Прежняя формулировка была
  единой плоской конъюнкцией bullet'ов по видам; прочитанная
  буквально, она делала обычный дочерний scalar (скажем, String,
  вложенный в Object) непредставимым, поскольку как Value сам по
  себе он проваливал самый первый bullet («V — это Object или
  Array»). Теперь ограничение на вид корня применяется только к
  самому внешнему Value, передаваемому writer'у; «узловая
  представимость» (node-representability) рекурсивно проходит через
  значения pair объекта Object и элементы Array на любой глубине,
  не навязывая это ограничение повторно. § 5.9.0 теперь также
  задаёт правило приоритета для одновременных нарушений: проверка
  корня документа выполняется первой, а когда узловая представимость
  находит среди потомков Value более одного нарушения, реализация
  MAY сообщить о любом одном из них (порядок обхода не предписан;
  это относится к всё ещё открытому контракту структурированных
  ошибок, rust#12). Четыре фикстуры `unrepresentable/`, чьё
  bare-String значение одновременно срабатывало и на `ScalarRoot`,
  и на задуманный String-специфичный код (`cr_byte`,
  `both_forms_required`, `trailing_whitespace_collision`,
  `leading_whitespace_collision`), переобёрнуты в `{"s": <string>}`,
  чтобы каждая теперь проверяла ровно свой одноимённый код причины.
- **§ 5.2 — межреализационный `MUST` «тот же Value kind» теперь
  ограничен реализациями с одним и тем же числовым доменом.**
  Безусловная формулировка противоречила собственному разрешению
  § 5 / § 8.1 на расширение домена: парсер только-i64 и парсер с
  поддержкой bignum законно классифицируют `9223372036854775808`
  по-разному (String против Integer), так что оба могли
  одновременно соблюдать свои доменные правила и нарушать старый
  безусловный `MUST`.
- **§ 5 — минимум binary64 теперь задаёт семантику преобразования,
  а не только диапазон и точность.** Преобразование десятичного
  float-литерала в минимальное binary64-представление MUST
  использовать `roundTiesToEven` из IEEE 754, а минимальное
  представление MUST поддерживать субнормальные (gradual-underflow)
  значения. Семь новых фикстур покрывают этот минимум:
  `max_finite` и `min_positive_normal` (однозначные при любом
  поддерживаемом домене), тогда как `min_positive_subnormal` — также
  зависящая от границы (`float_precision`) фикстура, наряду с четырьмя
  зависящими от границы фикстурами, добавленными в новый манифест, —
  `just_above_max_finite_to_string` (конечный в более широком
  decimal-домене, переполняется в String на binary64),
  `negative_underflow_to_negative_zero` и
  `half_min_subnormal_underflow_to_zero` (оба конечны в более
  широком домене, underflow в `±0.0` на binary64) и
  `decimal_rounding_tie` (`9007199254740993.0`, ровно посередине
  между двумя значениями binary64; binary64 округляет к чётному
  соседу `9007199254740992.0`, более широкий decimal-домен
  сохраняет литерал в точности).
- **§ 5.9.0 — разрешение «более одного нарушения» теперь покрывает
  текущий узел и ключ пары Object, а не только потомков.** Старая
  формулировка («среди потомков Value») оставляла технически
  непокрытыми String, удовлетворяющий сразу двум правилам
  коллизий, или Object с одновременно пустым ключом и отдельно
  непредставимым потомком: ключ сам по себе не является
  потомком-Value.
- **`versions/0.7/tests/unrepresentable/nan.json`,
  `negative_infinity.json` и `positive_infinity.json`** — причина
  `NonFiniteFloat` имеет три фикстуры, поскольку обычный JSON не может
  кодировать NaN или Infinity. Каждая использует нормативный сентинел
  `{"$float": ...}` только в JSON-кодировке unrepresentable-фикстуры;
  это контекстный sentinel, не резервирующий `$float` как имя ключа
  Object у парсера. README документирует сентинел рядом с остальной
  схемой `unrepresentable/`.
- **§ 5.2 больше не смешивает общее семантическое правило со списком
  фикстур.** «Одинаковый kind» `MUST` (ограниченный одинаковым
  числовым доменом) теперь сформулирован как правило о любом
  документе, который parser может увидеть; § 8.1 / § 8.2 отдельно
  называют — только для общего conformance-корпуса — какие фикстуры
  заведомо проверяют такую границу. Ранее сам § 5.2 утверждал, что
  список фикстур корпуса — полный набор зависящих от домена
  расхождений *формата*, что неверно: произвольное тело вне домена
  (например, `9223372036854775809`) пересекает ту же границу, не
  будучи именованной фикстурой.
- **`numbers/float/decimal_rounding_tie.canonical.ktav` исправлен с
  decimal- на научную запись** (`9007199254740992.0` →
  `9.007199254740992e15`): § 5.9.8 требует научную запись для любого
  ненулевого Float с `abs >= 1e7`, а это значение (~9×10^15) далеко
  за порогом. Неверная decimal-форма проверялась против
  `ktav::render::render()`, которая не применяет порог нотации
  § 5.9.8; `ktav::emit_canonical()` — функция, которая его реально
  реализует и которой должна соответствовать writer-conforming
  реализация. Все семь новых Float-фикстур, а также существовавшие
  ранее фикстуры `notation_boundaries` / `exponent`, перепроверены
  против `emit_canonical()` — это было единственное расхождение.
- **README (en/ru/zh) — исправлены две ошибки числовой модели.**
  Переполнение Float в не-конечное значение и выход Integer за
  границы i64 оба откатываются к String, но underflow Float — нет:
  он округляется до конечного знакового `0.0` и остаётся Float — прежняя формулировка этого не различала. Отдельно: каноническая форма
  `1e2` — `100.0`, а не `100` — «голое» `100` разобралось бы заново
  как Integer, ломая round-trip Float; decimal-альтернатива § 5.9.8
  всегда сохраняет десятичную точку.
- **§ 5.9.0 — сентинел `$float` контекстен JSON-кодировке
  unrepresentable-фикстуры**, а не зарезервированное имя ключа Object
  у парсера; обычные разобранные Object могут использовать `$float` как
  ключ.
- **CHANGELOG — исправлены устаревшие ссылки на фикстуру NonFiniteFloat**:
  теперь названы текущие `nan.json`, `negative_infinity.json` и
  `positive_infinity.json`, а утверждение об отсутствии фикстуры удалено.
- **`boundary-fixtures.json` (`versions/0.7/tests/boundary-fixtures.json`,
  вне `valid/`, чтобы runner, перечисляющий `valid/**/*.json` как
  фикстуры, никогда не принял его за одну из них) даёт
  машинопроверяемый контракт для расхождения числовых доменов,
  которое разрешают § 8.1 / § 8.2, позволяя реализации с более широким
  числовым доменом расходиться с некоторыми фикстурными oracle без
  потери conformance.** Манифест составлен на уровне листьев, а не
  фикстур: каждая запись называет `fixture`, JSON-указатель `path`
  (RFC 6901) на конкретный лист внутри неё и `boundary_class`
  (`integer_range` / `float_range` / `float_underflow` /
  `float_precision`), так что освобождение реализации ограничено тем
  точным листом и той осью, для которых она действительно поддерживает
  более широкий домен, — реализация с более широким доменом Integer,
  но с обычным binary64 Float освобождена только на листьях
  `integer_range`, и наоборот. Освобождение на уровне листьев означает,
  что фикстура, смешивающая зависящие от домена и обычные поля,
  освобождена лишь частично: поля `big`/`bigger` в
  `big_overflow_to_string` (выходящие за пределы i64) перечислены,
  а его поле `tiny` (обычный `Integer(1)` в любом домене) остаётся
  проверяемым. Манифест также перечисляет лист
  `numbers/float/min_positive_subnormal`, чьё точное входное значение
  decimal-домен с произвольной точностью сохраняет полностью, тогда
  как binary64 сокращает его до `5e-324`. Реализация с более широким
  доменом освобождена от побайтового совпадения с перечисленным
  листом, а не привязана к одной конкретной альтернативе,
  зафиксированной этим корпусом, — её корректность там регулируется
  напрямую § 5 / § 5.9. § 8.1 / § 8.2 ссылаются на этот манифест, на
  уровне листьев, вместо описания исключения прозой.
- **README — «проходит набор тестов» теперь заявлено как необходимое,
  но недостаточное условие соответствия.** Поскольку листья
  `boundary-fixtures.json` теперь явно не проверяются общим корпусом
  для реализации с более широким доменом, безоговорочная фраза README
  «реализация соответствует, если проходит каждый тест» стала
  неточной — такая реализация дополнительно должна сама проверять
  своё поведение по § 5 / § 5.9 для листьев, которые этот корпус
  освобождает.
- **RU/ZH § 5.9.3 — восстановлен пропущенный случай обёртки при пустом
  первом элементе.** Оба перевода описывали только обёртку
  непустого-составного-опенера (правила 4/5 § 5.0.1), а RU явно
  утверждала, что обёртка нужна «только для непустого составного»,
  опуская одинаково нормативный случай пустого составного из EN
  (правила 2/3, `{}` / `[]`). writer, построенный строго по тексту
  RU или ZH, выдал бы корень Array без обёртки, чей первый элемент —
  пустой Object/Array, который при повторном разборе даёт неверный
  kind корня, — настоящий round-trip-баг в переведённом алгоритме, а
  не просто пробел в формулировке.
- **RU/ZH § 5.6 — восстановлено пропущенное предложение о LIFO-спаривании**
  («Тело многострочной строки MUST NOT пересекать границу другого
  составного значения: строка-опенер и строка-закрытие однозначно
  спариваются через LIFO-стек парсера.»), полностью отсутствовавшее
  в обоих переводах.
- **RU/ZH § 5.8.4 — удалена выдуманная норма о глубине «SHOULD
  оставаться ниже 64 уровней».** EN не устанавливает никакого
  нормативного предела глубины и говорит лишь «SHOULD избегать
  патологически глубокой вложенности» — RU и ZH каждая придумала
  конкретное число, которого нет нигде в авторитетном тексте EN.

>>>>> lang=zh
- **§ 5.0.1 规则 6 —— 根检测现在明确基于形状(「pair 候选」)。**
  旧措辞(「§ 5.3 下的 pair line」)读起来像是首行的键必须已经
  语法完全有效才能选出 Object 根,这与 `tests/invalid/invalid_key/`
  下的 `InvalidKey` fixture(例如整份文档就是 `a,b: 1`)相矛盾。
  规则 6 现在给出两阶段测试:阶段 1 是纯词法的形状检查(按 § 4
  分隔符扫描规则存在首个未 escape 的 `:` 或 `::`,其前有非空原始
  前缀,普通 `:` 满足 `<sep-end>`);阶段 2 是统一校验,与已建立
  Object 内任何 pair line 的校验(§ 5.1 规则 8)完全一致,按 § 5.3 /
  § 5.3.1 进行。与参考解析器一致:粘连的普通 `:` 首行(`a,b:1`)
  不是 pair 候选,落入规则 7(单项 Array);粘连的 `::` 行是 pair
  候选,报告 `MissingSeparatorSpace`。
- **§ 5.3 / § 5.3.1 —— 移除了针对裸 `##` 不可达的 `InvalidKey`
  声明。** § 5.1 规则 2 会无条件地把任何修剪后以 `##` 开头的行当作
  注释消费,发生在任何 pair line 处理之前,因此裸 `##` 前缀行在
  结构上永远无法到达键校验。两节现在都陈述了这一点,并指出
  § 5.9.10 的规则:`\u0023` bare 形式是可接受的输入,但规范 writer
  MUST 为该键使用引号,例如 `"##a:b": 1`,以防止该碰撞。
- **§ 5.3 / § 5.3.1 —— 错误优先级被明确化:** 对已分发的 pair
  line,检查顺序为 `MissingSeparator`(§ 6.6)→ 空前缀的
  `EmptyKey`(§ 6.5)→ `MissingSeparatorSpace`(§ 6.10)→ 键段校验;
  因此键缺陷(如既有 Object 内的 `b,c:1`)报告
  `MissingSeparatorSpace` 而非 `InvalidKey`,与参考解析器一致。
- **§ 5.0.1 —— 行首 `[` / `{` 优先于 pair 候选检测。** 若首条
  内容行以 `[` 或 `{` 开头,但不符合规则 2–5 中任何一条(无匹配
  闭合符,也非单独开启符),则诊断为格式错误或未闭合的 inline
  复合值尝试(§ 5.2 规则 8–9),该诊断先于规则 6 生效 —— 已针对
  参考解析器验证:`[bad]: 1` 报告 `UnterminatedInlineCompound`,
  而非 `InvalidKey`。仅当方括号/花括号是该行经 trim 后的首个非空白
  码点时适用;出现在行内其他位置时(如 `a{b: 1`)规则 6 照常生效,产生
  `InvalidKey`。fixture `invalid_key/bracket_in_key` 已重命名为
  `invalid/inline/leading_bracket_before_separator`,并修正了
  `expected_error`。
- **README「版本方案」**—— 跨版本兼容 MUST 现在明确不适用于
  pre-1.0 破坏性 `MINOR` 递进(即上一段刚刚允许的例外):面向 0.6
  的实现不需要以相同方式解析 0.7.x 文档。此前的措辞与上方的例外
  直接矛盾。
- **§ 4 语法** —— `<header-line>` 中 `)` / `))` 的分支现在带有
  上下文相关性说明:仅当多行字符串块处于打开状态(§ 5.6)且修剪后
  的行与该块自身的终止符一致时才成立;其他任何地方,单独一行
  `)` / `))` 都是普通文本(§ 5.1、§ 5.2、§ 5.4;§ 6.1),而非结构性
  闭合符 —— 与 § 6.1 及 `lone_paren_tokens` fixture 一致。
- **§ 10.6** —— 单一规范序列化的定义对象现在是每个**可表示**的
  Value(§ 5.9.0),而非无条件的每个 Value。
- **附录 A,0.5.0** —— 移除了「不紧跟 `LF` 的裸 `CR` 字节为内容,
  非行终止符」这一条:0.5.0 规范自身的 § 3.2 陈述的是相反的事实
  (「`CR` 字节在解析时绝不作为内容字节出现」),说明该条描述的是
  从未发生过的变更。
- **§ 5.0.1 —— 括号优先级措辞改为「该行经 trim 后的首个非空白码点」**,
  原先「该行第一个字节」孤立地读会被理解为原始行,对 `  [bad]: 1`
  (括号前有前导空白)给出错误结论。该规则与 § 5.0.1 的所有规则一样
  作用于 trim 后的首条内容行;行为已针对参考解析器验证。新增 fixture
  `invalid/inline/leading_whitespace_bracket_before_separator` 锁定
  前导空白情形。规范的 ZH 翻译(与 RU 翻译)同步修正。
- **§ 5.9.8 —— 补回 RU 与 ZH 翻译中 binary64 段落缺失的最后一句**
  (「使用任意精度 decimal 的实现 MAY 产生不同输出,但仅限于其
  Value 域有所不同之处」);英文原文未变。
- **README(en/ru/zh)—— Layout 树不再列出并不存在的 `tests/README.md`,
  并补上 `unrepresentable/`(0.7+);绑定段落改为明确陈述 C ABI 函数
  接口自 0.1 起未变,且绑定解析底层 Rust 核心所支持的格式版本(当前
  为稳定版 0.6.4)**,取代含混的「相同的 Ktav 接口」。
- **§ 5.9.0 —— 可表示性谓词被拆分为文档根检查与新增的内部递归
  「节点可表示」（node-representable）检查。** 旧措辞是一条单一的
  扁平合取,按字面阅读会使普通的子标量(例如嵌套在 Object 中的
  String)不可表示,因为它作为独立的 Value 无法通过第一条
  (「V 是 Object 或 Array」)。现在只有交给 writer 的最外层 Value
  才受根类型约束;「节点可表示性」以任意深度递归穿过 Object 的
  pair 值与 Array 元素,而不会重复施加该约束。§ 5.9.0 现在还规定
  了同时违规时的优先级规则:文档根检查最先求值,而当节点可表示性
  在 Value 的后代中发现多于一个违规时,实现 MAY 报告其中任意一个
  (不强制遍历顺序;这属于仍未定案的 structured-error 契约,
  rust#12)。四个 `unrepresentable/` fixture 的裸 String 值此前
  同时触发 `ScalarRoot` 和预期的 String 专属代码(`cr_byte`、
  `both_forms_required`、`trailing_whitespace_collision`、
  `leading_whitespace_collision`),现已重新包装为 `{"s": <string>}`,
  使每个 fixture 精确检验其同名的原因代码。
- **§ 5.2 —— 跨实现的「相同 Value kind」`MUST` 现在限定于共享同一
  数值域的实现。** 无条件措辞与 § 5 / § 8.1 自身的加宽域许可相
  矛盾:仅支持 i64 的解析器与支持 bignum 的解析器会合法地把
  `9223372036854775808` 分类为不同结果(String 对 Integer),二者
  可以同时遵守各自的域规则却又违反旧的笼统 `MUST`。
- **§ 5 —— binary64 下限现在规定转换语义,而不仅是范围与精度。**
  把 decimal 的 Float 字面量转换为最小 binary64 表示 MUST 采用
  IEEE 754 的 `roundTiesToEven`,且最小表示 MUST 支持次正规
  (gradual-underflow)值。七个新 fixture 覆盖此下限:`max_finite` 与
  `min_positive_normal`(在任何支持的域下都无歧义),而
  `min_positive_subnormal` 也是依赖边界的(`float_precision`)
  fixture,以及加入新清单的另外四个依赖边界的 fixture ——
  `just_above_max_finite_to_string`(在更宽 decimal 域内有限,在
  binary64 上溢为 String)、`negative_underflow_to_negative_zero`
  与 `half_min_subnormal_underflow_to_zero`(二者在更宽域内有限,
  在 binary64 下溢为 `±0.0`),以及 `decimal_rounding_tie`
  (`9007199254740993.0`,恰好位于两个 binary64 值的正中;binary64
  舍入到偶数邻居 `9007199254740992.0`,更宽的 decimal 域则精确
  保留该字面量)。
- **§ 5.9.0 —— 「多于一个违反」许可现在覆盖当前节点与 Object 的
  键,而不仅是后代。** 旧措辞(「在 Value 的后代中」)使得同时满足
  两条冲突规则的 String,或同时有空键与另一处不可表示子节点的
  Object 在技术上未被覆盖 —— 键本身并不是 Value 的后代。
- **`versions/0.7/tests/unrepresentable/nan.json`、
  `negative_infinity.json` 与 `positive_infinity.json`** ——
  `NonFiniteFloat` 原因有三个 fixture,因为 plain JSON 无法编码 NaN
  或 Infinity。每个 fixture 仅在 unrepresentable fixture 的 JSON 编码
  中使用规范性 `{"$float": ...}` 上下文哨兵;它不会把 `$float` 保留为
  parser Object 的键名。README 在 `unrepresentable/` 其余 schema 之旁
  记录了该哨兵。
- **§ 5.2 不再把一般语义规则与 fixture 清单混为一谈。**
  同 kind 的 `MUST`(限定于相同数值域)现在作为关于解析器可能见到的
  每一份文档的规则来陈述;§ 8.1 / § 8.2 则单独指名 —— 仅对共享一致性
  语料库而言 —— 哪些 fixture 已知会探测此类边界。此前 § 5.2 自身声称
  语料库的 fixture 清单就是*格式*中域相关分歧的完整集合,这是
  错误的 —— 任意越域的体(如 `9223372036854775809`)跨越同一边界却
  并非具名 fixture。
- **`numbers/float/decimal_rounding_tie.canonical.ktav` 从 decimal
  形式修正为科学形式**(`9007199254740992.0` →
  `9.007199254740992e15`):§ 5.9.8 要求任何 `abs >= 1e7` 的非零
  Float 使用科学形式,而该值(约 9×10^15)远超此界。错误的 decimal
  形式此前是对照 `ktav::render::render()` 检验的,该函数并不应用
  § 5.9.8 的记法阈值;`ktav::emit_canonical()` 才是真正实现该阈值的
  函数,也是 writer-conforming 实现必须匹配的对象。已针对
  `emit_canonical()` 重新验证全部七个新 Float fixture,以及既有的
  `notation_boundaries` / `exponent` fixture —— 这是唯一的不匹配。
- **README(en/ru/zh)—— 修正两处数值模型错误。** Float 溢出为
  非有限值与 Integer 超出 i64 范围都会回退为 String,但 Float *下溢*
  不会:它舍入为有限的带符号 `0.0` 并保持为 Float,此前的措辞没有
  区分这一点。另外,`1e2` 的规范形式是 `100.0` 而非 `100` —— 裸的
  `100` 会重解析为 Integer,破坏 Float 的 round-trip;§ 5.9.8 的
  decimal 替代形式始终保留小数点。
- **§ 5.9.0 —— `$float` 哨兵仅限于 unrepresentable fixture 的
  JSON 编码**,并不是 parser Object 的保留键名;普通解析出的 Object
  可以使用 `$float` 作为键。
- **CHANGELOG —— 修正过时的 NonFiniteFloat fixture 引用**:现在列出
  当前的 `nan.json`、`negative_infinity.json` 与 `positive_infinity.json`,
  并删除「没有 fixture」的说法。
- **`boundary-fixtures.json`(`versions/0.7/tests/boundary-fixtures.json`,
  位于 `valid/` 之外,使以 `valid/**/*.json` 枚举 fixture 的 runner
  永远不会把它误认为 fixture)为 § 8.1 / § 8.2 所许可的数值域偏差
  提供了可机读契约,使拥有更宽数值域的实现可以偏离某些 fixture
  oracle 而不失去 conformance。** 该清单是叶级而非 fixture 级:每个
  条目指名一个 `fixture`、一个指向其内部具体叶的 JSON 指针 `path`
  (RFC 6901),以及一个 `boundary_class`(`integer_range` /
  `float_range` / `float_underflow` / `float_precision`),因此实现的
  豁免被限定在它真正支持更宽域的那个确切叶与轴上 —— 一个拥有更宽
  Integer 域但只有普通 binary64 Float 的实现仅在 `integer_range` 叶上
  豁免,反之亦然。叶级豁免意味着,若某 fixture 同时混有依赖数值域与
  普通字段,也只有部分被豁免:`big_overflow_to_string` 的 `big`/
  `bigger` 字段(超出 i64)被列入清单,而其 `tiny` 字段(在每个域中
  都是普通的 `Integer(1)`)仍需被检查。该清单还列出了
  `numbers/float/min_positive_subnormal` 的叶 —— 任意精度 decimal 域
  会完整保留其精确输入值,而 binary64 会将其缩短为 `5e-324`。更宽域
  的实现豁免于逐字节匹配所列的叶,不受该语料库固定的某个特定替代
  方案约束 —— 其在该处的正确性直接由 § 5 / § 5.9 管辖。§ 8.1 / § 8.2
  在叶级上引用此清单,取代以文字描述例外。
- **README —— 「通过测试套件」现在被表述为合规的必要条件而非充分
  条件。** 随着 `boundary-fixtures.json` 的叶现在被显式声明为由共享
  语料不对更宽域实现进行验证,README 中不加限定的「实现通过全部测试
  即合规」的说法不再准确 —— 这样的实现还必须对语料豁免的那些叶自行
  验证其 § 5 / § 5.9 行为。
- **RU/ZH § 5.9.3 —— 恢复缺失的空首项包裹情形。** 两个译本都只描述了
  非空复合值开启行的包裹(§ 5.0.1 规则 4/5),且 RU 明确声称仅在
  「首项为非空复合值时」才需要包裹,遗漏了英文原文中同等规范性的空
  复合值情形(规则 2/3,`{}` / `[]`)。严格依照 RU 或 ZH 文本构建的
  writer 会输出一个首项为空 Object/Array 的未包裹 Array 根,其重新
  解析时根 kind 错误 —— 这是译出算法中真正的 round-trip 缺陷,而不
  只是措辞缺口。
- **RU/ZH § 5.6 —— 恢复缺失的 LIFO 配对句子**(「多行字符串体
  MUST NOT 跨越另一个复合值的边界:开启行与关闭行通过解析器的 LIFO
  栈无歧义地配对。」),两个译本均完全缺失。
- **RU/ZH § 5.8.4 —— 移除捏造的「SHOULD 低于 64 层」深度限制。**
  英文原文未设定任何规范性深度限制,只说「SHOULD 避免病态的深度
  嵌套」 —— RU 和 ZH 各自编造了一个权威英文文本中并不存在的具体
  数字。

