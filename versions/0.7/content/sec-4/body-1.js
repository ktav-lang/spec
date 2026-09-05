export default {
  en: `
The grammar is presented in a semi-formal notation, one rule per line.
Terminals are in double quotes; \`<name>\` denotes a non-terminal;
\`*\` is zero-or-more, \`+\` is one-or-more, \`?\` is optional, \`|\` is
alternation. Within a terminal, \`\\"\` denotes a literal double-quote
character and \`\\\\\` denotes a literal backslash — this notation is
used only where a terminal must itself contain a quote or backslash
byte (e.g. the quoted-segment delimiters, § 4). In every line and inline
production below, \`ws\` is line-bounded: it denotes a whitespace code
point from § 3.3 other than LF or CR; \`(ws)\` is zero or more such code
points, and \`1*ws\` is one or more. LF and CR are reserved for eol in
\`<line-end>\` and are not consumed by either ws form. This source-matching
rule does not change value trimming or the treatment of code points produced
by decoded escapes.

\`\`\`
<document>      ::= <line>*
<line-end>      ::= eol | EOF
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "##" <comment-body> <line-end>
<comment-body>  ::= any-chars-until-line-end
<blank>         ::= (ws) <line-end>

<header-line>   ::= (ws) "{" (ws) <line-end>         ; object open
                  | (ws) "}" (ws) <line-end>         ; object close
                  | (ws) "[" (ws) <line-end>         ; array open
                  | (ws) "]" (ws) <line-end>         ; array close
                  | (ws) ")" (ws) <line-end>         ; multiline close (stripped)
                  | (ws) "))" (ws) <line-end>        ; multiline close (verbatim)
                    Context-dependence of the last two alternatives:
                    they apply only while a multi-line string block
                    is open (§ 5.6) and the trimmed line equals that
                    block's own terminator — ")" for the stripped
                    form, "))" for the verbatim form. Outside such a
                    block — or inside one whose terminator the line
                    does not match — a line spelling just ")" or "))" is
                    NOT a <header-line> at all: it is ordinary text,
                    read per § 5.1 (rule 3 inside an open block;
                    array-item / pair-value text otherwise — § 5.2,
                    § 5.4), exactly as § 6.1 states.

<pair-line>     ::= <key> ":"  <sep-end> <value-part-opt> <line-end> ; default, scalar dispatched per § 5.2
                  | <key> "::" <sep-end> <value-part-opt> <line-end> ; literal String

<key>                ::= <raw-segment> ( <unescaped-dot> <raw-segment> )*
<raw-segment>        ::= (ws) <segment> (ws)
                         The maximal leading and trailing (ws) are trimmed
                         before dispatching to <quoted-segment> or <bare-segment>;
                         whitespace inside the dispatched segment is preserved.
<unescaped-dot>      ::= "." that is NOT preceded by an odd number of "\\\\"
<segment>            ::= <quoted-segment> | <bare-segment>
<bare-segment>       ::= <bare-first-token> <key-token>*
<bare-first-token>   ::= <key-escape> | <non-quote-key-char>
<key-token>          ::= <key-escape> | <key-char>
<non-quote-key-char> ::= <key-char> excluding "\\"", "'", "\`"
<key-escape>         ::= "\\\\" <escapable-byte>
                        | "\\\\" "u" <hex-digit> <hex-digit> <hex-digit> <hex-digit>
<escapable-byte>     ::= "\\\\" | "," | "}" | "]" | "{" | "[" | "n" | "r"
                        | "." | ":" | "\\"" | "'" | "\`"
<hex-digit>          ::= [0-9a-fA-F]

<quoted-segment> ::= "\\"" <dq-token>* "\\""       ; § 5.3.3
                  | "'" <sq-token>* "'"
                  | "\`" <bt-token>* "\`"
<dq-token>      ::= <key-escape> | <dq-char>
<sq-token>      ::= <key-escape> | <sq-char>
<bt-token>      ::= <key-escape> | <bt-char>
<dq-char>       ::= any UTF-8 code point except ASCII control bytes
                    < 0x20 other than tab/VT/FF, DEL (0x7F), LF, CR,
                    "\\\\" (escape lead), and "\\"" (the delimiter itself)
<sq-char>       ::= same exclusions as <dq-char>, but excluding "'"
                    (its own delimiter) instead of "\\""
<bt-char>       ::= same exclusions as <dq-char>, but excluding "\`"
                    (its own delimiter) instead of "\\""

`,
  ru: `
Грамматика представлена в полуформальной нотации, по одному правилу на
строку. Терминалы — в двойных кавычках; \`<имя>\` обозначает
нетерминал; \`*\` — ноль или более, \`+\` — один или более, \`?\` —
необязательный, \`|\` — альтернатива. Внутри терминала \`\\"\` обозначает
литеральный символ двойной кавычки, а \`\\\\\` — литеральный обратный
слэш — эта нотация используется только там, где терминал сам должен
содержать байт кавычки или обратного слэша (например, разделители
квотированного сегмента, § 4). Во всех приведённых ниже продукциях строк
и inline-формах \`ws\` ограничен строкой: он обозначает пробельную кодовую
точку из § 3.3, кроме LF и CR; \`(ws)\` означает ноль или более таких точек,
а \`1*ws\` — одну или более. LF и CR зарезервированы для eol внутри
\`<line-end>\` и не поглощаются ни одной формой ws. Это правило сопоставления
исходного текста не меняет обрезку значений или обработку кодовых точек,
полученных из декодированных escape-последовательностей.

\`\`\`
<document>      ::= <line>*
<line-end>      ::= eol | EOF
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "##" <comment-body> <line-end>
<comment-body>  ::= any-chars-until-line-end
<blank>         ::= (ws) <line-end>

<header-line>   ::= (ws) "{" (ws) <line-end>         ; открытие объекта
                  | (ws) "}" (ws) <line-end>         ; закрытие объекта
                  | (ws) "[" (ws) <line-end>         ; открытие массива
                  | (ws) "]" (ws) <line-end>         ; закрытие массива
                  | (ws) ")" (ws) <line-end>         ; закрытие многострочной (stripped)
                  | (ws) "))" (ws) <line-end>        ; закрытие многострочной (verbatim)
                    Контекстная зависимость двух последних альтернатив:
                    они действуют, только пока открыт многострочный
                    строковый блок (§ 5.6) и обрезанная строка совпадает
                    с его собственным терминатором — ")" для
                    stripped-формы, "))" для verbatim-формы. Вне такого
                    блока — или внутри блока, чьему терминатору строка
                    не соответствует, — строка, состоящая только из
                    ")" или "))", вообще НЕ является <header-line>: это
                    обычный текст, разбираемый по § 5.1 (правило 3
                    внутри открытого блока; в остальных случаях — текст
                    элемента массива / значения пары, § 5.2, § 5.4),
                    как и указано в § 6.1.

<pair-line>     ::= <key> ":"  <sep-end> <value-part-opt> <line-end> ; обычная, скаляр через § 5.2
                  | <key> "::" <sep-end> <value-part-opt> <line-end> ; литеральная String

<key>                ::= <raw-segment> ( <unescaped-dot> <raw-segment> )*
<raw-segment>        ::= (ws) <segment> (ws)
                         Максимальные начальные и конечные (ws) удаляются
                         до выбора <quoted-segment> или <bare-segment>;
                         пробелы внутри выбранного сегмента сохраняются.
<unescaped-dot>      ::= "." без предшествующего нечётного числа "\\\\"
<segment>            ::= <quoted-segment> | <bare-segment>
<bare-segment>       ::= <bare-first-token> <key-token>*
<bare-first-token>   ::= <key-escape> | <non-quote-key-char>
<key-token>          ::= <key-escape> | <key-char>
<non-quote-key-char> ::= <key-char> кроме "\\"", "'", "\`"
<key-escape>         ::= "\\\\" <escapable-byte>
                        | "\\\\" "u" <hex-digit> <hex-digit> <hex-digit> <hex-digit>
<escapable-byte>     ::= "\\\\" | "," | "}" | "]" | "{" | "[" | "n" | "r"
                        | "." | ":" | "\\"" | "'" | "\`"
<hex-digit>          ::= [0-9a-fA-F]

<quoted-segment> ::= "\\"" <dq-token>* "\\""       ; § 5.3.3
                  | "'" <sq-token>* "'"
                  | "\`" <bt-token>* "\`"
<dq-token>      ::= <key-escape> | <dq-char>
<sq-token>      ::= <key-escape> | <sq-char>
<bt-token>      ::= <key-escape> | <bt-char>
<dq-char>       ::= любая UTF-8 кодовая точка, кроме ASCII управляющих
                    байтов < 0x20 (кроме табуляции/VT/FF), DEL (0x7F),
                    LF, CR, "\\\\" (escape-лид) и "\\"" (сам разделитель)
<sq-char>       ::= те же исключения, что и у <dq-char>, но вместо
                    "\\"" исключён "'" (собственный разделитель)
<bt-char>       ::= те же исключения, что и у <dq-char>, но вместо
                    "\\"" исключён "\`" (собственный разделитель)

`,
  zh: `
语法以半形式化记法给出,每行一条规则。终结符放在双引号中;
\`<名称>\` 表示非终结符;\`*\` 表示零个或多个,\`+\` 表示一个或多个,
\`?\` 表示可选,\`|\` 表示候选。在终结符内部,\`\\"\` 表示字面双引号
字符,\`\\\\\` 表示字面反斜杠 —— 这种记法仅用于终结符自身必须包含
引号或反斜杠字节的场合(例如 quoted-segment 的分隔符,§ 4)。
在下述所有行产生式和 inline 产生式中,\`ws\` 均受行边界限制:它表示
§ 3.3 空白码点中除 LF 和 CR 以外的成员;\`(ws)\` 表示零个或多个这类
码点,\`1*ws\` 表示一个或多个。LF 和 CR 保留给 \`<line-end>\` 中的 eol,
两种 ws 形式均不消耗它们。此源文本匹配规则不改变值修剪,也不改变由
decoded escape 产生的码点的处理。

\`\`\`
<document>      ::= <line>*
<line-end>      ::= eol | EOF
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "##" <comment-body> <line-end>
<comment-body>  ::= any-chars-until-line-end
<blank>         ::= (ws) <line-end>

<header-line>   ::= (ws) "{" (ws) <line-end>         ; 对象开启
                  | (ws) "}" (ws) <line-end>         ; 对象关闭
                  | (ws) "[" (ws) <line-end>         ; 数组开启
                  | (ws) "]" (ws) <line-end>         ; 数组关闭
                  | (ws) ")" (ws) <line-end>         ; 多行关闭 (stripped)
                  | (ws) "))" (ws) <line-end>        ; 多行关闭 (verbatim)
                    最后两个候选的上下文相关性:
                    它们仅在多行字符串块处于打开状态(§ 5.6)
                    且修剪后的行与该块自身的终止符一致时
                    才成立 —— stripped 形式对应 ")",
                    verbatim 形式对应 "))"。
                    在此类块之外 —— 或在块内
                    但与该块的终止符不匹配时 ——
                    仅由 ")" 或 "))" 构成的行根本不是 <header-line>:
                    它是普通文本,按 § 5.1 读取
                    (打开块内为规则 3;其余情况为数组项 /
                    对值文本 —— § 5.2、§ 5.4),
                    与 § 6.1 的表述一致。

<pair-line>     ::= <key> ":"  <sep-end> <value-part-opt> <line-end> ; 默认形式,标量按 § 5.2 分发
                  | <key> "::" <sep-end> <value-part-opt> <line-end> ; 字面 String

<key>                ::= <raw-segment> ( <unescaped-dot> <raw-segment> )*
<raw-segment>        ::= (ws) <segment> (ws)
                         在分发到 <quoted-segment> 或 <bare-segment> 之前,
                         删除最长的首尾 (ws);
                         分发后的段内部空白保留。
<unescaped-dot>      ::= 非由奇数个 "\\\\" 前导的 "."
<segment>            ::= <quoted-segment> | <bare-segment>
<bare-segment>       ::= <bare-first-token> <key-token>*
<bare-first-token>   ::= <key-escape> | <non-quote-key-char>
<key-token>          ::= <key-escape> | <key-char>
<non-quote-key-char> ::= <key-char>,但排除 "\\"", "'", "\`"
<key-escape>         ::= "\\\\" <escapable-byte>
                        | "\\\\" "u" <hex-digit> <hex-digit> <hex-digit> <hex-digit>
<escapable-byte>     ::= "\\\\" | "," | "}" | "]" | "{" | "[" | "n" | "r"
                        | "." | ":" | "\\"" | "'" | "\`"
<hex-digit>          ::= [0-9a-fA-F]

<quoted-segment> ::= "\\"" <dq-token>* "\\""       ; § 5.3.3
                  | "'" <sq-token>* "'"
                  | "\`" <bt-token>* "\`"
<dq-token>      ::= <key-escape> | <dq-char>
<sq-token>      ::= <key-escape> | <sq-char>
<bt-token>      ::= <key-escape> | <bt-char>
<dq-char>       ::= 任意 UTF-8 码点,但排除 ASCII 控制字节 < 0x20
                    (制表符/VT/FF 除外)、DEL (0x7F)、LF、CR、
                    "\\\\"(escape 前导)以及 "\\""(段自身的分隔符)
<sq-char>       ::= 与 <dq-char> 相同的排除项,但排除的是 "'"
                    (自身的分隔符)而非 "\\""
<bt-char>       ::= 与 <dq-char> 相同的排除项,但排除的是 "\`"
                    (自身的分隔符)而非 "\\""

`,
};
