>>>>> lang=en
<key-char>      ::= any UTF-8 code point except
                    ASCII control bytes < 0x20 other than the § 3.3
                    whitespace members (tab 0x09, VT 0x0B, FF 0x0C —
                    LF 0x0A and CR 0x0D are excluded separately below
                    as line terminators, not as control bytes),
                    DEL (0x7F),
                    line terminator (LF 0x0A, CR 0x0D),
                    "[", "]", "{", "}", "(", ")", ":", ",",
                    "\\" (backslash — now an escape lead, § 3.7),
                    "." (dot — now the path separator; use "\." for
                    a literal dot inside a segment)
                    (note: any whitespace code point (§ 3.3) is
                    allowed inside a key segment — only the trimmed
                    edges are removed, not interior occurrences — so
                    a key MAY contain internal whitespace such as
                    "first name: alice"; "#" is allowed; "##" two-byte
                    run only becomes a comment when at the start of
                    a trimmed line, § 3.4; a quote character — '"',
                    "'", or "`" — is an ordinary, unexcluded
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

>>>>> lang=ru
<key-char>      ::= любая UTF-8 кодовая точка, за исключением:
                    ASCII управляющих байтов < 0x20, кроме элементов
                    множества § 3.3 (табуляция 0x09, VT 0x0B, FF 0x0C —
                    LF 0x0A и CR 0x0D исключены отдельно ниже как
                    завершители строки, а не как управляющие байты),
                    DEL (0x7F),
                    завершителя строки (LF 0x0A, CR 0x0D),
                    "[", "]", "{", "}", "(", ")", ":", ",",
                    "\\" (обратный слэш — теперь escape-лид, § 3.7),
                    "." (точка — теперь разделитель пути; для
                    литеральной точки внутри сегмента используйте "\.")
                    (примечание: любая пробельная кодовая точка (§ 3.3)
                    РАЗРЕШЕНА внутри сегмента ключа — удаляются только
                    обрезаемые границы, а не внутренние вхождения —
                    так что ключ MAY содержать внутренний пробельный
                    символ, например "first name: alice"; "#" разрешён;
                    пара "##" становится маркером комментария только в
                    начале обрезанной строки, § 3.4; символ кавычки —
                    '"', "'" или "`" — является обычным, не исключённым
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

>>>>> lang=zh
<key-char>      ::= 任意 UTF-8 码点,但不允许:
                    ASCII 控制字节 < 0x20(§ 3.3 的空白成员除外:
                    制表符 0x09、VT 0x0B、FF 0x0C —— LF 0x0A 与
                    CR 0x0D 在下面作为行终止符单独排除,而非作为
                    控制字节),
                    DEL (0x7F),
                    行终止符 (LF 0x0A, CR 0x0D),
                    "[", "]", "{", "}", "(", ")", ":", ",",
                    "\\"(反斜杠 —— 现为 escape 前导,§ 3.7),
                    "."(点 —— 现为路径分隔符;用 "\." 表示段内的
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
                    引号字符 —— '"'、"'" 或 "`" ——
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

