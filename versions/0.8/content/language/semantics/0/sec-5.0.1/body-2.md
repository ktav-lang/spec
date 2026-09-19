>>>>> lang=en
   If the first content line trimmed begins with `[` or `{` but
   matches none of rules 2–5 above — the leading bracket/brace has
   no matching closer at the end of the line, and the line is not a
   lone opener either — it is diagnosed as a malformed or
   unterminated inline-compound attempt (§ 5.2 rules 8–9;
   `UnterminatedInlineCompound` / `MalformedInlineCompound`,
   § 6.11 / § 6.12). This diagnosis takes precedence over rule 6
   below: such a line is never treated as a pair candidate, even if
   it also contains an unescaped `:` later on (e.g. `[bad]: 1`).
   This precedence only applies when `[` or `{` is the first
   non-whitespace code point of the trimmed line — elsewhere in the
   line (e.g. `a{b: 1`) the byte is just an ordinary forbidden
   `<key-char>`, and rule 6 proceeds normally, yielding
   `InvalidKey` on validation.
6. Otherwise, if the first content line trimmed is a **pair
   candidate** — it has the *shape* of a pair line under § 5.3
   (`key: …` / `key:: …`, including dotted keys): a first
   **unescaped** `:` (or `::`) separator under § 4's
   separator-scanning rule, with a non-empty raw prefix before it,
   where the separator is either the `::` marker or a plain `:`
   satisfied by `<sep-end>` (whitespace or end-of-line after it) —
   → root is an **Object** with this line as its first pair.

>>>>> lang=ru
   Если первая содержательная строка после trim начинается с `[`
   или `{`, но не подходит ни под одно из правил 2–5 выше —
   у ведущей скобки нет соответствующего закрывателя в конце
   строки, и строка не является одиночным опенером, — это
   диагностируется как искажённая или незакрытая попытка
   inline-составного (§ 5.2 правила 8–9;
   `UnterminatedInlineCompound` / `MalformedInlineCompound`,
   § 6.11 / § 6.12). Этот диагноз имеет приоритет над правилом 6
   ниже: такая строка никогда не рассматривается как кандидат в
   pair, даже если далее в ней встречается неэкранированное `:`
   (например, `[bad]: 1`). Этот приоритет применяется, только
   когда `[` или `{` — первая непробельная кодовая точка строки
   после trim; в другом месте строки (например, `a{b: 1`) байт —
   просто обычный запрещённый `<key-char>`, и правило 6 работает
   как обычно, давая `InvalidKey` при валидации.
6. Иначе, если первая содержательная строка после trim —
   **кандидат в pair** — она имеет *форму* pair line по § 5.3
   (`key: …` / `key:: …`, включая точечные ключи): существует
   первое **неэкранированное** `:` (или `::`) по правилу
   сканирования разделителя из § 4, перед ним непустой сырой
   префикс, причём разделитель — это либо маркер `::`, либо
   обычное `:`, удовлетворяющее `<sep-end>` (пробел или конец
   строки после него) — → корень — **Object** с этой строкой как
   первой парой.

>>>>> lang=zh
   若首条内容行经 trim 后以 `[` 或 `{` 开头,但不符合上述规则
   2–5 中任何一条 —— 即行尾没有与之匹配的闭合符,该行也不是
   单独的开启符 —— 则诊断为格式错误或未闭合的 inline 复合值尝试
   (§ 5.2 规则 8–9;`UnterminatedInlineCompound` /
   `MalformedInlineCompound`,§ 6.11 / § 6.12)。此诊断优先于下方
   规则 6:即使该行后面还含有未 escape 的 `:`(例如
   `[bad]: 1`),也绝不会被当作 pair 候选行处理。此优先级仅在
   `[` 或 `{` 是该行经 trim 后的首个非空白码点时适用 —— 若出现
   在行内其他位置(例如 `a{b: 1`),该字节只是普通的被禁止的
   `<key-char>`,规则 6 照常生效,校验时产生 `InvalidKey`。
6. 否则,若首条内容行经 trim 后是 **pair 候选行** —— 即具备
   § 5.3 pair 行的*形状*(`key: …` / `key:: …`,含点分键):
   按 § 4 的分隔符扫描规则存在首个**未 escape** 的 `:`(或
   `::`),其前有非空原始前缀,且分隔符为 `::` 标记,或普通 `:`
   后随空白或行末(`<sep-end>`)→ 根为 **Object**,此行为首对。

