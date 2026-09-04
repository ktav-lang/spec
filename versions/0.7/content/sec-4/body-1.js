export default {
  en: `
The grammar is presented in a semi-formal notation, one rule per line.
Terminals are in double quotes; \`<name>\` denotes a non-terminal;
\`*\` is zero-or-more, \`+\` is one-or-more, \`?\` is optional, \`|\` is
alternation. Within a terminal, \`\\"\` denotes a literal double-quote
character and \`\\\\\` denotes a literal backslash — this notation is
used only where a terminal must itself contain a quote or backslash
byte (e.g. the quoted-segment delimiters, § 4). \`(ws)\` stands for
zero or more whitespace code points (§ 3.3 — the fixed 25-code-point
set, not ASCII-only).

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

<key-char>      ::= any UTF-8 code point except
                    ASCII control bytes < 0x20 other than the § 3.3
                    whitespace members (tab 0x09, VT 0x0B, FF 0x0C —
                    LF 0x0A and CR 0x0D are excluded separately below
                    as line terminators, not as control bytes),
                    DEL (0x7F),
                    line terminator (LF 0x0A, CR 0x0D),
                    "[", "]", "{", "}", "(", ")", ":", ",",
                    "\\\\" (backslash — now an escape lead, § 3.7),
                    "." (dot — now the path separator; use "\\." for
                    a literal dot inside a segment)
                    (note: any whitespace code point (§ 3.3) is
                    allowed inside a key segment — only the trimmed
                    edges are removed, not interior occurrences — so
                    a key MAY contain internal whitespace such as
                    "first name: alice"; "#" is allowed; "##" two-byte
                    run only becomes a comment when at the start of
                    a trimmed line, § 3.4; a quote character — '"',
                    "'", or "\`" — is an ordinary, unexcluded
                    <key-char> everywhere in a <bare-segment> EXCEPT
                    as its first code point — excluded there by
                    <bare-first-token> / <non-quote-key-char> above —
                    where it instead opens a <quoted-segment> —
                    § 5.3.3's positional rule)

`,
  ru: `
Грамматика представлена в полуформальной нотации, по одному правилу на
строку. Терминалы — в двойных кавычках; \`<имя>\` обозначает
нетерминал; \`*\` — ноль или более, \`+\` — один или более, \`?\` —
необязательный, \`|\` — альтернатива. Внутри терминала \`\\"\` обозначает
литеральный символ двойной кавычки, а \`\\\\\` — литеральный обратный
слэш — эта нотация используется только там, где терминал сам должен
содержать байт кавычки или обратного слэша (например, разделители
квотированного сегмента, § 4). \`(ws)\` означает ноль или более
пробельных кодовых точек (§ 3.3 — фиксированный набор из 25
кодовых точек, не только ASCII).

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

<key-char>      ::= любая UTF-8 кодовая точка, за исключением:
                    ASCII управляющих байтов < 0x20, кроме элементов
                    множества § 3.3 (табуляция 0x09, VT 0x0B, FF 0x0C —
                    LF 0x0A и CR 0x0D исключены отдельно ниже как
                    завершители строки, а не как управляющие байты),
                    DEL (0x7F),
                    завершителя строки (LF 0x0A, CR 0x0D),
                    "[", "]", "{", "}", "(", ")", ":", ",",
                    "\\\\" (обратный слэш — теперь escape-лид, § 3.7),
                    "." (точка — теперь разделитель пути; для
                    литеральной точки внутри сегмента используйте "\\.")
                    (примечание: любая пробельная кодовая точка (§ 3.3)
                    РАЗРЕШЕНА внутри сегмента ключа — удаляются только
                    обрезаемые границы, а не внутренние вхождения —
                    так что ключ MAY содержать внутренний пробельный
                    символ, например "first name: alice"; "#" разрешён;
                    пара "##" становится маркером комментария только в
                    начале обрезанной строки, § 3.4; символ кавычки —
                    '"', "'" или "\`" — является обычным, не исключённым
                    <key-char> везде внутри <bare-segment>, КРОМЕ как в
                    его первой кодовой точке — там он исключён
                    правилами <bare-first-token> / <non-quote-key-char>
                    выше — где он вместо этого открывает
                    <quoted-segment> — позиционное правило § 5.3.3)

`,
  zh: `
语法以半形式化记法给出,每行一条规则。终结符放在双引号中;
\`<名称>\` 表示非终结符;\`*\` 表示零个或多个,\`+\` 表示一个或多个,
\`?\` 表示可选,\`|\` 表示候选。在终结符内部,\`\\"\` 表示字面双引号
字符,\`\\\\\` 表示字面反斜杠 —— 这种记法仅用于终结符自身必须包含
引号或反斜杠字节的场合(例如 quoted-segment 的分隔符,§ 4)。
\`(ws)\` 表示零个或多个空白码点
(§ 3.3 —— 固定的 25 码点集合,不仅是 ASCII)。

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

<key-char>      ::= 任意 UTF-8 码点,但不允许:
                    ASCII 控制字节 < 0x20(§ 3.3 的空白成员除外:
                    制表符 0x09、VT 0x0B、FF 0x0C —— LF 0x0A 与
                    CR 0x0D 在下面作为行终止符单独排除,而非作为
                    控制字节),
                    DEL (0x7F),
                    行终止符 (LF 0x0A, CR 0x0D),
                    "[", "]", "{", "}", "(", ")", ":", ",",
                    "\\\\"(反斜杠 —— 现为 escape 前导,§ 3.7),
                    "."(点 —— 现为路径分隔符;用 "\\." 表示段内的
                    字面点)
                    (注意:任意空白码点(§ 3.3)
                    允许出现在键段内 ——
                    仅修剪的边界被移除,
                    内部出现不受影响 ——
                    因此键 MAY 包含内部空白,
                    例如 "first name: alice";
                    "#" 允许;
                    仅当位于修剪行的行首时,
                    "##" 两字节序列才成为注释标记,§ 3.4;
                    引号字符 —— '"'、"'" 或 "\`" ——
                    在 <bare-segment> 内任何位置
                    都是普通的、未被排除的 <key-char>,
                    唯独作为其第一个码点时例外 ——
                    那里由上面的 <bare-first-token> /
                    <non-quote-key-char> 将其排除 ——
                    此时它转而开启一个 <quoted-segment> ——
                    见 § 5.3.3 的位置规则)

`,
};
