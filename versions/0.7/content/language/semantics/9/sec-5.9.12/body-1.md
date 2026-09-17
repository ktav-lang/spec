>>>>> lang=en

§ 3.1 requires a conformant reader to strip exactly one leading
U+FEFF — decoded from the raw 3-byte UTF-8 sequence `EF BB BF` — if
and only if it is the very first code point of the entire document,
and requires the canonical writer to never emit a leading
byte-order mark. These two rules interact badly with ordinary
content: if the writer ever placed the raw 3-byte encoding of
U+FEFF at byte offset 0 of otherwise-ordinary output, a conformant
reader would strip it as a metadata BOM per § 3.1, silently losing
that code point on re-parse — a canonicalisation that would not be
idempotent or round-trip-safe. This can only happen at two
positions; nowhere else in canonical output can a Value's own
content reach byte offset 0, since every other position is preceded
by at least one byte of surrounding structure (a parent key, a
separator, a line terminator, indentation, a compound opener, or an
array-item marker).

>>>>> lang=ru

§ 3.1 требует, чтобы conforming-читатель снимал ровно один ведущий
U+FEFF — декодированный из сырой 3-байтовой UTF-8-последовательности
`EF BB BF` — тогда и только тогда, когда он является самой первой
кодовой точкой всего документа, и требует, чтобы канонический writer
никогда не выводил ведущий маркер порядка байтов. Эти два правила
плохо взаимодействуют с обычным содержимым: если бы writer когда-либо
разместил сырую 3-байтовую кодировку U+FEFF на байтовом смещении 0
в остальном обычного вывода, conforming-читатель снял бы её как
метаданные BOM по § 3.1, незаметно потеряв эту кодовую точку при
повторном парсинге — канонизация, которая не была бы идемпотентной
или безопасной для round-trip. Это может произойти только в двух
позициях; больше нигде в каноническом выводе собственное содержимое
Value не может достичь байтового смещения 0, поскольку любой другой
позиции предшествует хотя бы один байт окружающей структуры
(родительский ключ, разделитель, завершитель строки, отступ,
открывающая скобка составного значения или маркер элемента массива).

>>>>> lang=zh

§ 3.1 要求 conforming 读取器当且仅当 U+FEFF —— 从原始 3 字节
UTF-8 序列 `EF BB BF` 解码而来 —— 是整个文档的第一个码点时,
剥离恰好一个前导 U+FEFF,并要求规范 writer 绝不输出前导字节
顺序标记。这两条规则与普通内容的交互并不友好:若 writer 曾经把
U+FEFF 的原始 3 字节编码放在原本普通输出的字节偏移 0 处,
conforming 读取器会依据 § 3.1 将其作为元数据 BOM 剥离,在重解析
时悄悄丢失该码点 —— 这样的规范化既非幂等,也不具备 round-trip
安全性。这种情况只可能发生在两个位置;规范输出中的其他任何位置,
Value 自身的内容都不可能到达字节偏移 0,因为其余每个位置之前
都至少有一个字节的周围结构(父键、分隔符、行终止符、缩进、
复合值开启符,或数组项标记)。

