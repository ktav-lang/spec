>>>>> lang=en
<sep-end>       ::= 1*ws | &line-end              ; ≥1 whitespace code point, or the line end
<raw-line>      ::= any-chars-until-line-end       ; source bytes before line end
                    ; semantic raw String body: trim trailing § 3.3 whitespace;
                    ; the maximal leading run was already consumed by <sep-end>
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

>>>>> lang=ru
<sep-end>       ::= 1*ws | &line-end              ; ≥1 пробельная кодовая точка, либо конец строки
<raw-line>      ::= any-chars-until-line-end       ; исходные байты до конца строки
                    ; семантическое тело raw String: убрать замыкающие пробелы § 3.3;
                    ; максимальная ведущая последовательность уже поглощена <sep-end>
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

>>>>> lang=zh
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

