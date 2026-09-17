>>>>> lang=en
                    The pair separator is the first **unescaped** `:`
                    (or `::`) scanning left-to-right, treating the
                    content of any <quoted-segment> encountered along
                    the way as opaque: scanning does not stop at a `:`
                    that falls between a segment's opening delimiter
                    and its own matching unescaped closing delimiter,
                    exactly as it already does not stop at an escaped
                    `\:` in a <bare-segment>. If a quote character
                    opens a segment (§ 5.3.3's positional rule) and no
                    matching unescaped closing delimiter is found
                    before end-of-line, scanning simply reaches
                    end-of-line without ever finding a separator —
                    identically to a line containing no `:` at all;
                    see § 5.3.3 for how this is diagnosed depending on
                    context. An escaped colon `\:` in a <bare-segment>
                    is part of the key segment, not a separator.

                    Dotted-path segmentation splits only on
                    **unescaped** `.` bytes, with the same
                    quoted-segment opacity: a `.` between a segment's
                    opening and closing delimiter is ordinary content,
                    never a path separator, and needs no escape there
                    (contrast a <bare-segment>, where `\.` is required
                    for a literal dot). A `\.` inside a <bare-segment>
                    is a literal dot within the current segment.

>>>>> lang=ru
                    Разделитель пары — первое **неэкранированное** `:`
                    (или `::`) при сканировании слева направо,
                    трактующем содержимое любого встреченного по пути
                    <quoted-segment> как непрозрачное: сканирование не
                    останавливается на `:` между открывающим разделителем
                    сегмента и его собственным неэкранированным закрывающим
                    разделителем — точно так же, как оно уже не
                    останавливается на экранированном `\:` внутри
                    <bare-segment>. Если символ кавычки открывает сегмент
                    (позиционное правило § 5.3.3), а подходящий
                    неэкранированный закрывающий разделитель до конца
                    строки не найден, сканирование просто достигает конца
                    строки, так и не найдя разделителя, — идентично строке,
                    вовсе не содержащей `:`; о том, как это диагностируется
                    в зависимости от контекста, см. § 5.3.3. Экранированное
                    двоеточие `\:` внутри <bare-segment> — часть сегмента
                    ключа, а не разделитель.

                    Разделение по точечному пути разбивает только по
                    **неэкранированным** `.`-байтам, с той же непрозрачностью
                    для <quoted-segment>: `.` между открывающим и закрывающим
                    разделителями сегмента — обычное содержимое, никогда не
                    разделитель пути, и не нуждается там в экранировании (в
                    отличие от <bare-segment>, где для литеральной точки
                    нужен `\.`). `\.` внутри <bare-segment> — литеральная
                    точка в текущем сегменте.

>>>>> lang=zh
                    对分隔符为从左到右扫描到的首个**未 escape** 的
                    `:`(或 `::`),并将沿途遇到的任意
                    <quoted-segment> 的内容视为不透明:
                    扫描不会在落于某段开启分隔符与其自身
                    未 escape 的关闭分隔符之间的 `:` 处停止 ——
                    正如它已经不会在 <bare-segment> 内
                    escape 后的 `\:` 处停止一样。
                    若引号字符开启了一个段
                    (§ 5.3.3 的位置规则),而在行末之前
                    未找到匹配的未 escape 关闭分隔符,
                    扫描就会径直到达行末而始终未找到分隔符 ——
                    与完全不含 `:` 的行等价;
                    这种情况依上下文如何诊断见 § 5.3.3。
                    <bare-segment> 内 escape 后的冒号 `\:`
                    属于键段,不是分隔符。

                    点分路径分割仅在**未 escape** 的 `.` 字节处
                    进行,同样对 <quoted-segment> 不透明:
                    落在段的开启与关闭分隔符之间的 `.` 是普通
                    内容,永远不是路径分隔符,在那里也不需要
                    转义(与 <bare-segment> 相反,后者的字面点
                    需要 `\.`)。<bare-segment> 内的 `\.` 是
                    当前段内的字面点。

