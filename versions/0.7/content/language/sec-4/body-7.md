>>>>> lang=en
                    Examples:
                    - `a\.b: v`     → key "a.b", value "v" (flat, no nesting)
                    - `a\:b: v`    → key "a:b", value "v"
                    - `a\:: v`     → key "a:", value "v" (escaped colon, then the plain `:` separator)
                    - `x.y\.z: v`  → path ["x", "y.z"], value "v"
                                     ({"x": {"y.z": "v"}})
                    - `path\\to: v` → key "path\to", value "v"
                    - a key segment spelling the dot as `\u` followed
                      by the four hex digits for `U+002E` decodes
                      identically to `\.` above (flat key, no
                      nesting) — § 3.7.1's rule that any recognised
                      escape is never re-examined as a structural
                      delimiter applies the same way regardless of
                      which of the fourteen forms produced the byte
                    - `"a.b": v`    → key "a.b", value "v" (flat, no
                                       nesting — same Value as `a\.b: v`
                                       above; § 5.3.3)
                    - `a."b.c".d: v` → path ["a", "b.c", "d"], value "v"
                                       ({"a": {"b.c": {"d": "v"}}}) —
                                       contrast `x.y\.z: v` above: the
                                       middle segment is quoted instead
                                       of bare-with-escape, same result

>>>>> lang=ru
                    Примеры:
                    - `a\.b: v`     → ключ "a.b", значение "v" (плоский)
                    - `a\:b: v`    → ключ "a:b", значение "v"
                    - `a\:: v`     → ключ "a:", значение "v" (экранированное двоеточие, затем обычный разделитель `:`)
                    - `x.y\.z: v`  → путь ["x", "y.z"], значение "v"
                                     ({"x": {"y.z": "v"}})
                    - `path\\to: v` → ключ "path\to", значение "v"
                    - сегмент ключа, записывающий точку как `\u` плюс
                      четыре hex-цифры для `U+002E`, декодируется
                      идентично `\.` выше (плоский ключ, без вложенности)
                      — правило § 3.7.1 о том, что любая распознанная
                      escape-последовательность никогда не рассматривается
                      как структурный разделитель, применяется одинаково
                      независимо от того, какая из четырнадцати форм породила байт
                    - `"a.b": v`    → ключ "a.b", значение "v" (плоский,
                                       без вложенности — то же Value, что
                                       и у `a\.b: v` выше; § 5.3.3)
                    - `a."b.c".d: v` → путь ["a", "b.c", "d"], значение
                                       "v" ({"a": {"b.c": {"d": "v"}}}) —
                                       в отличие от `x.y\.z: v` выше: средний
                                       сегмент квотирован, а не голый с
                                       экранированием, но результат тот же

>>>>> lang=zh
                    示例:
                    - `a\.b: v`     → 键 "a.b",值 "v"(平坦,无嵌套)
                    - `a\:b: v`    → 键 "a:b",值 "v"
                    - `a\:: v`     → 键 "a:",值 "v"(escape 冒号,然后是普通的 `:` 分隔符)
                    - `x.y\.z: v`  → 路径 ["x", "y.z"],值 "v"
                                     ({"x": {"y.z": "v"}})
                    - `path\\to: v` → 键 "path\to",值 "v"
                    - 以 `\u` 加 `U+002E` 的四位十六进制数字写出的
                      键段,与上面的 `\.` 解码结果相同(平坦键,
                      无嵌套)—— § 3.7.1 中「任意已识别 escape 永远
                      不会被重新视为结构性分隔符」的规则,无论字节
                      来自十四种形式中的哪一种,均一致适用
                    - `"a.b": v`    → 键 "a.b",值 "v"(平坦,无嵌套
                                       —— 与上面 `a\.b: v` 的 Value
                                       相同;§ 5.3.3)
                    - `a."b.c".d: v` → 路径 ["a", "b.c", "d"],值
                                       "v"({"a": {"b.c": {"d": "v"}}})
                                       —— 与上面 `x.y\.z: v` 相比:
                                       中间段是 quoted 而非 bare-with-escape,但结果相同

<sep-end>       ::= 1*ws | &line-end              ; ≥1 个空白码点,或行末
<raw-line>      ::= any-chars-until-line-end       ; 行末之前的源字节
                    ; raw String 的语义体:修剪结尾的 § 3.3 空白;
                    ; 最大前导序列已由 <sep-end> 吸收
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

