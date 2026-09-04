export default {
  en: `                    Examples:
                    - \`a\\.b: v\`     → key "a.b", value "v" (flat, no nesting)
                    - \`a\\:b: v\`    → key "a:b", value "v"
                    - \`a\\:: v\`     → key "a:", value "v" (escaped colon, then the plain \`:\` separator)
                    - \`x.y\\.z: v\`  → path ["x", "y.z"], value "v"
                                     ({"x": {"y.z": "v"}})
                    - \`path\\\\to: v\` → key "path\\to", value "v"
                    - a key segment spelling the dot as \`\\u\` followed
                      by the four hex digits for \`U+002E\` decodes
                      identically to \`\\.\` above (flat key, no
                      nesting) — § 3.7.1's rule that any recognised
                      escape is never re-examined as a structural
                      delimiter applies the same way regardless of
                      which of the fourteen forms produced the byte
                    - \`"a.b": v\`    → key "a.b", value "v" (flat, no
                                       nesting — same Value as \`a\\.b: v\`
                                       above; § 5.3.3)
                    - \`a."b.c".d: v\` → path ["a", "b.c", "d"], value "v"
                                       ({"a": {"b.c": {"d": "v"}}}) —
                                       contrast \`x.y\\.z: v\` above: the
                                       middle segment is quoted instead
                                       of bare-with-escape, same result

<sep-end>       ::= 1*ws | &line-end              ; ≥1 whitespace code point, or the line end
<value-part-opt> ::= <value-start> | ""             ; value-part is optional; "" ⇒ empty String
<value-start>   ::= "{" (ws) "}" (ws)                ; empty inline object
                  | "[" (ws) "]" (ws)                ; empty inline array
                  | "{" (ws) <inline-pair-list> (ws) "}" ; inline object (§ 5.8)
                  | "[" (ws) <inline-item-list> (ws) "]" ; inline array (§ 5.8)
                  | "{" (ws) &line-end                ; open object (multi-line body)
                  | "[" (ws) &line-end                ; open array (multi-line body)
                  | "(" (ws) &line-end                ; open multiline string (stripped)
                  | "((" (ws) &line-end               ; open multiline string (verbatim)
                  | "()" (ws)                        ; empty inline (yields "")
                  | "(())" (ws)                      ; empty inline (yields "")
                  | <scalar-body>                    ; scalar value, dispatched per § 5.2

<scalar-body>   ::= (ws) any-chars-until-line-end
                    ; trimmed; interpreted per § 5.2

<array-item-line> ::= <item-literal> | <item-inline> | <item-value>
<item-literal>  ::= (ws) "::" <sep-end> any-chars-until-line-end <line-end> ; raw string item
<item-inline>   ::= (ws) "{" (ws) <inline-pair-list> (ws) "}" (ws) <line-end>
                  | (ws) "[" (ws) <inline-item-list> (ws) "]" (ws) <line-end>
                  | (ws) "{}" (ws) <line-end>
                  | (ws) "[]" (ws) <line-end>
<item-value>    ::= <value-start> <line-end>

<inline-pair-list> ::= <inline-pair> ( (ws) "," (ws) <inline-pair> )* ( (ws) "," )?
<inline-pair>      ::= <key> (ws) ":"  (ws) <inline-value> (ws)
                     | <key> (ws) "::" (ws) <inline-value> (ws)

<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-scalar>    ::= sequence of bytes terminated by an unescaped
                       "," / "}" / "]" or by <line-end> (which is
                       an error per § 6.11); escape sequences per
                       § 3.7 are processed; surrounding whitespace
                       is trimmed before dispatch to § 5.2

<multiline-content-line> ::= any line within an open <multiline>
                             followed by <line-end>;
                             the terminator (")" or "))") ends the block
\`\`\`

Notes on the notation:

- \`(ws)\` stands for zero or more line-bounded \`ws\` code points defined
  above; LF and CR are excluded.
- \`1*ws\` stands for **one or more** of those same line-bounded code points.
- \`<sep-end>\` stands for "at least one line-bounded whitespace code point,
  or the end of the line". It is used after the multi-line pair separators (\`:\`,
  \`::\`). Writing \`key:value\` (no whitespace, no EOL after the
  separator) is a syntax error in the multi-line pair form — see
  § 6.10. Inline-compound pairs (§ 5.8) do not require whitespace
  after \`:\` / \`::\`.
- \`&line-end\` is a zero-width positive lookahead for \`<line-end>\`; it
  matches either eol or EOF without consuming it. Every line production
  consumes exactly one \`<line-end>\`, so a final line need not have a
  terminator byte. EOF is a terminal zero-byte marker: it may terminate only
  the final line production and the \`<line-end>\` at EOF may be consumed at
  most once; this prevents \`<line>*\` from repeating a zero-width \`blank\`
  production when \`(ws)=0\` at EOF.
- \`any-chars-until-line-end\` denotes zero or more source bytes and stops
  before (without consuming) \`<line-end>\`; the enclosing line production
  consumes it. The zero-length case permits an empty \`<comment-body>\` and
  an empty raw-marker \`<item-literal>\`.
- The \`<inline-value>\` alternatives are checked **left-to-right** on
  the first non-whitespace code point of the inline-value position. If that
  byte is \`{\`, the value is a nested inline object (matching one of
  the first two \`{\`-rules) and MUST close with \`}\` on the same line;
  if the byte is \`[\`, it is a nested inline array. Any other first
  byte makes the value an \`<inline-scalar>\`. The decision is taken
  once, at the start of the inline-value position; subsequent \`{\`
  or \`[\` bytes inside the inline scalar are literal data (§ 5.8.5).

`,
  ru: `                    Примеры:
                    - \`a\\.b: v\`     → ключ "a.b", значение "v" (плоский)
                    - \`a\\:b: v\`    → ключ "a:b", значение "v"
                    - \`a\\:: v\`     → ключ "a:", значение "v" (экранированное двоеточие, затем обычный разделитель \`:\`)
                    - \`x.y\\.z: v\`  → путь ["x", "y.z"], значение "v"
                                     ({"x": {"y.z": "v"}})
                    - \`path\\\\to: v\` → ключ "path\\to", значение "v"
                    - сегмент ключа, записывающий точку как \`\\u\` плюс
                      четыре hex-цифры для \`U+002E\`, декодируется
                      идентично \`\\.\` выше (плоский ключ, без вложенности)
                      — правило § 3.7.1 о том, что любая распознанная
                      escape-последовательность никогда не рассматривается
                      как структурный разделитель, применяется одинаково
                      независимо от того, какая из четырнадцати форм породила байт
                    - \`"a.b": v\`    → ключ "a.b", значение "v" (плоский,
                                       без вложенности — то же Value, что
                                       и у \`a\\.b: v\` выше; § 5.3.3)
                    - \`a."b.c".d: v\` → путь ["a", "b.c", "d"], значение
                                       "v" ({"a": {"b.c": {"d": "v"}}}) —
                                       в отличие от \`x.y\\.z: v\` выше: средний
                                       сегмент квотирован, а не голый с
                                       экранированием, но результат тот же

<sep-end>       ::= 1*ws | &line-end              ; ≥1 пробельная кодовая точка, либо конец строки
<value-part-opt> ::= <value-start> | ""             ; value-часть опциональна; "" ⇒ пустая String
<value-start>   ::= "{" (ws) "}" (ws)                ; пустой inline-объект
                  | "[" (ws) "]" (ws)                ; пустой inline-массив
                  | "{" (ws) <inline-pair-list> (ws) "}" ; inline-объект (§ 5.8)
                  | "[" (ws) <inline-item-list> (ws) "]" ; inline-массив (§ 5.8)
                  | "{" (ws) &line-end                ; открытие объекта (многострочное тело)
                  | "[" (ws) &line-end                ; открытие массива (многострочное тело)
                  | "(" (ws) &line-end                ; открытие многострочной (stripped)
                  | "((" (ws) &line-end               ; открытие многострочной (verbatim)
                  | "()" (ws)                        ; пустая inline (даёт "")
                  | "(())" (ws)                      ; пустая inline (даёт "")
                  | <scalar-body>                    ; скалярное значение, через § 5.2

<scalar-body>   ::= (ws) any-chars-until-line-end
                    ; обрезается; интерпретируется по § 5.2

<array-item-line> ::= <item-literal> | <item-inline> | <item-value>
<item-literal>  ::= (ws) "::" <sep-end> any-chars-until-line-end <line-end> ; raw-строковый элемент
<item-inline>   ::= (ws) "{" (ws) <inline-pair-list> (ws) "}" (ws) <line-end>
                  | (ws) "[" (ws) <inline-item-list> (ws) "]" (ws) <line-end>
                  | (ws) "{}" (ws) <line-end>
                  | (ws) "[]" (ws) <line-end>
<item-value>    ::= <value-start> <line-end>

<inline-pair-list> ::= <inline-pair> ( (ws) "," (ws) <inline-pair> )* ( (ws) "," )?
<inline-pair>      ::= <key> (ws) ":"  (ws) <inline-value> (ws)
                     | <key> (ws) "::" (ws) <inline-value> (ws)

<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-scalar>    ::= последовательность байтов до неэкранированного
                       "," / "}" / "]" или до <line-end> (что —
                       ошибка по § 6.11); escape-последовательности
                       по § 3.7 обрабатываются; окружающие пробелы
                       обрезаются перед классификацией по § 5.2

<multiline-content-line> ::= любая строка внутри открытого <multiline>,
                             за которой следует <line-end>;
                             терминатор (")" или "))") закрывает блок
\`\`\`

Примечания к нотации:

- \`(ws)\` — ноль или более определённых выше ограниченных строкой кодовых
  точек \`ws\`; LF и CR исключены.
- \`1*ws\` — **одна или более** тех же ограниченных строкой кодовых точек.
- \`<sep-end>\` — «как минимум одна ограниченная строкой пробельная кодовая
  точка или конец строки».
  Используется после разделителей пар многострочной формы (\`:\`,
  \`::\`). Запись \`key:value\` (без пробела, без EOL после разделителя) —
  синтаксическая ошибка в многострочной форме пары — см. § 6.10.
  Inline-пары в составных (§ 5.8) НЕ требуют пробела после \`:\` /
  \`::\`.
- \`&line-end\` — нулевой ширины положительный lookahead для \`<line-end>\`; он
  совпадает с eol или EOF, не поглощая их. Каждая продукция строки
  поглощает ровно один \`<line-end>\`, поэтому последняя строка может
  не иметь байта-терминатора. EOF — конечный нулевой байтовый маркер: он
  может завершить только последнюю продукцию строки, а \`<line-end>\` в EOF
  поглощается не более одного раза; поэтому \`<line>*\` не может повторять
  нулевую по ширине продукцию \`blank\` при \`(ws)=0\` и EOF.
- \`any-chars-until-line-end\` обозначает ноль или более байтов исходного
  текста и останавливается перед \`<line-end>\`, не поглощая его; его поглощает
  окружающая продукция строки. Нулевая длина допускает пустой
  \`<comment-body>\` и пустой raw-маркерный \`<item-literal>\`.
- Альтернативы \`<inline-value>\` проверяются **слева-направо** по
  первому непробельному байту в позиции inline-значения. Если этот
  байт — \`{\`, значение — вложенный inline-объект (одна из первых
  двух \`{\`-альтернатив) и MUST закрыться \`}\` на той же строке; если
  байт — \`[\`, значение — вложенный inline-массив. Любой другой
  первый байт делает значение \`<inline-scalar>\`. Решение принимается
  один раз, в начале позиции inline-значения; последующие байты
  \`{\` / \`[\` внутри inline-скаляра — литеральные данные (§ 5.8.5).

`,
  zh: `                    示例:
                    - \`a\\.b: v\`     → 键 "a.b",值 "v"(平坦,无嵌套)
                    - \`a\\:b: v\`    → 键 "a:b",值 "v"
                    - \`a\\:: v\`     → 键 "a:",值 "v"(escape 冒号,然后是普通的 \`:\` 分隔符)
                    - \`x.y\\.z: v\`  → 路径 ["x", "y.z"],值 "v"
                                     ({"x": {"y.z": "v"}})
                    - \`path\\\\to: v\` → 键 "path\\to",值 "v"
                    - 以 \`\\u\` 加 \`U+002E\` 的四位十六进制数字写出的
                      键段,与上面的 \`\\.\` 解码结果相同(平坦键,
                      无嵌套)—— § 3.7.1 中「任意已识别 escape 永远
                      不会被重新视为结构性分隔符」的规则,无论字节
                      来自十四种形式中的哪一种,均一致适用
                    - \`"a.b": v\`    → 键 "a.b",值 "v"(平坦,无嵌套
                                       —— 与上面 \`a\\.b: v\` 的 Value
                                       相同;§ 5.3.3)
                    - \`a."b.c".d: v\` → 路径 ["a", "b.c", "d"],值
                                       "v"({"a": {"b.c": {"d": "v"}}})
                                       —— 与上面 \`x.y\\.z: v\` 相比:
                                       中间段是 quoted 而非
                                       bare-with-escape,但结果相同

<sep-end>       ::= 1*ws | &line-end              ; ≥1 个空白码点,或行末
<value-part-opt> ::= <value-start> | ""             ; value-part 可选;"" ⇒ 空 String
<value-start>   ::= "{" (ws) "}" (ws)                ; 空 inline 对象
                  | "[" (ws) "]" (ws)                ; 空 inline 数组
                  | "{" (ws) <inline-pair-list> (ws) "}" ; inline 对象 (§ 5.8)
                  | "[" (ws) <inline-item-list> (ws) "]" ; inline 数组 (§ 5.8)
                   | "{" (ws) &line-end                ; 对象开启(多行 body)
                   | "[" (ws) &line-end                ; 数组开启(多行 body)
                   | "(" (ws) &line-end                ; 多行字符串开启 (stripped)
                   | "((" (ws) &line-end               ; 多行字符串开启 (verbatim)
                  | "()" (ws)                        ; 空 inline(得到 "")
                  | "(())" (ws)                      ; 空 inline(得到 "")
                  | <scalar-body>                    ; 标量值,按 § 5.2 分发

<scalar-body>   ::= (ws) any-chars-until-line-end
                    ; 修剪;按 § 5.2 解释

<array-item-line> ::= <item-literal> | <item-inline> | <item-value>
<item-literal>  ::= (ws) "::" <sep-end> any-chars-until-line-end <line-end> ; raw 字符串项
<item-inline>   ::= (ws) "{" (ws) <inline-pair-list> (ws) "}" (ws) <line-end>
                  | (ws) "[" (ws) <inline-item-list> (ws) "]" (ws) <line-end>
                  | (ws) "{}" (ws) <line-end>
                  | (ws) "[]" (ws) <line-end>
<item-value>    ::= <value-start> <line-end>

<inline-pair-list> ::= <inline-pair> ( (ws) "," (ws) <inline-pair> )* ( (ws) "," )?
<inline-pair>      ::= <key> (ws) ":"  (ws) <inline-value> (ws)
                     | <key> (ws) "::" (ws) <inline-value> (ws)

<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-scalar>    ::= 由未 escape 的 "," / "}" / "]" 或 <line-end> 终止的
                       字节序列(行末情况按 § 6.11 为错误);
                       § 3.7 的 escape 序列被处理;周围空白在分发到
                       § 5.2 前被修剪

<multiline-content-line> ::= 打开的 <multiline> 内的任意行,
                             后随 <line-end>;
                             终止符 (")" 或 "))") 关闭该块
\`\`\`

关于该记法的说明:

- \`(ws)\` 表示零个或多个上文定义的行边界内 \`ws\` 码点;LF 和 CR
  不包括在内。
- \`1*ws\` 表示**一个或多个**同样的行边界内码点。
- \`<sep-end>\` 表示「至少一个行边界内空白码点,或行末」。它用在多行
  pair 分隔符(\`:\`、\`::\`)之后。写 \`key:value\`(分隔符后无空白、
  无行末)在多行 pair 形式中是语法错误 —— 见 § 6.10。inline
  复合值(§ 5.8)中的对不要求 \`:\` / \`::\` 之后有空白。
- \`&line-end\` 是针对 \`<line-end>\` 的零宽正向先行断言 —— 它匹配
  eol 或 EOF 而不消耗它。每个行产生式恰好消耗一个 \`<line-end>\`,
  因此最后一行可以没有终止字节。EOF 是终结性的零字节标记:只能终止
  最后一个行产生式,且 EOF 处的 \`<line-end>\` 最多消耗一次;因此在
  \`(ws)=0\` 且到达 EOF 时,\`<line>*\` 不会重复零宽的 \`blank\` 产生式。
- \`any-chars-until-line-end\` 表示零个或多个源字节,在 \`<line-end>\`
  之前停止且不消耗它;由外层行产生式消耗该终止符。零长度情形允许
  空 \`<comment-body>\` 和空 raw-marker \`<item-literal>\`。
- \`<inline-value>\` 的各候选按 inline 值位置上**首个非空白码点**
  从左到右检查。若该字节为 \`{\`,值是嵌套 inline 对象(匹配前两条
  \`{\`-规则之一)且 MUST 在同一行以 \`}\` 关闭;若该字节为 \`[\`,
  则是嵌套 inline 数组。任何其他首字节使值成为 \`<inline-scalar>\`。
  决定一次性作出,位于 inline 值位置的开头;之后 inline 标量内的
  \`{\` 或 \`[\` 字节均为字面数据(§ 5.8.5)。

`,
};
