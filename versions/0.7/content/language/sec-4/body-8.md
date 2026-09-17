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

<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

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

