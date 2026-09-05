export default {
  en: `- **Breaking:** § 3.3 whitespace changes from
  ASCII-mandatory-plus-Unicode-\`MAY\` to a fixed, exhaustively
  enumerated 25-code-point \`MUST\` (the Unicode \`White_Space\`
  property as of Unicode 6.3, frozen by explicit list rather than by
  reference). Implementations MUST NOT delegate to a host language's
  built-in Unicode-whitespace primitive — verified to disagree with
  this list in both directions across at least two mainstream
  language runtimes. Non-breaking against every shipped 0.6.x Rust
  core, which already recognised the full set via \`char::is_whitespace()\`
  (§ 3.3) — as with § 4's entry below, this is breaking only for an
  implementation that took the old \`MAY\` at face value and stuck to
  ASCII space/tab, rather than matching the Rust core's actual
  behaviour; only the normative text catches up to the code.
- **Breaking:** § 4's key-segment trimming widens from ASCII-only to
  the same fixed 25-code-point set (§ 3.3), resolving a standing
  contradiction between § 3.3 (which already permitted Unicode
  whitespace) and § 4 (which mandated ASCII-only for keys
  specifically) — the same category as the 0.5.0 entry's "Key
  segments are trimmed of leading and trailing ASCII whitespace",
  widened one step further. Two keys differing only by a non-ASCII
  whitespace code point at a trimmed edge, previously distinct under
  a literal reading of § 4, now collide as the same key (§ 5.5). The
  Rust reference implementation's actual trimming behaviour does not
  change — it already trimmed the full set since 0.6.0, so this is
  breaking only for an implementation that followed the old § 4 text
  literally rather than matching the Rust core's actual behaviour;
  only the normative text catches up to the code.
- **Breaking:** The \`(…)\` multi-line string form now strips trailing
  whitespace (§ 3.3) from each content line, matching what it already
  did to each line's leading whitespace. Previously \`(…)\` preserved
  trailing whitespace byte-for-byte, identically to \`((…))\` — an
  editor's "trim trailing whitespace on save" could silently mutate
  string content with no visible signal. \`((…))\` is unaffected and
  remains fully verbatim on both edges.
- **Added:** \`\\uXXXX\` escape (§ 3.7.1) — exactly four hex digits,
  surrogate pairs for code points above the Basic Multilingual Plane,
  lone surrogates rejected as \`BadEscapeSequence\`. Recognised
  wherever the existing ten escapes are recognised (inline scalars
  and keys); not processed in multi-line scalars, multi-line string
  content, or comments. Purely additive to the escape table — no
  existing escape sequence's meaning changes.
- **Added:** § 3.1 — leading byte-order mark handling is
  deterministic: a parser-conforming implementation MUST skip exactly
  one leading U+FEFF if it is the very first code point of the
  document, before any other byte; the canonical writer (§ 5.9)
  MUST NOT emit a leading byte-order mark. A U+FEFF anywhere else in
  the document is ordinary content (§ 3.3 does not classify it as
  whitespace). Unspecified in 0.6.4.
- **Added:** § 6.15 \`InvalidUtf8\` — a new error category for
  documents whose raw bytes are not valid UTF-8 (§ 3.1 already
  required rejecting them; § 6 previously had no matching category
  name for that rejection). The check happens before any
  line-oriented or grammar-level processing; the error span SHOULD
  point at the byte offset of the first invalid sequence.
- **Changed:** § 6.13 \`BadEscapeSequence\` — extended to cover
  malformed \`\\uXXXX\` forms (fewer than four hex digits) and lone
  surrogates, alongside the existing unrecognised-\`\\X\` case.
- **Changed:** § 5.9.10's key re-escape rule now enumerates every
  code point \`<key-char>\` excludes (not just \`\\\`/\`.\`/\`:\`) and
  requires \`\\uXXXX\` for edge whitespace and for structural bytes
  with no named form (\`(\`, \`)\`, DEL, control bytes). Keys containing
  \`(\`, \`)\`, DEL, or a control code point — previously representable
  in the Value model but not emittable in canonical form at all —
  are emittable for the first time as of 0.7.0, via \`\\uXXXX\`. Also
  newly documented (a pre-existing hazard, not new behaviour): a
  key beginning with \`##\` is always emitted in quoted form (never
  bare-with-escape), since no bare-form escape changes the raw
  first two bytes a comment-dispatch check on re-read inspects.
- **Changed:** \`<key-char>\` (§ 4) now admits raw VT (\`0x0B\`) and FF
  (\`0x0C\`) as literal key content, matching the § 3.3 widening —
  previously only tab was exempted from the control-byte exclusion.
  Non-breaking: this only accepts documents previously rejected as
  \`InvalidKey\`, no previously-valid document's meaning changes.
- **Breaking:** § 5.9.0 (new) defines **representable Values** —
  the domain over which the canonical writer's guarantees operate.
  A bare scalar document root, an Object pair with an empty name, a
  non-finite Float (NaN / ±Infinity), and any compound containing a
  non-representable Value at any depth are not representable, and a
  writer-conforming implementation MUST reject them with an error,
  emitting no partial output. Previously § 5.9 left these
  programmatic-only cases undefined. The Rust reference core
  already rejects scalar roots and \`CR\`-bearing Strings; closing
  the remaining gaps there is tracked separately.
- **Changed:** § 5.9.8 — the Float notation threshold now reads
  \`0 < abs < 1e-2\` (was \`abs < 1e-2\`), which taken literally would
  have demanded scientific notation for zero. The canonical form of
  zero is \`0.0\` / \`-0.0\` — decimal, never scientific, sign
  preserved (unlike an Integer's \`-0\` → \`0\`). This matches the Rust
  reference core's existing behaviour; only the normative text
  changes. New fixtures \`float/positive_zero\` and
  \`float/negative_zero\` lock it in.
- **Changed:** § 8.1 (with § 5's Integer definition) — fixture
  equivalence is defined at the minimum-required numeric domain
  (i64 Integer, binary64 Float). An implementation supporting a
  wider domain MAY diverge from a fixture oracle exactly where that
  fixture probes the minimum-domain boundary (e.g.
  \`i64_overflow_to_string.json\`), without forfeiting
  parser-conformance. Previously an arbitrary-precision
  implementation — explicitly permitted by § 5 — failed § 8.1 on
  that fixture as written.
- **Changed:** § 8.2 (with § 5.9.5) — the writer-conforming
  byte-exact requirement gets the mirror-image numeric-domain
  caveat to § 8.1's: exactly on the leaves \`boundary-fixtures.json\`
  names, a wider-domain implementation's parsed Value may
  legitimately differ, and its output MAY differ from the fixture's
  fixed \`canonical.ktav\`, provided that output is the correct
  canonical form (§ 5.9) for the Value it actually holds. Previously
  an arbitrary-precision implementation — explicitly permitted by
  § 5 — failed § 8.2 on \`i64_overflow_to_string\` as written: it
  parses the body as an Integer and would canonically write it
  bare (no raw marker), which the fixture's fixed \`canonical.ktav\`
  forbids.
- **Changed:** § 5.9's byte-determinism guarantee is scoped to
  writer-conforming implementations sharing the declared Value domain,
  Integer/Float domains, and Float decimal-conversion and rounding
  semantics. Each implementation MUST apply its declared conversion
  policy deterministically; implementations with different declarations
  MAY differ where those declarations produce different Values or
  canonical candidates.
- **Breaking:** the Float bullet of § 5 and rule 14 of § 5.2 — the
  Float domain now has a normative floor (MUST support at least the
  range and precision of IEEE 754 binary64; MAY support a wider
  representation) and an overflow fallback mirroring Integer's rule
  13: a float literal that is not finite in the implementation's
  Float domain (e.g. \`1e9999\` on binary64) falls through to String,
  so a 0.7.0-conformant parser MUST NOT ever produce a non-finite
  Float — which is what makes § 5.9.0's claim that "no literal
  grammar of § 3.6 produces a non-finite Float" true. New fixtures
  \`float/positive_overflow_to_string\`,
  \`float/negative_overflow_to_string\`, and \`float/underflow_to_zero\`
  pin the boundary; the last documents that underflowing to \`0.0\`
  (finite) is an ordinary Float, not a String-fallback case. The declared
  Float domain now also includes its decimal-conversion and rounding
  semantics and MUST use a deterministic conversion policy; every non-zero
  finite Float admitted to Ktav Value MUST have a finite (s, D, k) decimal
  candidate that round-trips exactly under that policy. Positive and negative
  zero (+0.0 and -0.0) are admitted separately by the zero rule. An unsupported exact-rational
  value such as 1/3 is outside the Ktav Float domain, not a new writer-error
  case. The minimum binary64 conversion uses roundTiesToEven.
- **Breaking:** § 3.7 and § 5.2 — any recognised escape in an inline
  scalar now forces String before keyword or numeric classification. In
  0.6.x a body such as \`1\\.0\` could decode and classify as Float; in
  0.7.0 it is String. This includes \`\\.\` and \`\\:\`, even where the
  decoded byte has no structural role; the escape is therefore not
  semantically redundant in a value. Fixture
  \`valid/inline/escape/recognized_escape_forces_string_number.*\` locks
  this in.
- **Added:** Quoted keys (§ 5.3.3) — a key segment MAY be written
  \`"…"\`, \`'…'\`, or \`\` \`…\` \`\` instead of bare; inside the delimiters,
  \`.\`, \`:\`, \`,\`, \`{\`, \`}\`, \`[\`, \`]\`, and the two OTHER quote
  characters are ordinary content needing no escape, and content is
  never trimmed. Three new named escapes, \`\\"\` / \`\\'\` / \`\` \\\` \`\`
  (§ 3.7), let a segment's own delimiter appear literally inside it —
  the escape table grows from eleven entries to fourteen. These same
  three escapes are also recognised inside inline scalar **values**,
  not only keys: \`\\"\` / \`\\'\` / \`\` \\\` \`\` now decode to a literal quote
  byte there too, in every context the ten pre-0.7.0 escapes already
  applied to (previously each was a \`BadEscapeSequence\`, § 6.13, in
  every context, values included). A quote character has no
  structural role in an inline value — it is never a delimiter and is
  never stripped, escaped or not — so the escape is valid but
  semantically significant there: its presence forces String under § 5.2,
  exactly as \`\\.\` / \`\\:\` do in values. A new
  \`<escapable-byte>\` alternative and \`<quoted-segment>\` production
  (§ 4) are added to the grammar; \`<bare-segment>\` is also narrowed,
  not left untouched — its first token now comes from the new
  \`<bare-first-token>\`, which excludes an unescaped leading \`"\` / \`'\`
  / \`\` \` \`\` (§ 4), so this IS a change to an existing production, not
  purely additive. The one behavior change this narrowing introduces —
  a key or segment beginning with a quote character — is captured
  separately in the Breaking entry below, not claimed here. A related
  side effect outside key
  canonicalization: § 5.9.6's Array-root first-item bare-form test
  shares this same quote-aware separator scan, so a first item such as
  \`'tis the season: fa\` — whose only \`:\` now scans as inside an
  unterminated quoted segment rather than as an unescaped separator —
  no longer needs the \`::\` raw marker forced in canonical form, unlike
  before quoted keys existed (see
  \`valid/quoted_keys/unterminated_leading_quote_falls_back_to_array_item.canonical.ktav\`).
  The canonical writer (§ 5.9.10) now
  prefers quoted form (delimiter \`"\`) over bare-with-escape whenever
  escaping a structural byte (\`.\` \`:\` \`,\` \`{\` \`}\` \`[\` \`]\`), \`(\` / \`)\`,
  or edge whitespace would otherwise be needed, or the key's first
  segment begins with \`##\` (routed to quoted form unconditionally —
  not an escape trade-off, since no bare-form escape changes the
  raw first two bytes a comment-dispatch check on re-read inspects)
  (escaping only a backslash, LF, CR, a control byte, or DEL does NOT
  switch the form, since quoting does not remove that escape) — this
  changes the canonical bytes of every key previously requiring
  \`\\.\` / \`\\:\` / a bracket / comma / paren escape, or beginning with
  \`##\` (e.g. \`a\\.b: 1\` now canonicalises to \`"a.b": 1\`, not
  \`a\\.b: 1\`); existing \`valid/key_escaping/*.canonical.ktav\`
  fixtures update accordingly (tracked separately from this text
  change). New error category
  \`UnterminatedQuotedKey\` (§ 6.16), reported when a quote opens a key
  segment with no matching closer before end-of-line on any line
  already known to be a pair line; \`InvalidKey\` (§ 6.4) and
  \`EmptyKey\` (§ 6.5) each gain one new triggering case (§ 6.4, § 6.5).
- **Breaking:** A line whose first content — after § 4's key-segment
  trimming — begins with \`"\`, \`'\`, or \`\` \` \`\` no longer necessarily
  parses the way it did before quoted keys (§ 5.3.3, § 10.7): the
  quote character now opens a \`<quoted-segment>\` there instead of
  being ordinary literal content. A key that already began AND ended
  with the same quote character silently reads as a shorter key with
  the delimiters stripped (\`"port": 1\` now names \`port\`, not
  \`"port"\`); a leading quote character with no matching closer before
  end-of-line either falls through to an unaffected Array-root String
  item (root kind not yet decided) or raises the new
  \`UnterminatedQuotedKey\` (root kind already Object) — see § 5.3.3 for
  the exact, context-dependent rule and the \`::\` raw-marker escape
  hatch (§ 5.4 rule 1) already available for an Array item that needs
  an unambiguous leading quote character. No document whose keys
  avoid a leading \`"\` / \`'\` / \`\` \` \`\` is affected in any way.
- **Added:** § 5.9.12 (new) — a first-output-byte guard preventing
  the canonical writer from ever placing the raw 3-byte UTF-8
  encoding of U+FEFF at byte offset 0 of the document, which § 3.1's
  leading-BOM-strip rule would otherwise silently consume on
  re-parse. This closes a gap between § 3.1 (added earlier in this
  same release) and §§ 5.9.0 / 5.9.10's key-representability rules,
  which did not previously account for the interaction: a key or
  Array-root first item beginning with U+FEFF was representable but
  not round-trip-safe in canonical form. Affects exactly two
  positions: a root Object's first-serialized key beginning with
  U+FEFF is now forced into quoted form (§ 5.9.10 rule (c)); a root
  Array's first item being a bare-form String beginning with U+FEFF
  is now forced into raw-marker (\`::\`) form (§ 5.9.6). New fixtures
  \`valid/bom_boundary/*\`.

`,
  ru: `- **Ломающее:** § 3.3 меняется с
  ASCII-обязательного-плюс-Unicode-\`MAY\` на фиксированное,
  исчерпывающе перечисленное \`MUST\` из 25 кодовых точек (свойство
  Unicode \`White_Space\` по состоянию на Unicode 6.3, зафиксированное
  явным списком, а не ссылкой). Реализации MUST NOT делегировать
  встроенному в язык-хозяин примитиву Unicode-пробелов — проверено,
  что как минимум два мейнстрим-языка расходятся с этим списком в
  обе стороны. Не ломающее ни для одного выпущенного релиза 0.6.x
  Rust-ядра, которое уже распознавало полный набор через
  \`char::is_whitespace()\` (§ 3.3) — как и со следующим пунктом
  (§ 4), это ломающее только для реализации, которая буквально
  восприняла старый \`MAY\` и осталась на ASCII-пробеле/табуляции, а
  не соответствовала фактическому поведению Rust-ядра; только
  нормативный текст догоняет код.
- **Ломающее:** обрезка сегмента ключа в § 4 расширяется с ASCII-only
  на тот же фиксированный набор из 25 кодовых точек (§ 3.3), устраняя
  действовавшее противоречие между § 3.3 (уже допускавшим Unicode-
  пробелы) и § 4 (требовавшим ASCII-only именно для ключей) — та же
  категория, что и запись 0.5.0 «Ключевые сегменты обрезаются от
  ведущих и хвостовых ASCII-пробельных символов», расширенная ещё на
  шаг. Два ключа, различающиеся только не-ASCII пробельной кодовой
  точкой на обрезаемой границе, ранее различные при буквальном
  прочтении § 4, теперь сталкиваются как один и тот же ключ (§ 5.5).
  Фактическое поведение обрезки в эталонной Rust-реализации не
  меняется — она уже обрезала полный набор с версии 0.6.0; только
  нормативный текст догоняет код, так что это ломающее только для
  реализации, буквально следовавшей старому тексту § 4, а не
  фактическому поведению Rust-ядра.
- **Ломающее:** многострочная строковая форма \`(…)\` теперь обрезает
  замыкающие пробельные символы (§ 3.3) из каждой содержательной
  строки — так же, как она уже поступала с ведущими пробелами каждой
  строки. Ранее \`(…)\` сохраняла замыкающие пробелы байт-в-байт, точно
  так же, как \`((…))\` — команда редактора «убрать замыкающие пробелы
  при сохранении» могла незаметно испортить содержимое строки без
  видимого сигнала. \`((…))\` не затронута и остаётся полностью
  verbatim на обеих границах.
- **Добавлено:** escape-последовательность \`\\uXXXX\` (§ 3.7.1) — ровно
  четыре hex-цифры, суррогатные пары для кодовых точек выше Basic
  Multilingual Plane, одинокие суррогаты отклоняются как
  \`BadEscapeSequence\`. Распознаётся везде, где распознаются уже
  существующие десять escape (inline-скаляры и ключи); не
  обрабатывается в многострочных скалярах, содержимом многострочных
  строк или комментариях. Чисто аддитивное дополнение таблицы escape
  — смысл ни одной существующей escape-последовательности не меняется.
- **Добавлено:** § 3.1 — обработка ведущего маркера порядка байтов
  детерминирована: parser-conforming реализация MUST пропускать
  ровно один ведущий U+FEFF, если он является самой первой кодовой
  точкой документа, перед любым другим байтом; канонический писатель
  (§ 5.9) MUST NOT выводить ведущий маркер порядка байтов. Кодовая
  точка U+FEFF в любом другом месте документа — обычное содержимое
  (§ 3.3 не относит её к пробельным символам). В 0.6.4 не
  определялось.
- **Добавлено:** § 6.15 \`InvalidUtf8\` — новая категория ошибок для
  документов, чьи сырые байты не являются валидным UTF-8
  (§ 3.1 уже требовал отвергать их; в § 6 не было соответствующего
  имени категории). Проверка выполняется до какой-либо построчной
  или грамматической обработки; Span ошибки SHOULD указывать на
  байтовое смещение первой невалидной последовательности.
- **Изменено:** § 6.13 \`BadEscapeSequence\` — расширена для покрытия
  некорректных форм \`\\uXXXX\` (менее четырёх hex-цифр) и одиноких
  суррогатов, наряду с существующим случаем нераспознанного \`\\X\`.
- **Изменено:** правило ре-экранирования ключей в § 5.9.10 теперь
  перечисляет каждую кодовую точку, исключаемую \`<key-char>\` (не
  только \`\\\`/\`.\`/\`:\`), и требует \`\\uXXXX\` для пограничного пробела
  и структурных байтов без именованной формы (\`(\`, \`)\`, DEL,
  управляющие байты). Ключи, содержащие \`(\`, \`)\`, DEL или
  управляющую кодовую точку — ранее допустимые в модели Value, но
  невыводимые в канонической форме вообще — впервые становятся
  выводимыми начиная с 0.7.0, через \`\\uXXXX\`.
  Также впервые задокументировано (существовавшая ранее
  опасность, не новое поведение): ключ, начинающийся с \`##\`,
  всегда выводится в квотированной форме (никогда голой-с-escape),
  поскольку никакое экранирование в голой форме не меняет сырые
  первые два байта, которые проверяет диспетчеризация комментария
  при повторном чтении.
- **Изменено:** \`<key-char>\` (§ 4) теперь допускает сырые VT
  (\`0x0B\`) и FF (\`0x0C\`) как буквальное содержимое ключа, в
  соответствии с расширением § 3.3 — ранее только табуляция была
  исключением из запрета управляющих байтов. Не ломающее: это
  только принимает документы, ранее отвергавшиеся как \`InvalidKey\`,
  ни одно ранее валидное значение не меняет смысл.
- **Ломающее:** § 5.9.0 (новый) нормативно определяет
  **представимые Values** — домен, на котором действуют гарантии
  канонического эмиттера. Голый скалярный корень документа, пара
  Object с пустым именем, неконечный Float (NaN / ±Infinity) и
  любое составное Value, содержащее непредставимое Value на любой
  глубине, непредставимы, и writer-conforming реализация MUST
  отклонять их с ошибкой, не выпуская частичного вывода. Ранее
  § 5.9 оставлял эти чисто программные случаи неопределёнными.
  Эталонное Rust-ядро уже отклоняет скалярные корни и String с
  \`CR\`; закрытие оставшихся там пробелов отслеживается отдельно.
- **Изменено:** § 5.9.8 — порог формы записи Float теперь читается
  как \`0 < abs < 1e-2\` (было \`abs < 1e-2\`), что при буквальном
  прочтении требовало бы научной записи для нуля. Каноническая
  форма нуля — \`0.0\` / \`-0.0\` — десятичная, никогда научная, со
  сохранением знака (в отличие от \`-0\` у Integer → \`0\`). Это
  соответствует существующему поведению эталонного Rust-ядра;
  меняется только нормативный текст. Новые фикстуры
  \`float/positive_zero\` и \`float/negative_zero\` фиксируют это.
- **Изменено:** § 8.1 (вместе с определением Integer в § 5) —
  эквивалентность фикстур определяется на минимально требуемом
  числовом домене (Integer i64, Float binary64). Реализация,
  поддерживающая более широкий домен, MAY расходиться с оракулом
  фикстуры ровно там, где фикстура проверяет границу минимального
  домена (например, \`i64_overflow_to_string.json\`), не теряя
  parser-conformance. Ранее реализация с произвольной точностью —
  явно разрешённая § 5 — проваливала § 8.1 на этой фикстуре в её
  буквальном виде.
- **Изменено:** § 8.2 (вместе с § 5.9.5) — байт-точное требование
  writer-conforming-реализации дополняется оговоркой о числовом
  домене, зеркалящей § 8.1: ровно на листьях, названных в
  \`boundary-fixtures.json\`, Value, разобранный реализацией с более
  широким доменом, может законно отличаться, и её вывод MAY
  отличаться от фиксированного \`canonical.ktav\` фикстуры, если
  этот вывод является корректной канонической формой (§ 5.9) для
  действительно удерживаемого Value. Ранее реализация с
  произвольной точностью — явно разрешённая § 5 — проваливала
  § 8.2 на \`i64_overflow_to_string\` в буквальном виде: она
  разбирает тело как Integer и записала бы его канонически голым
  (без raw-маркера), что фиксированный \`canonical.ktav\` фикстуры
  запрещает.
- **Изменено:** гарантия байт-детерминизма § 5.9 ограничивается
  реализациями-эмиттерами с одинаковым заявленным доменом Value,
  доменами Integer/Float и семантикой decimal-преобразования и округления
  Float. Каждая реализация MUST детерминированно применять свою заявленную
  политику преобразования; реализации с разными заявлениями MAY расходиться
  там, где они получают разные Values или канонические кандидаты.
- **Ломающее:** маркер Float в § 5 и правило 14 § 5.2 — домен
  Float теперь имеет нормативный минимум (MUST поддерживать как
  минимум диапазон и точность IEEE 754 binary64; MAY поддерживать
  более широкое представление) и откат при переполнении,
  зеркалящий правило 13 для Integer: float-литерал, неконечный в
  домене Float реализации (например, \`1e9999\` на binary64),
  проваливается в String, поэтому 0.7.0-конформный парсер MUST NOT
  когда-либо порождать неконечный Float — что делает истинным
  утверждение § 5.9.0 о том, что «ни одна грамматика литералов
  § 3.6 не порождает неконечный Float». Новые фикстуры
  \`float/positive_overflow_to_string\`,
  \`float/negative_overflow_to_string\` и \`float/underflow_to_zero\`
  фиксируют границу; последняя документирует, что underflow в
  \`0.0\` (конечный) — обычный Float, а не случай отката к String.
  Заявленный домен Float теперь также включает семантику decimal-
  преобразования и округления и MUST использовать детерминированную
  политику преобразования; каждый ненулевой конечный Float, допускаемый в
  Ktav Value, MUST иметь конечный десятичный кандидат (s, D, k), точно
  проходящий round-trip с этой политикой. Положительный и отрицательный
  ноль (+0.0 и -0.0) допускаются отдельно по правилу нуля. Неподдерживаемое точное
  рациональное значение вроде 1/3 находится вне домена Ktav Float, а не
  создаёт новый случай ошибки writer. Минимальное binary64 использует
  roundTiesToEven.
- **Ломающее:** § 3.7 и § 5.2 — любой распознанный escape в inline-
  скаляре теперь фиксирует String до классификации ключевого слова или
  числа. В 0.6.x тело вроде \`1\\.0\` могло декодироваться и
  классифицироваться как Float; в 0.7.0 это String. Это включает \`\\.\`
  и \`\\:\`, даже когда декодированный байт не имеет структурной роли;
  поэтому escape не является семантически избыточным в значении.
  Fixture \`valid/inline/escape/recognized_escape_forces_string_number.*\`
  фиксирует правило.
- **Добавлено:** Квотированные ключи (§ 5.3.3) — сегмент ключа MAY
  быть записан как \`"…"\`, \`'…'\` или \`\` \`…\` \`\` вместо голого; внутри
  разделителей \`.\`, \`:\`, \`,\`, \`{\`, \`}\`, \`[\`, \`]\` и два ДРУГИХ символа
  кавычек — обычное содержимое, не требующее экранирования, и
  содержимое никогда не обрезается. Три новых именованных escape,
  \`\\"\` / \`\\'\` / \`\` \\\` \`\` (§ 3.7), позволяют собственному разделителю
  сегмента появляться в нём буквально — таблица escape вырастает с
  одиннадцати записей до четырнадцати. Эти же три escape также
  распознаются внутри inline-скалярных **значений**, не только
  ключей: \`\\"\` / \`\\'\` / \`\` \\\` \`\` теперь декодируются там в
  литеральный байт кавычки тоже, в любом контексте, где уже
  применялись десять escape до 0.7.0 (ранее каждый из них был
  \`BadEscapeSequence\`, § 6.13, в любом контексте, включая значения).
  Символ кавычки не играет структурной роли в inline-значении — он
  никогда не является разделителем и никогда не удаляется,
  экранирован он или нет, — так что escape там валиден, но семантически
  значим: его наличие фиксирует String по § 5.2, точно как уже \`\\.\` /
  \`\\:\` в значениях. В грамматику (§ 4) добавлены
  новая альтернатива \`<escapable-byte>\` и производство
  \`<quoted-segment>\`; \`<bare-segment>\` также сужается, а не остаётся
  нетронутым — его первый токен теперь берётся из нового
  \`<bare-first-token>\`, который исключает ведущий неэкранированный
  \`"\` / \`'\` / \`\` \` \`\` (§ 4), так что это ЯВЛЯЕТСЯ изменением
  существующего производства, а не чисто аддитивным добавлением.
  Единственное изменение поведения, которое вносит это сужение —
  ключ или сегмент, начинающийся с символа кавычки, — зафиксировано
  отдельно в записи «Ломающее» ниже, а не заявляется здесь. Смежный
  побочный эффект вне канонизации ключей: тест голой формы первого
  элемента корня-Array § 5.9.6 разделяет то же самое
  кавычко-осведомлённое сканирование разделителя, так что первый
  элемент вроде \`'tis the season: fa\` — чьё единственное \`:\` теперь
  сканируется как находящееся внутри незакрытого квотированного
  сегмента, а не как неэкранированный разделитель — больше не
  нуждается в вынужденном raw-маркере \`::\` в канонической форме, в
  отличие от того, что было до существования квотированных ключей
  (см. \`valid/quoted_keys/unterminated_leading_quote_falls_back_to_array_item.canonical.ktav\`).
  Канонический писатель (§ 5.9.10) теперь предпочитает квотированную
  форму (разделитель \`"\`) голой-форме-с-экранированием всякий раз,
  когда иначе потребовалось бы экранировать структурный байт (\`.\`
  \`:\` \`,\` \`{\` \`}\` \`[\` \`]\`), \`(\` / \`)\`, или краевой пробел, либо когда
  первый сегмент ключа начинается с \`##\` (направляется в
  квотированную форму безусловно — это не компромисс по
  экранированию, поскольку никакое экранирование в голой форме не
  меняет сырые первые два байта, которые проверяет диспетчеризация
  комментария при повторном чтении)
  (экранирование только обратного слэша, LF, CR, управляющего байта
  или DEL НЕ переключает форму, поскольку квотирование не устраняет
  это экранирование) — это меняет канонические байты каждого ключа,
  ранее требовавшего экранирования \`\\.\` / \`\\:\` / скобки / запятой /
  круглой скобки, или начинавшегося с \`##\` (например, \`a\\.b: 1\`
  теперь канонизируется в \`"a.b": 1\`, а не \`a\\.b: 1\`); существующие
  фикстуры \`valid/key_escaping/*.canonical.ktav\` обновляются
  соответственно (отслеживается отдельно от этого изменения текста).
  Новая категория ошибок \`UnterminatedQuotedKey\` (§ 6.16), сообщаемая,
  когда кавычка открывает сегмент ключа без подходящего закрывающего
  символа до конца строки на любой строке, уже известной как pair
  line; \`InvalidKey\` (§ 6.4) и \`EmptyKey\` (§ 6.5) каждая приобретает
  один новый триггерящий случай (§ 6.4, § 6.5).
- **Ломающее:** Строка, чьё первое содержимое — после обрезки
  сегмента ключа § 4 — начинается с \`"\`, \`'\` или \`\` \` \`\`, больше не
  обязательно разбирается так же, как до квотированных ключей
  (§ 5.3.3, § 10.7): символ кавычки теперь открывает там
  \`<quoted-segment>\` вместо того, чтобы быть обычным литеральным
  содержимым. Ключ, который уже начинался И заканчивался тем же
  символом кавычки, молча читается как более короткий ключ с
  удалёнными разделителями (\`"port": 1\` теперь именует \`port\`, а не
  \`"port"\`); ведущий символ кавычки без подходящего закрывающего до
  конца строки либо проваливается в незатронутый элемент String
  корня-Array (вид корня ещё не решён), либо вызывает новую
  \`UnterminatedQuotedKey\` (вид корня уже — Object) — см. § 5.3.3 для
  точного, зависящего от контекста правила и escape-хатча в виде
  raw-маркера \`::\` (правило 1 § 5.4), уже доступного для элемента
  Array, которому нужен однозначный ведущий символ кавычки. Ни один
  документ, чьи ключи избегают ведущего \`"\` / \`'\` / \`\` \` \`\`, никак не
  затронут.
- **Добавлено:** § 5.9.12 (новый) — защита первого байта вывода,
  предотвращающая размещение каноническим писателем сырой 3-байтовой
  UTF-8-кодировки U+FEFF на байтовом смещении 0 документа, что иначе
  правило § 3.1 о снятии ведущего BOM молча поглотило бы при повторном
  парсинге. Это закрывает пробел между § 3.1 (добавленным ранее в этом
  же релизе) и правилами представимости ключей §§ 5.9.0 / 5.9.10,
  которые ранее не учитывали это взаимодействие: ключ или первый
  элемент корня-Array, начинающийся с U+FEFF, был представим, но не
  безопасен для round-trip в канонической форме. Затрагивает ровно две
  позиции: первый сериализуемый ключ корневого Object, начинающийся с
  U+FEFF, теперь вынужденно принимает квотированную форму (правило (c)
  § 5.9.10); первый элемент корневого Array, являющийся голой формой
  String, начинающейся с U+FEFF, теперь вынужденно принимает форму
  raw-маркера (\`::\`) (§ 5.9.6). Новые фикстуры \`valid/bom_boundary/*\`.

`,
  zh: `- **破坏性:** § 3.3 从「ASCII 强制 + Unicode \`MAY\`」变为固定的、
  穷举列出的 25 码点 \`MUST\`(Unicode 6.3 版本时的 \`White_Space\`
  属性,以显式列表而非引用的方式固定)。实现 MUST NOT 委托给宿主
  语言内置的 Unicode 空白判定原语 —— 已验证至少两种主流语言运行
  时在两个方向上均与此列表存在分歧。相对每一个已发布的 0.6.x
  Rust 核心版本均非破坏性,因为它已经通过 \`char::is_whitespace()\`
  (§ 3.3)识别完整集合 —— 与下面 § 4 的条目一样,这仅对字面理解
  旧 \`MAY\` 并停留在 ASCII 空格/制表符的实现是破坏性的,而非匹配
  Rust 核心实际行为的实现;只是规范文本追上了代码。
- **破坏性:** § 4 的键段修剪从仅 ASCII 扩展到 § 3.3 的同一固定 25
  码点集合,解决了 § 3.3(此前已允许 Unicode 空白)与 § 4(此前
  专门要求键使用仅 ASCII)之间原本存在的矛盾 —— 与 0.5.0 条目
  「键段修剪掉前后 ASCII 空白」属于同一类变更,在此基础上进一步
  扩展。仅在被修剪边界处以非 ASCII 空白码点相区别的两个键,此前
  在字面理解 § 4 时是不同的键,现在会碰撞为同一个键(§ 5.5)。
  Rust 参考实现的实际修剪行为并未改变 —— 自 0.6.0 起它就已经修剪
  完整集合;只是规范文本追上了代码,因此这仅对字面遵循旧 § 4
  文本、而非匹配 Rust 核心实际行为的实现是破坏性的。
- **破坏性:** 多行字符串 \`(…)\` 形式现在会从每个内容行去除尾部
  空白(§ 3.3),这与它此前已对每行前导空白所做的处理一致。此前
  \`(…)\` 会逐字节保留尾部空白,与 \`((…))\` 完全一致 —— 编辑器的
  「保存时去除尾部空白」功能可能因此在毫无提示的情况下悄悄改变
  字符串内容。\`((…))\` 不受影响,两侧边界仍完全 verbatim。
- **新增:** \`\\uXXXX\` escape(§ 3.7.1)—— 恰好四位十六进制数字,
  基本多文种平面之外的码点使用代理对,孤立代理项被拒绝为
  \`BadEscapeSequence\`。在已有十个 escape 被识别之处(inline 标量
  与键)同样被识别;不在多行标量、多行字符串内容或注释中处理。
  对 escape 表纯属新增 —— 已有任何一个 escape 序列的含义均未改变。
- **新增:** § 3.1 —— 前导字节顺序标记的处理是确定性的:
  parser-conforming 实现 MUST 跳过恰好一个前导 U+FEFF(若它是文档
  的第一个码点、位于任何其他字节之前);规范写入器(§ 5.9)MUST NOT
  输出前导字节顺序标记。文档中任何其他位置的 U+FEFF 码点都是普通
  内容(§ 3.3 未将其归类为空白)。0.6.4 未作规定。
- **新增:** § 6.15 \`InvalidUtf8\` —— 新增错误类别,用于原始字节不是
  有效 UTF-8 的文档(§ 3.1 已要求拒绝此类文档;§ 6 此前没有对应的
  类别名称)。该检查在任何面向行的或文法级处理之前进行;错误 span
  SHOULD 指向第一个无效序列的字节偏移。
- **变更:** § 6.13 \`BadEscapeSequence\` —— 扩展以覆盖不合法的
  \`\\uXXXX\` 形式(少于四位十六进制数字)与孤立代理项,与既有的
  未识别 \`\\X\` 情形并列。
- **变更:** § 5.9.10 的键重新 escape 规则现在列举 \`<key-char>\`
  排除的每个码点(不仅是 \`\\\`/\`.\`/\`:\`),并要求对边界空白与没有
  命名形式的结构字节(\`(\`、\`)\`、DEL、控制字节)使用 \`\\uXXXX\`。
  含有 \`(\`、\`)\`、DEL 或控制码点的键 —— 此前在 Value 模型中允许,
  但完全无法以规范形式输出 —— 自 0.7.0 起首次可通过 \`\\uXXXX\`
  输出。
  另外首次记录(此前就存在的风险,并非新行为):以 \`##\`
  开头的键始终以 quoted 形式输出(绝不会是裸形式加 escape),
  因为裸形式的任何 escape 都不会改变重读时注释分发检查所
  检查的原始前两个字节。
- **变更:** \`<key-char>\`(§ 4)现在允许原始 VT(\`0x0B\`)与 FF
  (\`0x0C\`)作为字面键内容,与 § 3.3 的扩展一致 —— 此前只有制表符
  被排除在控制字节禁令之外。非破坏性:仅接受此前被拒绝为
  \`InvalidKey\` 的文档,任何此前有效的值含义均不改变。
- **破坏性:** § 5.9.0(新增)定义**可表示的值** —— 规范 writer
  保证所作用的域。裸标量文档根、名为空的 Object 对、非有限
  Float(NaN / ±Infinity),以及任意深度包含不可表示 Value 的
  任何复合值均不可表示,writer-conforming 实现 MUST 以错误拒绝
  它们,不输出任何部分内容。此前 § 5.9 未定义这些仅经编程方式
  出现的情形。Rust 参考核心已拒绝标量根与含 \`CR\` 的 String;
  弥补其余缺口另行跟踪。
- **变更:** § 5.9.8 —— Float 表示形式阈值现在为 \`0 < abs < 1e-2\`
  (原为 \`abs < 1e-2\`),按字面理解后者会要求零使用科学形式。零
  的规范形式为 \`0.0\` / \`-0.0\` —— 十进制,绝非科学形式,符号保留
  (不同于 Integer 的 \`-0\` → \`0\`)。这与 Rust 参考核心的既有行为
  一致;改变的只是规范文本。新 fixture \`float/positive_zero\` 与
  \`float/negative_zero\` 将其锁定。
- **变更:** § 8.1(连同 § 5 的 Integer 定义)—— fixture 等价性
  定义在最小必需数值域上(i64 Integer、binary64 Float)。支持
  更宽域的实现 MAY 恰好在 fixture 探测最小域边界之处偏离 fixture
  oracle(如 \`i64_overflow_to_string.json\`),而不丧失
  parser-conformance。此前 § 5 明确允许的任意精度实现会按原文本
  在该 fixture 上不满足 § 8.1。
- **变更:** § 8.2(连同 § 5.9.5)—— writer-conforming 的逐字节
  fixture 要求补充了镜像 § 8.1 的数值域警告:恰在
  \`boundary-fixtures.json\` 所指名的叶子上,更宽域实现解析出的 Value 可能合法地
  不同,其输出 MAY 不同于该 fixture 固定的 \`canonical.ktav\` ——
  只要该输出对其真正持有的 Value 是正确的规范形式(§ 5.9)。此前
  § 5 明确允许的任意精度实现会按原文本在 \`i64_overflow_to_string\`
  上不满足 § 8.2:它把体解析为 Integer 并会以裸形式规范写出
  (无 raw 标记),而 fixture 固定的 \`canonical.ktav\` 不允许这样。
- **变更:** § 5.9 的字节确定性保证限定在声明相同 Value 域、
  Integer/Float 域以及 Float 十进制转换与舍入语义的
  writer-conforming 实现之间。每个实现 MUST 确定性地应用其声明的
  转换策略;声明不同的实现 MAY 在这些声明产生不同 Value 或规范候选
  的地方输出不同结果。
- **破坏性:** § 5 的 Float 条目与 § 5.2 规则 14 —— Float 域现在有
  规范性下限(MUST 至少支持 IEEE 754 binary64 的范围与精度;
  MAY 支持更宽表示)和镜像 Integer 规则 13 的溢出回退:在实现
  Float 域内非有限的浮点字面量(如 binary64 上的 \`1e9999\`)回退
  为 String,因此 0.7.0 兼容解析器 MUST NOT 永远产生非有限
  Float —— 这使 § 5.9.0「§ 3.6 的任何字面量语法都不产生非有限
  Float」的断言真正成立。新 fixture \`float/positive_overflow_to_string\`、
  \`float/negative_overflow_to_string\` 与 \`float/underflow_to_zero\`
  将边界锁定;最后一个 fixture 记录下溢到 \`0.0\`(有限)是普通
  Float,而非回退为 String 的情形。声明的 Float 域现在还包括其十进制
  转换与舍入语义,并 MUST 使用确定性的转换策略;每个被接纳进 Ktav
  Value 的非零有限 Float MUST 有一个按该策略精确 round-trip 的有限
  (s, D, k) 十进制候选。正零与负零(+0.0 与 -0.0)按零规则单独接纳。不支持的精确
  有理值(如 1/3)属于 Ktav Float 域之外,不新增 writer 错误情形。最小
  binary64 转换使用 roundTiesToEven。
- **破坏性:** § 3.7 与 § 5.2 —— inline 标量中的任何已识别 escape
  现在会在关键字或数字分类之前强制为 String。在 0.6.x 中,像
  \`1\\.0\` 这样的体可以先解码再分类为 Float;在 0.7.0 中它是
  String。这包括 \`\\.\` 与 \`\\:\`,即使解码出的字节没有结构性作用;
  因此 escape 在值中并非语义冗余。fixture
  \`valid/inline/escape/recognized_escape_forces_string_number.*\`
  固化该规则。
- **新增:** 带引号的键(§ 5.3.3)—— 键段 MAY 写成 \`"…"\`、\`'…'\`
  或 \`\` \`…\` \`\` 而非裸形式;在分隔符内部,\`.\`、\`:\`、\`,\`、\`{\`、\`}\`、
  \`[\`、\`]\` 以及另外两种引号字符都是普通内容,无需 escape,且内容
  从不被修剪。三个新的命名 escape,\`\\"\` / \`\\'\` / \`\` \\\` \`\`
  (§ 3.7),让段自身的分隔符能以字面形式出现在其中 —— escape 表
  从十一条增长到十四条。这三个 escape 同样在 inline 标量**值**
  中被识别,不仅限于键:\`\\"\` / \`\\'\` / \`\` \\\` \`\` 现在也在值中解码为
  字面引号字节,适用于 0.7.0 之前的十个 escape 已经适用的每一个
  场景(此前在包括值在内的每个场景中,它们都是
  \`BadEscapeSequence\`,§ 6.13)。引号字符在 inline 值中不具有
  结构性作用 —— 它从来不是分隔符,也从不会被剥离,不论是否
  escape —— 因此该 escape 在那里合法但具有语义作用:它依 § 5.2
  强制为 String,正如 \`\\.\` / \`\\:\` 在值中一样。语法(§ 4)新增了
  \`<escapable-byte>\` 的一个新
  候选和 \`<quoted-segment>\` 产生式;\`<bare-segment>\` 也被收窄,
  而非保持不变 —— 其首个 token 现在来自新的 \`<bare-first-token>\`,
  它排除了未 escape 的前导 \`"\` / \`'\` / \`\` \` \`\`(§ 4),因此这确实
  是对既有产生式的一次修改,而不仅仅是纯增量。这次收窄引入的唯一
  行为变化 —— 以引号字符开头的键或段 —— 单独记录在下面的
  「破坏性变更」条目中,此处不作声明。键规范化之外的一个相关
  副作用:§ 5.9.6 的 Array 根首项裸形式测试共享同一套对引号敏感
  的分隔符扫描,因此像 \`'tis the season: fa\` 这样的首项 ——
  其唯一的 \`:\` 现在被扫描为处于一个未终止的 quoted 段内部,而非
  未 escape 的分隔符 —— 不再需要在规范形式中强制使用 \`::\`
  raw-marker,这与带引号的键出现之前不同(见
  \`valid/quoted_keys/unterminated_leading_quote_falls_back_to_array_item.canonical.ktav\`)。
  规范 writer(§ 5.9.10)现在只要另需对结构性字节
  (\`.\` \`:\` \`,\` \`{\` \`}\` \`[\` \`]\`)、\`(\` / \`)\` 或边缘空白做 escape,
  或者键的首段以 \`##\` 开头(无条件导向 quoted 形式 —— 不涉及
  escape 上的权衡,因为裸形式中没有任何 escape 能改变重读时
  注释分发检查所检查的原始前两个字节),就会优先选用 quoted
  形式(分隔符 \`"\`)而非 bare-with-escape(仅 escape 反斜杠、
  LF、CR、控制字节或 DEL 不会切换形式,因为加引号并不能去掉那个
  escape)—— 这改变了此前需要 \`\\.\` / \`\\:\` / 括号 / 逗号 / 圆括号
  escape,或以 \`##\` 开头的每一个键的规范字节(例如 \`a\\.b: 1\` 现在规范化为
  \`"a.b": 1\`,而非 \`a\\.b: 1\`);既有的
  \`valid/key_escaping/*.canonical.ktav\` fixture 相应更新(与本次
  文本变更分开跟踪)。新增错误类别
  \`UnterminatedQuotedKey\`(§ 6.16),在已知为 pair line 的行上,
  当引号开启一个键段却在行末之前没有匹配的关闭符时报告;
  \`InvalidKey\`(§ 6.4)与 \`EmptyKey\`(§ 6.5)各自新增一种触发场景
  (§ 6.4、§ 6.5)。
- **破坏性变更:** 一行的首个内容 —— 经过 § 4 的键段修剪之后 ——
  以 \`"\`、\`'\` 或 \`\` \` \`\` 开头时,不再必然按带引号的键出现之前的
  方式解析(§ 5.3.3、§ 10.7):引号字符现在会在那里开启一个
  \`<quoted-segment>\`,而不再是普通的字面内容。一个原本以同一种
  引号字符开头**且**结尾的键,会被静默地读作去掉分隔符后更短的键
  (\`"port": 1\` 现在命名 \`port\`,而不是 \`"port"\`);行末之前没有
  匹配关闭符的前导引号字符,要么落入未受影响的 Array 根 String
  项(根类型尚未判定),要么引发新的 \`UnterminatedQuotedKey\`
  (根类型已判定为 Object)—— 具体的、依上下文而定的规则见
  § 5.3.3,以及已有的、供 Array 项在需要明确前导引号字符时使用的
  \`::\` raw-marker escape 出口(§ 5.4 规则 1)。键不以前导 \`"\` /
  \`'\` / \`\` \` \`\` 开头的文档完全不受影响。
- **新增:** § 5.9.12(新)—— 首字节防护,防止规范 writer 把
  U+FEFF 的原始 3 字节 UTF-8 编码放在文档字节偏移 0 处,否则
  § 3.1 的前导 BOM 剥离规则会在重解析时悄悄吞掉它。这弥合了
  § 3.1(本版本中较早加入)与 §§ 5.9.0 / 5.9.10 键可表示性规则
  之间此前未考虑到的交互缺口:以 U+FEFF 开头的键或 Array 根首项
  此前是可表示的,但在规范形式下并不具备 round-trip 安全性。恰好
  影响两个位置:以 U+FEFF 开头的根 Object 首个序列化键,现在被
  强制使用 quoted 形式(§ 5.9.10 规则 (c));作为裸形式 String 且
  以 U+FEFF 开头的根 Array 首项,现在被强制使用 raw-marker
  (\`::\`)形式(§ 5.9.6)。新 fixture \`valid/bom_boundary/*\`。

`,
};
