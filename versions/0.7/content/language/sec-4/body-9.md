>>>>> lang=en
<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value-opt> ::= <inline-value> | ""

<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-raw-scalar> ::= sequence of bytes after the raw marker,
                        terminated by the first unescaped "," / "}" /
                        "]" or by <line-end> (which is an error per
                        § 6.11); surrounding whitespace is trimmed from
                        this sequence before § 3.7 escape processing,
                        and the resulting bytes are the literal String
                        body. This production does NOT dispatch through
                        <inline-value> or <inline-scalar>; an initial
                        "{" or "[" is literal data.
<inline-scalar>    ::= sequence of bytes terminated by an unescaped
                       "," / "}" / "]" or by <line-end> (which is
                       an error per § 6.11); escape sequences per
                       § 3.7 are processed; surrounding whitespace
                       is trimmed before dispatch to § 5.2

<multiline-content-line> ::= any line within an open <multiline>
                             followed by <line-end>;
                             the terminator (")" or "))") ends the block
```

>>>>> lang=ru
<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value-opt> ::= <inline-value> | ""

<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-raw-scalar> ::= последовательность байтов после raw-маркера
                        до первого неэкранированного "," / "}" /
                        "]" или до <line-end> (что является ошибкой
                        по § 6.11); окружающие пробелы обрезаются из
                        этой последовательности перед обработкой escape
                        по § 3.7, а получившиеся байты являются телом
                        литеральной String. Эта продукция НЕ проходит
                        через <inline-value> или <inline-scalar>; начальные
                        "{" или "[" являются литеральными данными.
<inline-scalar>    ::= последовательность байтов до неэкранированного
                       "," / "}" / "]" или до <line-end> (что —
                       ошибка по § 6.11); escape-последовательности
                       по § 3.7 обрабатываются; окружающие пробелы
                       обрезаются перед классификацией по § 5.2

<multiline-content-line> ::= любая строка внутри открытого <multiline>,
                             за которой следует <line-end>;
                             терминатор (")" или "))") закрывает блок
```

>>>>> lang=zh
<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value-opt> ::= <inline-value> | ""

<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-raw-scalar> ::= raw 标记之后的字节序列,
                        在第一个未 escape 的 "," / "}" /
                        "]" 或 <line-end> 处终止(后者按
                        § 6.11 为错误);该序列的周围空白
                        在 § 3.7 escape 处理之前修剪,
                        所得字节就是字面 String 体。此产生式
                        不经过 <inline-value> 或
                        <inline-scalar> 分发;初始 "{" 或
                        "[" 是字面数据。
<inline-scalar>    ::= 由未 escape 的 "," / "}" / "]" 或
                       <line-end> 终止的字节序列(后者按
                       § 6.11 为错误);§ 3.7 的 escape
                       序列被处理;周围空白在分发到
                       § 5.2 前被修剪

<multiline-content-line> ::= 打开的 <multiline> 内的任意行,
                             后随 <line-end>;
                             终止符 (")" 或 "))") 关闭该块
```

