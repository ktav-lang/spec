export default {
  en: `                    Dotted-path segmentation splits only on
                    **unescaped** \`.\` bytes, with the same
                    quoted-segment opacity: a \`.\` between a segment's
                    opening and closing delimiter is ordinary content,
                    never a path separator, and needs no escape there
                    (contrast a <bare-segment>, where \`\\.\` is required
                    for a literal dot). A \`\\.\` inside a <bare-segment>
                    is a literal dot within the current segment.

                    Examples:
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
<raw-line>      ::= any-chars-until-line-end       ; zero or more bytes before line end
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
<item-literal>  ::= (ws) "::" <sep-end> <raw-line> <line-end> ; raw string item
<item-inline>   ::= (ws) "{" (ws) <inline-pair-list> (ws) "}" (ws) <line-end>
                  | (ws) "[" (ws) <inline-item-list> (ws) "]" (ws) <line-end>
                  | (ws) "{}" (ws) <line-end>
                  | (ws) "[]" (ws) <line-end>
<item-value>    ::= <value-start> <line-end>

<inline-pair-list> ::= <inline-pair> ( (ws) "," (ws) <inline-pair> )* ( (ws) "," )?
<inline-pair>      ::= <key> (ws) "::" (ws) <inline-raw-scalar> (ws)
                     | <key> (ws) <plain-inline-separator> (ws) <inline-value-opt> (ws)
<plain-inline-separator> ::= ":" !":"

<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value-opt> ::= <inline-value> | ""

`,
  ru: `                    Разделение по точечному пути разбивает только по
                    **неэкранированным** \`.\`-байтам, с той же непрозрачностью
                    для <quoted-segment>: \`.\` между открывающим и закрывающим
                    разделителями сегмента — обычное содержимое, никогда не
                    разделитель пути, и не нуждается там в экранировании (в
                    отличие от <bare-segment>, где для литеральной точки
                    нужен \`\\.\`). \`\\.\` внутри <bare-segment> — литеральная
                    точка в текущем сегменте.

                    Примеры:
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
<raw-line>      ::= any-chars-until-line-end       ; ноль или более байтов до конца строки
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
<item-literal>  ::= (ws) "::" <sep-end> <raw-line> <line-end> ; raw-строковый элемент
<item-inline>   ::= (ws) "{" (ws) <inline-pair-list> (ws) "}" (ws) <line-end>
                  | (ws) "[" (ws) <inline-item-list> (ws) "]" (ws) <line-end>
                  | (ws) "{}" (ws) <line-end>
                  | (ws) "[]" (ws) <line-end>
<item-value>    ::= <value-start> <line-end>

<inline-pair-list> ::= <inline-pair> ( (ws) "," (ws) <inline-pair> )* ( (ws) "," )?
<inline-pair>      ::= <key> (ws) "::" (ws) <inline-raw-scalar> (ws)
                     | <key> (ws) <plain-inline-separator> (ws) <inline-value-opt> (ws)
<plain-inline-separator> ::= ":" !":"

<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value-opt> ::= <inline-value> | ""

`,
  zh: `                    点分路径分割仅在**未 escape** 的 \`.\` 字节处
                    进行,同样对 <quoted-segment> 不透明:
                    落在段的开启与关闭分隔符之间的 \`.\` 是普通
                    内容,永远不是路径分隔符,在那里也不需要
                    转义(与 <bare-segment> 相反,后者的字面点
                    需要 \`\\.\`)。<bare-segment> 内的 \`\\.\` 是
                    当前段内的字面点。

                    示例:
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
                                       中间段是 quoted 而非 bare-with-escape,但结果相同

<sep-end>       ::= 1*ws | &line-end              ; ≥1 个空白码点,或行末
<raw-line>      ::= any-chars-until-line-end       ; 行末之前零个或多个字节
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
<item-literal>  ::= (ws) "::" <sep-end> <raw-line> <line-end> ; raw 字符串项
<item-inline>   ::= (ws) "{" (ws) <inline-pair-list> (ws) "}" (ws) <line-end>
                  | (ws) "[" (ws) <inline-item-list> (ws) "]" (ws) <line-end>
                  | (ws) "{}" (ws) <line-end>
                  | (ws) "[]" (ws) <line-end>
<item-value>    ::= <value-start> <line-end>

<inline-pair-list> ::= <inline-pair> ( (ws) "," (ws) <inline-pair> )* ( (ws) "," )?
<inline-pair>      ::= <key> (ws) "::" (ws) <inline-raw-scalar> (ws)
                     | <key> (ws) <plain-inline-separator> (ws) <inline-value-opt> (ws)
<plain-inline-separator> ::= ":" !":"

<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value-opt> ::= <inline-value> | ""

`,
};
