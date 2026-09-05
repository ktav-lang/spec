export default {
  en: `<key-char>      ::= any UTF-8 code point except
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

                    Key-segment trimming: a key segment is **trimmed**
                    of leading and trailing whitespace (§ 3.3 — the
                    fixed 25-code-point set, not ASCII-only) before
                    classifying it as quoted or bare and validating it
                    against the corresponding rule above. Internal
                    whitespace inside a <bare-segment> is preserved
                    verbatim; a <quoted-segment>'s content (between its
                    delimiters) is never trimmed at all, at either edge
                    — trimming only ever removes whitespace OUTSIDE the
                    delimiters (§ 5.3.3). A segment that is empty after
                    trimming is an EmptyKey (§ 6.5). Two keys that
                    differ only by a whitespace code point at a
                    trimmed edge collide as the same key (§ 5.5) —
                    trimming happens before the duplicate-name check,
                    not after.

                    Key escape processing: the \`<key-escape>\` rule
                    processes the same fourteen escape sequences as
                    § 3.7, including \`\\uXXXX\` (§ 3.7.1), identically
                    inside a <bare-segment> and inside a
                    <quoted-segment>. The backslash byte \`\\\` is the
                    escape lead; \`\\.\` produces a literal dot (does NOT
                    split a path segment); \`\\:\` produces a literal
                    colon (does NOT act as the pair separator); \`\\"\`,
                    \`\\'\`, \`\` \\\` \`\` each produce their literal quote
                    byte (does NOT close a <quoted-segment> — only an
                    UNESCAPED occurrence of a segment's own delimiter
                    closes it, § 5.3.3); \`\\\\\` produces a literal
                    backslash; \`\\uXXXX\` produces the named code point
                    and is likewise never re-examined as a structural
                    delimiter, regardless of which code point it
                    decodes to — the \`<key-char>\` / \`<dq-char>\` /
                    \`<sq-char>\` / \`<bt-char>\` exclusions above apply
                    only to raw, unescaped bytes; a decoded \`\\uXXXX\`
                    code point (including a control code point such as
                    \`U+0000\`) is accepted as key content and is
                    subject only to the surrogate rule of § 3.7.1. Any
                    other \`\\X\` form in a key is a \`BadEscapeSequence\`
                    error (§ 6.13).

                    The pair separator is the first **unescaped** \`:\`
                    (or \`::\`) scanning left-to-right, treating the
                    content of any <quoted-segment> encountered along
                    the way as opaque: scanning does not stop at a \`:\`
                    that falls between a segment's opening delimiter
                    and its own matching unescaped closing delimiter,
                    exactly as it already does not stop at an escaped
                    \`\\:\` in a <bare-segment>. If a quote character
                    opens a segment (§ 5.3.3's positional rule) and no
                    matching unescaped closing delimiter is found
                    before end-of-line, scanning simply reaches
                    end-of-line without ever finding a separator —
                    identically to a line containing no \`:\` at all;
                    see § 5.3.3 for how this is diagnosed depending on
                    context. An escaped colon \`\\:\` in a <bare-segment>
                    is part of the key segment, not a separator.

`,
  ru: `<key-char>      ::= любая UTF-8 кодовая точка, за исключением:
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

                    Обрезка сегмента ключа: сегмент ключа **обрезается**
                    от ведущих и хвостовых пробельных символов (§ 3.3 —
                    фиксированный набор из 25 кодовых точек, не только
                    ASCII) перед классификацией его как квотированного
                    или голого и валидацией по соответствующему правилу
                    выше. Внутренние пробельные кодовые точки внутри
                    <bare-segment> сохраняются verbatim; содержимое
                    <quoted-segment> (между его разделителями) не
                    обрезается вообще, ни с одной из границ — обрезка
                    удаляет пробельные символы только СНАРУЖИ разделителей
                    (§ 5.3.3). Сегмент, пустой после обрезки, — ошибка
                    EmptyKey (§ 6.5). Два ключа, различающиеся только
                    пробельной кодовой точкой на обрезаемой границе,
                    сталкиваются как один и тот же ключ (§ 5.5) — обрезка
                    происходит до проверки на дубликат, а не после.

                    Обработка escape в ключах: правило <key-escape>
                    обрабатывает те же четырнадцать escape-последовательностей,
                    что и § 3.7, включая \`\\uXXXX\` (§ 3.7.1), одинаково
                    внутри <bare-segment> и внутри <quoted-segment>.
                    Обратный слэш \`\\\` — escape-лид; \`\\.\` даёт литеральную
                    точку (НЕ разделяет сегменты пути); \`\\:\` даёт
                    литеральное двоеточие (НЕ действует как разделитель
                    пары); \`\\"\`, \`\\'\`, \`\` \\\` \`\` каждый даёт свой литеральный
                    символ кавычки (НЕ закрывает <quoted-segment> —
                    закрывает его только НЕЭКРАНИРОВАННОЕ вхождение
                    собственного разделителя сегмента, § 5.3.3); \`\\\\\` даёт
                    литеральный обратный слэш; \`\\uXXXX\` даёт названную
                    кодовую точку и точно так же никогда не рассматривается
                    повторно как структурный разделитель, независимо от
                    декодированной кодовой точки — исключения \`<key-char>\` /
                    \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\` выше применяются
                    только к сырым, неэкранированным байтам; декодированная
                    кодовая точка \`\\uXXXX\` (включая управляющую точку вроде
                    \`U+0000\`) принимается как содержимое ключа и подчиняется
                    только правилу суррогатов из § 3.7.1. Любая другая форма
                    \`\\X\` в ключе — ошибка \`BadEscapeSequence\` (§ 6.13).

                    Разделитель пары — первое **неэкранированное** \`:\`
                    (или \`::\`) при сканировании слева направо,
                    трактующем содержимое любого встреченного по пути
                    <quoted-segment> как непрозрачное: сканирование не
                    останавливается на \`:\` между открывающим разделителем
                    сегмента и его собственным неэкранированным закрывающим
                    разделителем — точно так же, как оно уже не
                    останавливается на экранированном \`\\:\` внутри
                    <bare-segment>. Если символ кавычки открывает сегмент
                    (позиционное правило § 5.3.3), а подходящий
                    неэкранированный закрывающий разделитель до конца
                    строки не найден, сканирование просто достигает конца
                    строки, так и не найдя разделителя, — идентично строке,
                    вовсе не содержащей \`:\`; о том, как это диагностируется
                    в зависимости от контекста, см. § 5.3.3. Экранированное
                    двоеточие \`\\:\` внутри <bare-segment> — часть сегмента
                    ключа, а не разделитель.

`,
  zh: `<key-char>      ::= 任意 UTF-8 码点,但不允许:
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

                    键段修剪:
                    键段在被分类为 quoted 还是 bare
                    并按上面对应规则校验之前,
                    先被**修剪**掉前后空白
                    (§ 3.3 —— 固定的 25 码点集合,不仅是 ASCII)。
                    <bare-segment> 内部空白 verbatim 保留;
                    <quoted-segment> 的内容
                    (位于其分隔符之间)完全不被修剪,两侧皆然 ——
                    修剪只移除分隔符之外的空白(§ 5.3.3)。
                    修剪后为空的段为 EmptyKey (§ 6.5)。
                    仅在被修剪的边界处以空白码点相区别的两个键,
                    视为同一个键而发生碰撞(§ 5.5)——
                    修剪发生在重复名检查之前,而非之后。

                    键 escape 处理:
                    \`<key-escape>\` 规则处理与 § 3.7
                    相同的十四个 escape 序列,包括 \`\\uXXXX\`
                    (§ 3.7.1),在 <bare-segment> 内部与
                    <quoted-segment> 内部处理方式相同。
                    反斜杠字节 \`\\\` 是 escape 前导;
                    \`\\.\` 产生字面点(不分割路径段);
                    \`\\:\` 产生字面冒号(不作为对分隔符);
                    \`\\"\`、\`\\'\`、\`\` \\\` \`\` 各自产生其字面引号字符
                    (不会关闭 <quoted-segment> ——
                    只有段自身分隔符的
                    **未 escape** 出现才会关闭它,§ 5.3.3);
                    \`\\\\\` 产生字面反斜杠;
                    \`\\uXXXX\` 产生对应的码点,
                    同样永远不会被重新视为结构性分隔符,
                    无论它解码出的是哪个码点 ——
                    上面的 \`<key-char>\` / \`<dq-char>\` /
                    \`<sq-char>\` / \`<bt-char>\` 排除项
                    仅适用于原始、未 escape 的字节;
                    解码出的 \`\\uXXXX\` 码点
                    (包括 \`U+0000\` 这样的控制码点)
                    作为键内容被接受,
                    仅受 § 3.7.1 代理规则的约束。
                    键中其他 \`\\X\` 形式为 \`BadEscapeSequence\`
                    错误 (§ 6.13)。

                    对分隔符为从左到右扫描到的首个**未 escape** 的
                    \`:\`(或 \`::\`),并将沿途遇到的任意
                    <quoted-segment> 的内容视为不透明:
                    扫描不会在落于某段开启分隔符与其自身
                    未 escape 的关闭分隔符之间的 \`:\` 处停止 ——
                    正如它已经不会在 <bare-segment> 内
                    escape 后的 \`\\:\` 处停止一样。
                    若引号字符开启了一个段
                    (§ 5.3.3 的位置规则),而在行末之前
                    未找到匹配的未 escape 关闭分隔符,
                    扫描就会径直到达行末而始终未找到分隔符 ——
                    与完全不含 \`:\` 的行等价;
                    这种情况依上下文如何诊断见 § 5.3.3。
                    <bare-segment> 内 escape 后的冒号 \`\\:\`
                    属于键段,不是分隔符。

`,
};
