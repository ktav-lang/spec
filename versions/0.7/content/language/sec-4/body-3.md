>>>>> lang=en
<quoted-segment> ::= "\"" <dq-token>* "\""       ; § 5.3.3
                  | "'" <sq-token>* "'"
                  | "`" <bt-token>* "`"
<dq-token>      ::= <key-escape> | <dq-char>
<sq-token>      ::= <key-escape> | <sq-char>
<bt-token>      ::= <key-escape> | <bt-char>
<dq-char>       ::= any UTF-8 code point except ASCII control bytes
                    < 0x20 other than tab/VT/FF, DEL (0x7F), LF, CR,
                    "\\" (escape lead), and "\"" (the delimiter itself)
<sq-char>       ::= same exclusions as <dq-char>, but excluding "'"
                    (its own delimiter) instead of "\""
<bt-char>       ::= same exclusions as <dq-char>, but excluding "`"
                    (its own delimiter) instead of "\""

>>>>> lang=ru
<key>                ::= <raw-segment> ( <unescaped-dot> <raw-segment> )*
<raw-segment>        ::= (ws) <segment> (ws)
                         Максимальные начальные и конечные (ws) удаляются
                         до выбора <quoted-segment> или <bare-segment>;
                         пробелы внутри выбранного сегмента сохраняются.
<unescaped-dot>      ::= "." без предшествующего нечётного числа "\\"
<segment>            ::= <quoted-segment> | <bare-segment>
<bare-segment>       ::= <bare-first-token> <key-token>*
<bare-first-token>   ::= <key-escape> | <non-quote-key-char>
<key-token>          ::= <key-escape> | <key-char>
<non-quote-key-char> ::= <key-char> кроме "\"", "'", "`"
<key-escape>         ::= "\\" <escapable-byte>
                        | "\\" "u" <hex-digit> <hex-digit> <hex-digit> <hex-digit>
<escapable-byte>     ::= "\\" | "," | "}" | "]" | "{" | "[" | "n" | "r"
                        | "." | ":" | "\"" | "'" | "`"
<hex-digit>          ::= [0-9a-fA-F]

<quoted-segment> ::= "\"" <dq-token>* "\""       ; § 5.3.3
                  | "'" <sq-token>* "'"
                  | "`" <bt-token>* "`"
<dq-token>      ::= <key-escape> | <dq-char>
<sq-token>      ::= <key-escape> | <sq-char>
<bt-token>      ::= <key-escape> | <bt-char>
<dq-char>       ::= любая UTF-8 кодовая точка, кроме ASCII управляющих
                    байтов < 0x20 (кроме табуляции/VT/FF), DEL (0x7F),
                    LF, CR, "\\" (escape-лид) и "\"" (сам разделитель)
<sq-char>       ::= те же исключения, что и у <dq-char>, но вместо
                    "\"" исключён "'" (собственный разделитель)
<bt-char>       ::= те же исключения, что и у <dq-char>, но вместо
                    "\"" исключён "`" (собственный разделитель)

>>>>> lang=zh
<quoted-segment> ::= "\"" <dq-token>* "\""       ; § 5.3.3
                  | "'" <sq-token>* "'"
                  | "`" <bt-token>* "`"
<dq-token>      ::= <key-escape> | <dq-char>
<sq-token>      ::= <key-escape> | <sq-char>
<bt-token>      ::= <key-escape> | <bt-char>
<dq-char>       ::= 任意 UTF-8 码点,但排除 ASCII 控制字节 < 0x20
                    (制表符/VT/FF 除外)、DEL (0x7F)、LF、CR、
                    "\\"(escape 前导)以及 "\""(段自身的分隔符)
<sq-char>       ::= 与 <dq-char> 相同的排除项,但排除的是 "'"
                    (自身的分隔符)而非 "\""
<bt-char>       ::= 与 <dq-char> 相同的排除项,但排除的是 "`"
                    (自身的分隔符)而非 "\""

