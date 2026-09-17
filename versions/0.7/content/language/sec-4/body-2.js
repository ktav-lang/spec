export default {
  en: `<header-line>   ::= (ws) "{" (ws) <line-end>         ; object open
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
                  | <key> "::" <sep-end> <raw-line> <line-end>       ; literal String, no dispatch

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

`,
  ru: `<header-line>   ::= (ws) "{" (ws) <line-end>         ; открытие объекта
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
                  | <key> "::" <sep-end> <raw-line> <line-end>       ; литеральная String, без диспетчеризации

`,
  zh: `<header-line>   ::= (ws) "{" (ws) <line-end>         ; 对象开启
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
                  | <key> "::" <sep-end> <raw-line> <line-end>       ; 字面 String,不进行分发

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

`,
};
