>>>>> lang=en
                    Key escape processing: the `<key-escape>` rule
                    processes the same fourteen escape sequences as
                    § 3.7, including `\uXXXX` (§ 3.7.1), identically
                    inside a <bare-segment> and inside a
                    <quoted-segment>. The backslash byte `\` is the
                    escape lead; `\.` produces a literal dot (does NOT
                    split a path segment); `\:` produces a literal
                    colon (does NOT act as the pair separator); `\"`,
                    `\'`, `` \` `` each produce their literal quote
                    byte (does NOT close a <quoted-segment> — only an
                    UNESCAPED occurrence of a segment's own delimiter
                    closes it, § 5.3.3); `\\` produces a literal
                    backslash; `\uXXXX` produces the named code point
                    and is likewise never re-examined as a structural
                    delimiter, regardless of which code point it
                    decodes to — the `<key-char>` / `<dq-char>` /
                    `<sq-char>` / `<bt-char>` exclusions above apply
                    only to raw, unescaped bytes; a decoded `\uXXXX`
                    code point (including a control code point such as
                    `U+0000`) is accepted as key content and is
                    subject only to the surrogate rule of § 3.7.1. Any
                    other `\X` form in a key is a `BadEscapeSequence`
                    error (§ 6.13).

>>>>> lang=ru
                    Обработка escape в ключах: правило `<key-escape>`
                    обрабатывает те же четырнадцать escape-последовательностей,
                    что и § 3.7, включая `\uXXXX` (§ 3.7.1), одинаково
                    внутри <bare-segment> и внутри <quoted-segment>.
                    Обратный слэш `\` — escape-лид; `\.` даёт литеральную
                    точку (НЕ разделяет сегменты пути); `\:` даёт
                    литеральное двоеточие (НЕ действует как разделитель
                    пары); `\"`, `\'`, `` \` `` каждый даёт свой литеральный
                    символ кавычки (НЕ закрывает <quoted-segment> —
                    закрывает его только НЕЭКРАНИРОВАННОЕ вхождение
                    собственного разделителя сегмента, § 5.3.3); `\\` даёт
                    литеральный обратный слэш; `\uXXXX` даёт названную
                    кодовую точку и точно так же никогда не рассматривается
                    повторно как структурный разделитель, независимо от
                    декодированной кодовой точки — исключения `<key-char>` /
                    `<dq-char>` / `<sq-char>` / `<bt-char>` выше применяются
                    только к сырым, неэкранированным байтам; декодированная
                    кодовая точка `\uXXXX` (включая управляющую точку вроде
                    `U+0000`) принимается как содержимое ключа и подчиняется
                    только правилу суррогатов из § 3.7.1. Любая другая форма
                    `\X` в ключе — ошибка `BadEscapeSequence` (§ 6.13).

>>>>> lang=zh
                    键 escape 处理:
                    `<key-escape>` 规则处理与 § 3.7
                    相同的十四个 escape 序列,包括 `\uXXXX`
                    (§ 3.7.1),在 <bare-segment> 内部与
                    <quoted-segment> 内部处理方式相同。
                    反斜杠字节 `\` 是 escape 前导;
                    `\.` 产生字面点(不分割路径段);
                    `\:` 产生字面冒号(不作为对分隔符);
                    `\"`、`\'`、`` \` `` 各自产生其字面引号字符
                    (不会关闭 <quoted-segment> ——
                    只有段自身分隔符的
                    **未 escape** 出现才会关闭它,§ 5.3.3);
                    `\\` 产生字面反斜杠;
                    `\uXXXX` 产生对应的码点,
                    同样永远不会被重新视为结构性分隔符,
                    无论它解码出的是哪个码点 ——
                    上面的 `<key-char>` / `<dq-char>` /
                    `<sq-char>` / `<bt-char>` 排除项
                    仅适用于原始、未 escape 的字节;
                    解码出的 `\uXXXX` 码点
                    (包括 `U+0000` 这样的控制码点)
                    作为键内容被接受,
                    仅受 § 3.7.1 代理规则的约束。
                    键中其他 `\X` 形式为 `BadEscapeSequence`
                    错误 (§ 6.13)。

