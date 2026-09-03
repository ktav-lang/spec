export default {
  en: `                    Key-segment trimming: a key segment is **trimmed**
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

                    Dotted-path segmentation splits only on
                    **unescaped** \`.\` bytes, with the same
                    quoted-segment opacity: a \`.\` between a segment's
                    opening and closing delimiter is ordinary content,
                    never a path separator, and needs no escape there
                    (contrast a <bare-segment>, where \`\\.\` is required
                    for a literal dot). A \`\\.\` inside a <bare-segment>
                    is a literal dot within the current segment.

`,
  ru: `                    Обрезка сегмента ключа: сегмент ключа **обрезается**
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

                    Разделение по точечному пути разбивает только по
                    **неэкранированным** \`.\`-байтам, с той же непрозрачностью
                    для <quoted-segment>: \`.\` между открывающим и закрывающим
                    разделителями сегмента — обычное содержимое, никогда не
                    разделитель пути, и не нуждается там в экранировании (в
                    отличие от <bare-segment>, где для литеральной точки
                    нужен \`\\.\`). \`\\.\` внутри <bare-segment> — литеральная
                    точка в текущем сегменте.

`,
  zh: `                    键段修剪:
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

                    点分路径分割仅在**未 escape** 的 \`.\` 字节处
                    进行,同样对 <quoted-segment> 不透明:
                    落在段的开启与关闭分隔符之间的 \`.\` 是普通
                    内容,永远不是路径分隔符,在那里也不需要
                    转义(与 <bare-segment> 相反,后者的字面点
                    需要 \`\\.\`)。<bare-segment> 内的 \`\\.\` 是
                    当前段内的字面点。

`,
};
