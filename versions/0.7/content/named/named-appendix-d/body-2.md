>>>>> lang=en
1. **A leading byte-order mark (U+FEFF) is now stripped from the document.**
   A 0.7.0-conforming parser MUST skip exactly one U+FEFF when it is the
   document's first code point, and a canonical writer MUST NOT emit one.
   In 0.6.x this behavior was unspecified, so a document that relied on a
   leading U+FEFF as content needs migration: move it away from the document
   start or revise the expected value. A U+FEFF anywhere else remains ordinary
   content.
2. **`(…)` multi-line strings no longer preserve trailing whitespace
   (§ 3.3 — any of the 25 code points, not just space/tab) on each
   content line.** If a document relies on trailing whitespace inside
   a `(…)` block being preserved verbatim, switch that block to
   `((…))`, which keeps both edges byte-for-byte in both 0.6.x and
   0.7.0.
3. **A key segment's leading, unescaped `"`, `'`, or `` ` `` now opens
   a quoted segment (§ 5.3.3, § 10.7) instead of being ordinary key
   content.** In 0.6.x, an Object pair whose key began with one of
   these three characters kept that character as literal key text —
   e.g. `"port": 1` named the key `"port"`, quotes included. In
   0.7.0, the same line either names the shorter key `port` (if a
   matching closing quote character is also present before the pair
   separator) or, if there is no matching closer, either raises
   `UnterminatedQuotedKey` (§ 6.16, when the root is already known to
   be an Object) or falls through to a root-level Array String item
   (§ 5.3.3 gives the exact, context-dependent rule). **To keep a
   0.6.x document's old meaning**, escape that leading quote
   character — `\"`, `\'`, `` \` ``, or `\uXXXX` — so it reads as
   ordinary bare key content rather than a quoted-segment opener.
   In 0.6.x, the `::` raw-marker form (§ 5.4 rule 1) was the explicit way
   to force a root-level Array item to be read as a literal String when it
   deliberately used a matched pair of quote characters around a body with
   a pair-shaped colon (e.g. `:: "a: b"`). Without the marker, 0.6.x root
   detection would mistake `"a: b"` for an Object pair because the colon
   is followed by separator whitespace. In 0.7.0, the matched quoted-segment
   scan recognizes the whole item directly, so the raw marker is no longer
   needed: `"a: b"` has the same literal String meaning.

>>>>> lang=ru
1. **Ведущий маркер порядка байтов (U+FEFF) теперь удаляется из документа.**
   Conforming-парсер 0.7.0 MUST пропустить ровно один U+FEFF, если это
   первая кодовая точка документа, а canonical writer MUST NOT выводить его.
   В 0.6.x это поведение не было определено, поэтому документ, который
   использовал ведущий U+FEFF как содержимое, требует миграции: переместите
   его с начала документа или измените ожидаемое значение. U+FEFF в любом
   другом месте остаётся обычным содержимым.
2. **Многострочные строки `(…)` больше не сохраняют замыкающие
   пробелы в каждой содержательной строке.** Если документ полагается
   на то, что замыкающий пробельный символ (§ 3.3 — любой из 25
   кодовых точек, не только пробел/табуляция) внутри блока `(…)`
   сохраняется verbatim, переключите этот блок на `((…))`, которая
   сохраняет обе границы байт-в-байт и в 0.6.x, и в 0.7.0.
3. **Ведущий, неэкранированный `"`, `'` или `` ` `` сегмента ключа
   теперь открывает квотированный сегмент (§ 5.3.3, § 10.7) вместо
   того, чтобы быть обычным содержимым ключа.** В 0.6.x пара Object,
   чей ключ начинался с одного из этих трёх символов, сохраняла этот
   символ как литеральный текст ключа — например, `"port": 1` называла
   ключ `"port"`, включая кавычки. В 0.7.0 та же строка либо называет
   более короткий ключ `port` (если подходящий закрывающий символ
   кавычки тоже присутствует до разделителя пары), либо, при
   отсутствии подходящего закрывающего символа, либо вызывает
   `UnterminatedQuotedKey` (§ 6.16, когда корень уже известен как
   Object), либо проваливается в элемент String корневого Array
   (§ 5.3.3 даёт точное, зависящее от контекста правило). **Чтобы
   сохранить прежний смысл документа 0.6.x**, экранируйте этот
   ведущий символ кавычки — `\"`, `\'`, `` \` `` или `\uXXXX` — так,
   чтобы он читался как обычное голое содержимое ключа, а не как
   открывающий символ квотированного сегмента. В 0.6.x форма raw-маркера
   `::` (правило 1 § 5.4) была явным способом заставить элемент
   корневого Array читаться как литеральная String, когда его тело
   намеренно заключалось в согласованную пару кавычек и содержало
   двоеточие в форме пары (например, `:: "a: b"`). Без маркера обнаружение типа
   корня в 0.6.x приняло бы `"a: b"` за пару Object, поскольку после
   двоеточия стоит разделительный пробел. В 0.7.0 сканирование
   согласованного quoted-сегмента распознаёт весь элемент напрямую,
   поэтому raw-маркер больше не нужен: `"a: b"` имеет то же значение
   литеральной String.

>>>>> lang=zh
1. **前导字节顺序标记(U+FEFF)现在会从文档中剥除。** 0.7.0
   conforming parser MUST 在 U+FEFF 是文档第一个码点时恰好跳过一个,
   canonical writer MUST NOT 输出它。0.6.x 未规定该行为,因此若文档
   依赖文档开头的 U+FEFF 作为内容,需要迁移:将其移离文档开头或修正
   预期值。其它位置的 U+FEFF 仍是普通内容。
2. **`(…)` 多行字符串不再保留每个内容行的尾部空白。** 若某文档依赖
   `(…)` 块内的尾部空白码点(§ 3.3 —— 25 个码点中的任意一个,
   不仅是空格/制表符)被逐字节保留,请将该块改为
   `((…))`——它在 0.6.x 与 0.7.0 中都会将两侧边界逐字节保留。
3. **键段前导的、未 escape 的 `"`、`'` 或 `` ` `` 现在会开启一个
   quoted 段(§ 5.3.3、§ 10.7),而不再是普通的键内容。** 在
   0.6.x 中,键以这三个字符之一开头的 Object pair 会把该字符保留
   为字面键文本 —— 例如 `"port": 1` 命名的键是 `"port"`,包含
   引号。在 0.7.0 中,同一行要么命名更短的键 `port`(如果在对
   分隔符之前也存在匹配的关闭引号字符),要么,若没有匹配的关闭符,
   要么引发 `UnterminatedQuotedKey`(§ 6.16,当根已知为
   Object 时),要么落入根级 Array String 项(§ 5.3.3 给出精确的、
   依上下文而定的规则)。**为保留 0.6.x 文档的原有含义**,请对这个
   前导引号字符做 escape —— `\"`、`\'`、`` \` `` 或 `\uXXXX` ——
   使其被读作普通的裸键内容,而非 quoted 段的开启符。`::`
   在 0.6.x 中,raw-marker 形式(§ 5.4 规则 1)是显式强制根级 Array
   项被读作字面 String 的方式,适用于该项故意以一对匹配的引号字符
   包围一个含有 pair 形状冒号的 body(例如 `:: "a: b"`)。如果没有标记,
   0.6.x 的根检测会把 `"a: b"` 误认为 Object pair,因为冒号后跟
   分隔空白。在 0.7.0 中,匹配 quoted 段扫描会直接识别整个项,因此
   不再需要 raw marker:`"a: b"` 具有相同的字面 String 含义。

4. **inline 标量中的已识别 escape 现在会在关键字或数字分类之前强制
   为 String(§ 3.7、§ 5.2)。** 在 0.6.x 中,像 `1\.0` 这样的体可以先
   解码再分类为 Float;在 0.7.0 中它是 String。该规则适用于每个已
   识别的 escape,包括 `\.`、`\:` 以及三个引号 escape
   `\"`、`\'` 与 `` \` ``,即使解码出的字节不具有结构性作用。
5. **在声明 Float 域中非有限的浮点字面量现在回退为 String
   (§ 5.2 规则 14)。** 在 0.6.x 中,binary64 后端上的 `1e9999` 之类
   字面量可能成为非有限 Float;在 0.7.0 中它是 String。下溢到有限的
   带符号零仍然是 Float。

