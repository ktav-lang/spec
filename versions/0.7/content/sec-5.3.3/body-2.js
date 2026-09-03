export default {
  en: `- **Keys only.** Quoting (this whole § 5.3.3) applies only to key
  segments — § 4's \`<key>\` production. A quote character in any VALUE
  position — an inline scalar, a multi-line string, an array item —
  is ordinary content with no special meaning: it never opens a
  \`<quoted-segment>\`, is never a delimiter, and is never stripped or
  unwrapped there. \`{a: "b"}\` is the pair \`a\` mapped to the
  three-character String \`"b"\` (quote, \`b\`, quote — an ordinary bare
  inline scalar, per § 5.2's existing scalar-typing rules), not an
  unwrapped String \`b\`: 0.7.0 does not add JSON-style value quoting.
  This is NOT the same as saying the value-escaping rules are
  unchanged, though: § 3.7's three quote escapes (\`\\"\`, \`\\'\`,
  \`\` \\\` \`\`) are recognised in every escape-aware context alike,
  inline scalar values included, exactly as \`\\.\` / \`\\:\` already were
  — so an inline value's escape processing must now also accept all
  three quote-escape spellings, each decoding to its literal quote
  character. What is unchanged is only that raw, unescaped quote
  characters in a value still carry no structural meaning and are
  never delimiters.
- **Positional rule.** A quote character opens a \`<quoted-segment>\`
  if and only if it is the first code point of a segment's raw text
  *after* the same edge-whitespace trimming § 4 already applies to
  every segment. This positional test is re-applied fresh at the
  start of EVERY segment, with no exception — including a segment
  that immediately follows an unescaped dot: the dot still starts a
  new segment (§ 5.3.2), and a quote character sitting right after it
  is that new segment's own first code point, so it opens a
  \`<quoted-segment>\` there exactly as it would at the very start of
  the whole key. This is why \`a."b.c".d: 1\` is the three-segment path
  \`["a", "b.c", "d"]\` (§ 4's dotted-path example; the "Per-segment
  participation in dotted paths" bullet below) rather than stopping
  at two segments. Anywhere a quote character is NOT the first code
  point of a segment — mid-segment, or after other non-whitespace
  content within the same segment — it is an ordinary \`<key-char>\`,
  exactly as in every version before 0.7.0's quoted-key addition:
  \`don't: 1\` and \`a"b: 1\` are unaffected, and \`port": 1\` is still the
  five-character bare key \`port"\`.
- **Content is not trimmed.** Unlike a \`<bare-segment>\`, whitespace
  immediately inside a \`<quoted-segment>\`'s delimiters is ordinary
  content, preserved verbatim at both edges: \`" a "\` decodes to the
  three-code-point key space-\`a\`-space (not the one-character key
  \`a\`). This is why an all-whitespace quoted segment (\`" "\`) is a
  valid one-space key, not an \`EmptyKey\` (§ 6.5) — contrast a
  \`<bare-segment>\` of only whitespace, which trims to nothing and IS
  \`EmptyKey\`.
- **Escaping inside the delimiters.** The full fourteen-entry escape
  table (§ 3.7) applies identically to \`<dq-token>\` / \`<sq-token>\` /
  \`<bt-token>\` and to \`<bare-segment>\`'s \`<key-token>\` — there is no
  separate, smaller table for quoted content. The practical
  difference is which raw bytes are structural: inside a
  \`<quoted-segment>\`, \`.\` / \`:\` / \`,\` / \`{\` / \`}\` / \`[\` / \`]\` and the
  two quote characters OTHER than the segment's own delimiter are all
  ordinary content and need no escape at all (though their named
  escapes — \`\\.\`, \`\\:\`, etc. — still work if used, decoding to the
  same literal byte, exactly as \`\\.\`/\`\\:\` are already harmlessly valid
  inside an inline scalar value where dot and colon are not
  structural either); only the delimiter itself is structural, and
  only within its own segment — \`\` \`it's "quoted"\` \`\` is the
  unambiguous thirteen-code-point content \`it's "quoted"\`, because
  the terminator is fixed by the *opening* backtick: neither \`'\` nor
  \`"\` closes it. A raw control byte or DEL is forbidden inside
  a \`<quoted-segment>\` exactly as inside a \`<bare-segment>\` (§ 4's
  \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\` exclusions) — quoting
  relaxes which STRUCTURAL bytes need escaping, not the format's
  separate "no invisible bytes in keys" rule; a control byte or DEL is
  still only representable via \`\\uXXXX\`.
- **Nothing may follow the closer within the same segment.** After a
  \`<quoted-segment>\`'s closing delimiter, only whitespace (already
  consumed by trimming — see § 4) may appear before the next
  \`<unescaped-dot>\` or the pair separator. Any other content there —
  \`"a"b: 1\`, \`"a" "b": 1\` — is an \`InvalidKey\` error (§ 6.4): there is
  no form combining quoted content with further bare or quoted
  content inside one segment; write two dotted segments instead
  (\`"a"."b": 1\`) if two distinct pieces are intended.
- **Unterminated quoted segments.** If a quote character opens a
  segment and no matching unescaped closing delimiter is found before
  end-of-line, § 4's separator-scanning rule simply finds no
  separator on that line at all — indistinguishable, at the scanning
  level, from a line containing no \`:\` anywhere. Bracket-balance
  scanning is likewise quote-opaque (the "Inline pairs" bullet
  below): an in-progress quoted segment swallows everything up to
  end-of-line, colons and brackets alike. Every line falls into
  exactly one of the following three contexts, and the outcome is
  determined entirely by which one:
  1. **Ordinary multi-line pair line, inside an already-established
     Object.** Every line dispatched as a pair line under § 5.1
     rule 8 — inside an already-established Object, including the
     top-level Object body once established — requires a separator;
     finding none is always an error. When the specific reason is an
     unterminated quoted segment, the diagnosis is the more specific
     \`UnterminatedQuotedKey\` (§ 6.16) rather than the generic
     \`MissingSeparator\` (§ 6.6) that a plain colon-free line would
     raise.
  2. **Inline key position, inside \`{...}\` (§ 5.8.2) — including a
     first content line that itself begins with \`{\` or \`[\`**, which
     § 5.0.1 rules 2–5 route by leading bracket/brace before rule 6's
     pair-candidate test is ever tried. Here the outcome turns on
     bracket-balance, not on separator-scanning: an unterminated
     quoted segment makes everything from the opening quote to
     end-of-line opaque to bracket-balance counting too, so a \`}\` /
     \`]\` that appears only *inside* the unterminated segment's reach
     does not count as a matching closer. \`{"a: 1}\` therefore does not
     close under rule 2 (the unterminated \`"\` swallows the rest of the
     line, closing brace included) and is not a lone \`{\` under rule 4
     either; it falls to § 5.0.1's note after rules 2–5, diagnosed as
     \`UnterminatedInlineCompound\` (§ 6.11) — never
     \`MalformedInlineCompound\` (§ 6.12 applies only to a structural
     defect INSIDE an already-closed compound, and this compound
     never closes: the swallowed closer means no matching \`}\` / \`]\`
     was found on the line at all) and never \`UnterminatedQuotedKey\`
     (§ 6.16 excludes this context explicitly): the compound-level
     defect is what a reader can actually see and fix, and there is
     no separate "the key inside was also unterminated" defect to
     name on top of it. This is an existing diagnostic path,
     unmodified by quoted keys; quoting only adds one more way a
     line can fail to bracket-balance, alongside an
     already-unterminated \`{\` / \`[\` with no quoting involved at all.
  3. **The document's still-undecided first content line, when that
     line does NOT begin with \`{\` or \`[\`** (§ 5.0.1) — a first line
     that DOES begin with \`{\` or \`[\` is context 2 above, never this
     one. Rule 6's phase-1 test is purely about whether a separator
     exists; finding none for any reason — no colon at all, or an
     unterminated quoted segment swallowing the rest of the line — is
     simply not a pair candidate, exactly as today. Root-kind
     detection falls through to rule 7: the line is an ordinary
     Array-root String item, quote character and all, with no error.
     \`'tis the season\` (no colon anywhere) is unaffected by quoting at
     all; \`'tis the season: fa\` — which before 0.7.0's quoted-key
     addition parses as an Object with the bare key \`'tis the season\`
     (an unescaped \`'\` was always an ordinary \`<key-char>\`) — is a
     root-Array String item under the new grammar instead (a breaking
     change; see Appendix A). A String array item that happens to need
     a leading quote character AND an unescaped colon to remain
     unambiguous on re-read can always use the raw-marker form
     (\`:: 'tis the season: fa\`, § 5.4 rule 1) — the existing escape
     hatch for exactly this class of ambiguity, unchanged by this
     addition.
- **Per-segment participation in dotted paths.** Quoting applies per
  segment, not to the whole key: \`a."b.c".d: 1\` is the three-segment
  path \`["a", "b.c", "d"]\`, expanding (§ 5.3.2) to
  \`{a: {"b.c": {d: 1}}}\` — the dot inside the quoted middle segment is
  ordinary content and does not itself split further, exactly as
  \`\\.\` already keeps a dot inside a bare segment from splitting.
- **Equality is on decoded content.** § 5.5's \`DuplicateKey\` check
  compares the fully decoded effective key, independent of which form
  produced it: a pair keyed \`"a.b"\` and a pair keyed \`a\\.b\` in the
  same Object name the same single-segment key \`a.b\` and collide.
- **Inline pairs.** \`<inline-pair>\` (§ 5.8.2) uses the same \`<key>\`
  production, so quoted keys are recognised identically inside inline
  objects: \`{"a}b": 1, c: 2}\` is \`{"a}b": 1, "c": 2}\` — the \`}\` inside
  the quoted key is ordinary content, not the inline object's closing
  brace, because it is read while still inside the \`<quoted-segment>\`
  before the key-position scan ever reaches the position where an
  inline-object-closing \`}\` would be recognised. This is the same
  opacity the separator/dot scan already has (§ 4) applied to the
  bracket-balance test every "is this line a **closed** inline
  compound, or **unterminated**" determination already performs — the
  first-content-line shape test of § 5.0.1 rules 2–3, and the general
  balanced-content check behind \`UnterminatedInlineCompound\` /
  \`MalformedInlineCompound\` (§ 5.8.5, § 6.11, § 6.12) — all of which
  already treat an escaped bracket (\`\\{\`, \`\\}\`, \`\\[\`, \`\\]\`) as
  non-structural; a bracket inside a quoted key segment is opaque to
  bracket-balance counting for the identical reason an escaped one is:
  it is read as ordinary content, before the scan reaches a position
  where it could be recognised as a structural delimiter at all. A
  top-level \`{"a}b": 1, c: 2}\` is therefore still \`§ 5.0.1\` rule 2's
  closed inline object (the \`}\` inside the quoted key does not
  prematurely close it), and its canonical form is the fully expanded
  root-level pair list of § 5.9.3, exactly as any other top-level
  inline object's would be.

`,
  ru: `- **Только ключи.** Квотирование (весь этот § 5.3.3) применяется
  только к сегментам ключа — производству \`<key>\` § 4. Символ
  кавычки в любой позиции ЗНАЧЕНИЯ — inline-скаляр, многострочная
  строка, элемент массива — обычное содержимое без особого смысла:
  он никогда не открывает \`<quoted-segment>\`, никогда не является
  разделителем и никогда там не обрезается и не разворачивается.
  \`{a: "b"}\` — это пара \`a\`, отображённая на трёхсимвольную String
  \`"b"\` (кавычка, \`b\`, кавычка — обычный голый inline-скаляр, по уже
  существующим правилам типизации скаляра § 5.2), а не развёрнутая
  String \`b\`: 0.7.0 не добавляет JSON-подобное квотирование значений.
  Это НЕ означает, что правила экранирования значений не изменились,
  однако: три кавычечных escape § 3.7 (\`\\"\`, \`\\'\`, \`\` \\\` \`\`)
  распознаются в любом escape-осведомлённом контексте одинаково,
  включая inline-скалярные значения, — точно так же, как уже \`\\.\` /
  \`\\:\` — так что обработка escape в inline-значении теперь также
  должна принимать все три написания кавычечного escape, каждое из
  которых декодируется в свой литеральный символ кавычки.
  Неизменным остаётся лишь то, что сырые, неэкранированные символы
  кавычки в значении по-прежнему не несут структурного смысла и
  никогда не являются разделителями.
- **Позиционное правило.** Символ кавычки открывает
  \`<quoted-segment>\` тогда и только тогда, когда он является первой
  кодовой точкой сырого текста сегмента *после* той же обрезки
  граничных пробелов, которую § 4 уже применяет к каждому сегменту.
  Этот позиционный тест заново применяется в начале КАЖДОГО сегмента,
  без исключений — включая сегмент, непосредственно следующий за
  неэкранированной точкой: точка всё равно начинает новый сегмент
  (§ 5.3.2), и символ кавычки, стоящий сразу после неё, является
  первой кодовой точкой этого нового сегмента, поэтому он открывает
  там \`<quoted-segment>\` точно так же, как и в самом начале всего
  ключа. Именно поэтому \`a."b.c".d: 1\` — это трёхсегментный путь
  \`["a", "b.c", "d"]\` (пример точечного пути § 4; пункт «Участие
  по сегментам в точечных путях» ниже), а не остановка на двух
  сегментах. Везде, где символ кавычки НЕ является первой кодовой
  точкой сегмента — в середине сегмента, или после другого
  непробельного содержимого в том же сегменте, — он является обычным
  \`<key-char>\`, точно как в любой версии до добавления квотированных
  ключей в 0.7.0: \`don't: 1\` и \`a"b: 1\` не затронуты, а \`port": 1\`
  по-прежнему является пятисимвольным голым ключом \`port"\`.
- **Содержимое не обрезается.** В отличие от \`<bare-segment>\`,
  пробел непосредственно внутри разделителей \`<quoted-segment>\` —
  обычное содержимое, сохраняемое дословно с обеих границ: \`" a "\`
  декодируется в трёхкодоточечный ключ пробел-\`a\`-пробел (не в
  односимвольный ключ \`a\`). Именно поэтому квотированный сегмент из
  одних пробелов (\`" "\`) — валидный однопробельный ключ, а не
  \`EmptyKey\` (§ 6.5) — в отличие от \`<bare-segment>\` из одних
  пробелов, который обрезается до ничего и ЯВЛЯЕТСЯ \`EmptyKey\`.
- **Экранирование внутри разделителей.** Полная таблица escape из
  четырнадцати записей (§ 3.7) применяется идентично к \`<dq-token>\` /
  \`<sq-token>\` / \`<bt-token>\` и к \`<key-token>\` из \`<bare-segment>\` —
  отдельной, меньшей таблицы для квотированного содержимого нет.
  Практическое различие — какие сырые байты являются структурными:
  внутри \`<quoted-segment>\` \`.\` / \`:\` / \`,\` / \`{\` / \`}\` / \`[\` / \`]\` и
  два символа кавычек, ОТЛИЧНЫХ от собственного разделителя сегмента,
  — всё это обычное содержимое, не требующее вовсе никакого
  экранирования (хотя их именованные escape — \`\\.\`, \`\\:\` и т. д. —
  всё равно работают, если использованы, декодируясь в тот же
  литеральный байт, точно так же, как \`\\.\`/\`\\:\` уже безвредно валидны
  внутри inline-скалярного значения, где точка и двоеточие тоже не
  структурны); только сам разделитель структурен, и только внутри
  своего собственного сегмента — \`\` \`it's "quoted"\` \`\` — это
  однозначное тринадцатикодоточечное содержимое \`it's "quoted"\`,
  потому что терминатор фиксирован ОТКРЫВАЮЩИМ обратным апострофом:
  ни \`'\`, ни \`"\` его не закрывают. Сырой управляющий байт или DEL
  запрещён внутри \`<quoted-segment>\` точно так же, как внутри
  \`<bare-segment>\` (исключения \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\`
  из § 4) — квотирование ослабляет требования к экранированию только
  для СТРУКТУРНЫХ байтов, а не отдельное правило формата «в ключах
  нет невидимых байтов»; управляющий байт или DEL по-прежнему
  представимы только через \`\\uXXXX\`.
- **После закрывающего разделителя в том же сегменте ничего не может
  следовать.** После закрывающего разделителя \`<quoted-segment>\`
  перед следующей \`<unescaped-dot>\` или разделителем пары может
  стоять только пробел (уже поглощаемый обрезкой — см. § 4). Любое
  другое содержимое там — \`"a"b: 1\`, \`"a" "b": 1\` — это ошибка
  \`InvalidKey\` (§ 6.4): не существует формы, сочетающей квотированное
  содержимое с дальнейшим голым или квотированным содержимым внутри
  одного сегмента; если задуманы два отдельных фрагмента, пишите два
  точечных сегмента (\`"a"."b": 1\`).
- **Незакрытые квотированные сегменты.** Если символ кавычки
  открывает сегмент, а подходящий неэкранированный закрывающий
  разделитель не найден до конца строки, правило сканирования
  разделителя § 4 просто не находит на этой строке разделителя
  вообще — на уровне сканирования это неотличимо от строки, вовсе не
  содержащей \`:\`. Сканирование баланса скобок точно так же
  непрозрачно для кавычек (пункт «Inline-пары» ниже): незавершённый
  квотированный сегмент поглощает всё до конца строки, и двоеточия, и
  скобки. Каждая строка попадает ровно в один из следующих трёх
  контекстов, и исход целиком определяется тем, в какой именно:
  1. **Обычная многострочная pair line внутри уже установленного
     Object.** Каждая строка, диспетчеризованная как pair line по
     правилу 8 § 5.1 — внутри уже установленного Object, включая тело
     top-level Object после его установления — требует разделителя;
     его отсутствие всегда ошибка. Когда конкретная причина —
     незакрытый квотированный сегмент, диагноз — более конкретный
     \`UnterminatedQuotedKey\` (§ 6.16), а не общий \`MissingSeparator\`
     (§ 6.6), который дала бы обычная строка без двоеточия.
  2. **Позиция inline-ключа внутри \`{...}\` (§ 5.8.2) — включая первую
     содержательную строку, саму начинающуюся с \`{\` или \`[\`**,
     которую правила 2–5 § 5.0.1 маршрутизируют по ведущей
     скобке/фигурной скобке ещё до того, как вообще опробован тест
     кандидата-пары правила 6. Здесь исход определяется балансом
     скобок, а не сканированием разделителя: незакрытый квотированный
     сегмент делает всё от открывающей кавычки до конца строки
     непрозрачным и для подсчёта баланса скобок тоже, так что \`}\` /
     \`]\`, встреченный только *внутри* зоны действия незакрытого
     сегмента, не считается подходящим закрывающим. \`{"a: 1}\` поэтому
     не закрывается по правилу 2 (незакрытая \`"\` поглощает остаток
     строки, включая закрывающую фигурную скобку) и не является
     одиночной \`{\` по правилу 4; она попадает в примечание после
     правил 2–5 § 5.0.1, диагностируется как \`UnterminatedInlineCompound\`
     (§ 6.11) — никогда не \`MalformedInlineCompound\` (§ 6.12
     применяется только к структурному дефекту ВНУТРИ уже
     ЗАКРЫТОГО составного значения, а это составное значение
     никогда не закрывается: поглощённый закрывающий символ
     означает, что на строке вообще не найдено подходящего \`}\` / \`]\`)
     и никогда не \`UnterminatedQuotedKey\` (§ 6.16 явно исключает
     этот контекст):
     дефект на уровне составного значения — вот что читатель реально
     может увидеть и исправить, и нет отдельного дефекта «ключ внутри
     тоже был незакрыт», который нужно было бы называть поверх него.
     Это существующий диагностический путь, не изменённый
     квотированными ключами; квотирование лишь добавляет ещё один
     способ, которым строка может не сбалансироваться по скобкам,
     наряду с уже незакрытыми \`{\` / \`[\` вовсе без квотирования.
  3. **Ещё не решённая первая содержательная строка документа, когда
     эта строка НЕ начинается с \`{\` или \`[\`** (§ 5.0.1) — первая
     строка, которая ДЕЙСТВИТЕЛЬНО начинается с \`{\` или \`[\`, — это
     контекст 2 выше, никогда не этот. Тест фазы 1 правила 6
     исключительно о том, существует ли разделитель; его отсутствие
     по любой причине — вовсе нет двоеточия, или незакрытый
     квотированный сегмент, поглотивший остаток строки, — просто не
     является кандидатом в пару, точно как сегодня. Определение вида
     корня проваливается к правилу 7: строка — обычный элемент String
     корня-Array, вместе с символом кавычки, без ошибки. \`'tis the
     season\` (вовсе без двоеточия) квотированием никак не затронута;
     \`'tis the season: fa\` — которая до добавления квотированных
     ключей в 0.7.0 разбиралась как Object с голым ключом \`'tis the
     season\` (неэкранированная \`'\` всегда была обычным \`<key-char>\`)
     — теперь при новой грамматике является элементом String
     корня-Array (ломающее изменение; см. Приложение A). Элемент
     String массива, которому случайно нужны и ведущий символ
     кавычки, И неэкранированное двоеточие, чтобы остаться
     однозначным при повторном чтении, всегда может использовать
     форму raw-маркера (\`:: 'tis the season: fa\`, правило 1 § 5.4) —
     существующий escape-хатч именно для этого класса
     неоднозначности, не изменённый этим добавлением.
- **Участие по сегментам в точечных путях.** Квотирование применяется
  по сегментам, а не ко всему ключу: \`a."b.c".d: 1\` — это
  трёхсегментный путь \`["a", "b.c", "d"]\`, разворачивающийся
  (§ 5.3.2) в \`{a: {"b.c": {d: 1}}}\` — точка внутри квотированного
  среднего сегмента — обычное содержимое и сама по себе далее не
  разделяет, точно так же, как \`\\.\` уже не даёт точке внутри голого
  сегмента разделять его.
- **Равенство — по декодированному содержимому.** Проверка
  \`DuplicateKey\` § 5.5 сравнивает полностью декодированный
  эффективный ключ независимо от того, какая форма его произвела:
  пара с ключом \`"a.b"\` и пара с ключом \`a\\.b\` в одном и том же
  Object называют один и тот же односегментный ключ \`a.b\` и
  сталкиваются.
- **Inline-пары.** \`<inline-pair>\` (§ 5.8.2) использует то же
  производство \`<key>\`, так что квотированные ключи распознаются
  внутри inline-объектов идентично: \`{"a}b": 1, c: 2}\` — это
  \`{"a}b": 1, "c": 2}\` — \`}\` внутри квотированного ключа — обычное
  содержимое, а не закрывающая фигурная скобка inline-объекта, потому
  что он читается, пока ещё внутри \`<quoted-segment>\`, до того как
  сканирование позиции ключа вообще достигает позиции, где закрывающая
  \`}\` inline-объекта была бы распознана. Это та же непрозрачность,
  которую сканирование разделителя/точки (§ 4) уже применяет к тесту
  баланса скобок в каждом определении «это строка **закрытого**
  inline-составного или **незакрытого**» — тест формы первой
  содержательной строки правил 2–3 § 5.0.1 и общая проверка баланса
  содержимого позади \`UnterminatedInlineCompound\` / \`MalformedInlineCompound\`
  (§ 5.8.5, § 6.11, § 6.12) — все они уже трактуют экранированную
  скобку (\`\\{\`, \`\\}\`, \`\\[\`, \`\\]\`) как неструктурную; скобка внутри
  квотированного сегмента ключа непрозрачна для подсчёта баланса
  скобок по идентичной причине, что и экранированная: она читается
  как обычное содержимое до того, как сканирование достигает позиции,
  где она вообще могла бы быть распознана как структурный разделитель.
  Top-level \`{"a}b": 1, c: 2}\` поэтому по-прежнему является закрытым
  inline-объектом по правилу 2 § 5.0.1 (\`}\` внутри квотированного
  ключа не закрывает его преждевременно), и его каноническая форма —
  полностью развёрнутый список пар корневого уровня § 5.9.3, точно
  как у любого другого top-level inline-объекта.

`,
  zh: `- **仅限键。** 加引号(整个 § 5.3.3)只适用于键段 —— § 4 的
  \`<key>\` 产生式。任何值位置(inline 标量、多行字符串、数组项)
  中的引号字符都是没有特殊含义的普通内容:它绝不会开启
  \`<quoted-segment>\`,绝不是分隔符,在那里也绝不会被剥离或展开。
  \`{a: "b"}\` 是键 \`a\` 映射到三字符 String \`"b"\`(引号、\`b\`、引号
  —— 一个普通的裸 inline 标量,依据 § 5.2 既有的标量类型判定
  规则),而不是展开后的 String \`b\`:0.7.0 并未加入 JSON 风格的
  值加引号。但这并不意味着值的 escape 规则未变:§ 3.7 的三个引号
  escape(\`\\"\`、\`\\'\`、\`\` \\\` \`\`)在每一个 escape 感知的上下文中
  都被同等识别,包括 inline 标量值 —— 正如 \`\\.\` / \`\\:\` 早已如此
  —— 因此 inline 值的 escape 处理现在也必须接受全部三种引号
  escape 写法,每一种都解码为其字面引号字符。唯一不变的是:值中
  裸的、未 escape 的引号字符仍然不带结构性含义,也绝不是分隔符。
- **位置规则。** 当且仅当引号字符是某段原始文本在 § 4 已应用的
  边界空白修剪*之后*的首个码点时,它才开启一个 \`<quoted-segment>\`。
  这一位置测试在每个段的开头都重新应用,没有例外 —— 包括紧跟在
  未 escape 的点之后的段:该点仍然开启一个新段(§ 5.3.2),紧随其
  后的引号字符就是这个新段自身的首个码点,因此它在那里开启
  \`<quoted-segment>\`,与它出现在整个键最开头时完全一样。这正是
  为什么 \`a."b.c".d: 1\` 是三段路径 \`["a", "b.c", "d"]\`(§ 4 的
  点分路径示例;见下文「点分路径中的逐段参与」一条),而不是止步
  于两段。凡引号字符不是某段首个码点的地方 —— 段中间,或同一段内
  其他非空白内容之后 —— 它都是普通的 \`<key-char>\`,与 0.7.0 加入
  带引号的键之前的每个版本完全一样:\`don't: 1\` 与 \`a"b: 1\` 不受
  影响,\`port": 1\` 仍是五字符裸键 \`port"\`。
- **内容不被修剪。** 与 \`<bare-segment>\` 不同,\`<quoted-segment>\`
  分隔符内部紧邻的空白是普通内容,在两侧都逐字保留:\`" a "\`
  解码为三码点键“空格-\`a\`-空格”(不是单字符键 \`a\`)。这就是为什么
  全空白的 quoted 段(\`" "\`)是有效的单空格键,而不是 \`EmptyKey\`
  (§ 6.5)—— 与之相反,全空白的 \`<bare-segment>\` 会被修剪至空,
  确实是 \`EmptyKey\`。
- **分隔符内部的 escape。** 完整的十四条 escape 表(§ 3.7)对
  \`<dq-token>\` / \`<sq-token>\` / \`<bt-token>\` 与 \`<bare-segment>\`
  的 \`<key-token>\` 一视同仁地适用 —— 不存在另一张更小的、专供
  quoted 内容使用的表。实际差异在于哪些裸字节是结构性的:在
  \`<quoted-segment>\` 内部,\`.\` / \`:\` / \`,\` / \`{\` / \`}\` / \`[\` / \`]\`
  以及除段自身分隔符之外的另外两个引号字符,全都是普通内容,完全
  不需要 escape(即便使用它们的命名 escape —— \`\\.\`、\`\\:\` 等 ——
  仍然有效,解码为同一个字面字节,正如 \`\\.\`/\`\\:\` 在 inline 标量
  值里点和冒号同样非结构性时早已无害地有效一样);只有分隔符本身
  是结构性的,且仅在其自身所在的段内 —— \`\` \`it's "quoted"\` \`\`
  是明确无歧义的十三码点内容 \`it's "quoted"\`,因为终止符由*开启*
  的反引号固定:\`'\` 与 \`"\` 都不能关闭它。裸控制字节或 DEL 在
  \`<quoted-segment>\` 内部同样被禁止,正如在 \`<bare-segment>\`
  内部一样(§ 4 的 \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\` 排除
  项)—— 加引号只放宽了哪些结构性字节需要 escape,并不放宽格式
  另一条「键中不允许裸不可见字节」的规则;控制字节或 DEL 仍然
  只能通过 \`\\uXXXX\` 表示。
- **关闭分隔符之后,同一段内不得跟随任何内容。** \`<quoted-segment>\`
  的关闭分隔符之后,在下一个 \`<unescaped-dot>\` 或对分隔符之前,
  只能出现空白(已由修剪吸收 —— 见 § 4)。那里出现的任何其他内容
  —— \`"a"b: 1\`、\`"a" "b": 1\` —— 是 \`InvalidKey\` 错误(§ 6.4):
  不存在将 quoted 内容与同一段内进一步的裸内容或 quoted 内容组合
  的形式;若确实想表达两个独立片段,请改写成两个点分段
  (\`"a"."b": 1\`)。
- **未终止的 quoted 段。** 若引号字符开启了一个段,而在行末之前
  未找到匹配的未 escape 关闭分隔符,§ 4 的分隔符扫描规则在该行上
  就是找不到任何分隔符 —— 在扫描层面,这与完全不含 \`:\` 的行没有
  区别。括号平衡扫描同样对引号不透明(见下文「inline pair」一条):
  进行中的 quoted 段会吞掉直到行末的一切,冒号与括号皆然。每一行
  恰好落入以下三种情形之一,结果完全由具体是哪一种决定:
  1. **已建立 Object 内部的普通多行 pair line。** § 5.1 规则 8
     分发为 pair line 的每一行 —— 在已建立的 Object 内部,包括
     一旦建立的 top-level Object body —— 都要求有分隔符;找不到
     总是错误。当具体原因是未终止的 quoted 段时,诊断为更具体的
     \`UnterminatedQuotedKey\`(§ 6.16),而非普通无冒号行会引发的
     通用 \`MissingSeparator\`(§ 6.6)。
  2. **\`{...}\` 内的 inline 键位置(§ 5.8.2)—— 包括本身以 \`{\`
     或 \`[\` 开头的首条内容行**,§ 5.0.1 规则 2–5 会依据前导括号 /
     花括号将其路由,早于规则 6 的 pair 候选测试被尝试之前。这里
     的结果取决于括号平衡,而非分隔符扫描:未终止的 quoted 段会
     使从开启引号到行末的一切对括号平衡计数同样不透明,因此只
     出现在未终止段范围*内部*的 \`}\` / \`]\` 不算作匹配的关闭符。
     \`{"a: 1}\` 因此不会按规则 2 关闭(未终止的 \`"\` 吞掉了行的
     剩余部分,包括花括号),按规则 4 也不是单独的 \`{\`;它落入
     § 5.0.1 规则 2–5 之后的说明,被诊断为
     \`UnterminatedInlineCompound\`(§ 6.11)—— 绝不是
     \`MalformedInlineCompound\`(§ 6.12 仅适用于已**关闭**复合值
     内部的结构性缺陷,而这个复合值从未关闭:被吞掉的关闭符
     意味着该行根本没有找到匹配的 \`}\` / \`]\`),也绝不是
     \`UnterminatedQuotedKey\`(§ 6.16 明确排除此上下文):复合值层面的缺陷才是读者实际能看到并
     修复的东西,没有必要在其之上再命名一个「内部的键也未终止」
     的独立缺陷。这是一条既有的诊断路径,不因带引号的键而改变;
     加引号只是新增了一种行无法按括号配平的方式,与本就未终止、
     完全不涉及加引号的 \`{\` / \`[\` 并列。
  3. **文档尚未判定的首条内容行,且该行不以 \`{\` 或 \`[\` 开头时**
     (§ 5.0.1)—— 确实以 \`{\` 或 \`[\` 开头的首行属于上面的情形 2,
     绝不是这一种。规则 6 阶段一的测试只关心分隔符是否存在;无论
     出于什么原因找不到 —— 完全没有冒号,或未终止的 quoted 段吞掉
     了行的剩余部分 —— 都只是不构成 pair 候选,与今天完全一样。
     根类型判定落入规则 7:该行是普通的 Array 根 String 项,连同
     其引号字符,没有错误。\`'tis the season\`(完全没有冒号)完全
     不受加引号影响;\`'tis the season: fa\` —— 在 0.7.0 加入带引号
     的键之前,它被解析为带裸键 \`'tis the season\` 的 Object
     (未 escape 的 \`'\` 一直都是普通 \`<key-char>\`)—— 在新语法下
     变成了根 Array 的 String 项(一项破坏性变更;见附录 A)。若
     某个 String 数组项恰好既需要开头的引号字符、又需要未 escape
     的冒号才能在重读时保持无歧义,始终可以使用 raw-marker 形式
     (\`:: 'tis the season: fa\`,§ 5.4 规则 1)—— 这正是为这一类
     歧义准备的既有 escape 出口,不受此次新增影响。
- **点分路径中的逐段参与。** 加引号按段生效,而非对整个键生效:
  \`a."b.c".d: 1\` 是三段路径 \`["a", "b.c", "d"]\`,展开(§ 5.3.2)
  为 \`{a: {"b.c": {d: 1}}}\` —— 被引号包裹的中间段内的点是普通
  内容,自身不会再进一步分割,正如 \`\\.\` 早已使裸段内的点不再
  分割一样。
- **相等性基于解码后的内容。** § 5.5 的 \`DuplicateKey\` 检查比较
  完全解码后的有效键,与产生该键的是哪种形式无关:同一 Object 内
  键为 \`"a.b"\` 的 pair 与键为 \`a\\.b\` 的 pair 命名的是同一个单段
  键 \`a.b\`,二者冲突。
- **inline pair。** \`<inline-pair>\`(§ 5.8.2)使用同一个 \`<key>\`
  产生式,因此带引号的键在 inline 对象内部被同样识别:
  \`{"a}b": 1, c: 2}\` 就是 \`{"a}b": 1, "c": 2}\` —— quoted 键内的
  \`}\` 是普通内容,而不是 inline 对象的关闭花括号,因为它是在仍处于
  \`<quoted-segment>\` 内部时被读取的,早于键位置扫描到达本可识别
  inline 对象关闭 \`}\` 的位置之前。这与分隔符/点扫描(§ 4)已经
  施加于括号平衡测试上的不透明性相同 —— § 5.0.1 规则 2–3 的首条
  内容行形状测试,以及 \`UnterminatedInlineCompound\` /
  \`MalformedInlineCompound\`(§ 5.8.5、§ 6.11、§ 6.12)背后的通用
  平衡内容检查 —— 二者都已经把经过 escape 的括号(\`\\{\`、\`\\}\`、
  \`\\[\`、\`\\]\`)视为非结构性;quoted 键段内部的括号对括号平衡计数
  不透明的原因与经过 escape 的括号完全相同:它作为普通内容被
  读取,早于扫描到达本可将其识别为结构性分隔符的位置。Top-level
  的 \`{"a}b": 1, c: 2}\` 因此依然是 § 5.0.1 规则 2 意义上的已关闭
  inline 对象(quoted 键内的 \`}\` 不会使其提前关闭),其规范形式是
  § 5.9.3 完全展开后的根级 pair 列表,与任何其他 top-level inline
  对象完全一样。

`,
};
