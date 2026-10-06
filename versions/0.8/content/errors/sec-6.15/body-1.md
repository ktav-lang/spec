>>>>> lang=en

A document whose raw bytes are not valid UTF-8 (§ 3.1, § 9.3) is an
`InvalidUtf8` error, and this validation happens before any
line-oriented or grammar-level processing: a document that fails it
MUST NOT also be diagnosed with any other category in this section.
The reason is ordering, not an absence of structure in the raw
bytes: a Ktav document is UTF-8-encoded Unicode code points (§ 3.1),
so input that fails to decode has no text for the grammar to act on.
The line terminators of § 3.2 — `LF` (`0x0A`), `CR` (`0x0D`),
`CR LF` (`0x0D 0x0A`) — are fixed ASCII byte sequences that stay
well-defined over raw bytes, independently of UTF-8 validation, so
the original byte stream does support raw diagnostics.

In particular, a 1-based diagnostic line number is computable
directly over the original bytes: count line terminators exactly as
§ 3.2 defines them (each `LF`, lone `CR`, or `CR LF` sequence is one
terminator), before any byte-order-mark removal (§ 3.1), trimming,
or newline normalisation. `InvalidUtf8` is a source-content parse
error like every other category in this section, so the § 6
location requirement applies to it in full: a 1-based source line
number computed as above, and a half-open byte-offset span
`[start, end)` covering the offending region. The error span SHOULD
point at the byte offset of the first invalid sequence; § 6 requires
the span to cover the offending region and does not fix its exact
width, and this section mandates no particular width either.

>>>>> lang=ru

Документ, чьи сырые байты не являются валидным UTF-8 (§ 3.1, § 9.3),
— это ошибка `InvalidUtf8`, и эта проверка происходит до какой-либо
построчной или грамматической обработки: документ, не прошедший её,
MUST NOT также диагностироваться никакой другой категорией из этого
раздела. Причина — порядок действий, а не отсутствие структуры в
сырых байтах: документ Ktav — это Unicode-кодовые точки в кодировке
UTF-8 (§ 3.1), поэтому вход, не прошедший декодирование, не содержит
текста, на котором могла бы работать грамматика. Завершители строк
из § 3.2 — `LF` (`0x0A`), `CR` (`0x0D`), `CR LF` (`0x0D 0x0A`) — это
фиксированные ASCII-последовательности байтов, остающиеся
определёнными над сырыми байтами независимо от проверки UTF-8, так
что исходный байтовый поток поддерживает сырую диагностику.

В частности, диагностический номер строки (1-based) вычислим
напрямую по исходным байтам: считайте завершители строк в точности
как их определяет § 3.2 (каждая последовательность `LF`, одиночный
`CR` или `CR LF` — один завершитель), до удаления маркера порядка
байтов (§ 3.1), trim и нормализации переводов строк. `InvalidUtf8` —
такая же ошибка разбора исходного содержимого, как и любая другая
категория этого раздела, поэтому требование § 6 к позиции
применяется к ней в полном объёме: 1-based номер исходной строки,
вычисленный как описано выше, и полуинтервальный байтовый Span
`[start, end)`, покрывающий ошибочный фрагмент. Span ошибки SHOULD
указывать на байтовое смещение первой невалидной последовательности;
§ 6 требует, чтобы Span покрывал ошибочный фрагмент, и не фиксирует
его точную ширину, — и этот раздел тоже не предписывает конкретной
ширины.

>>>>> lang=zh

原始字节不是有效 UTF-8(§ 3.1、§ 9.3)的文档是 `InvalidUtf8` 错误,
且该校验发生在任何逐行或语法层处理之前:未通过该校验的文档
MUST NOT 再被诊断为本节中的任何其他类别。原因在于顺序,而非原始
字节缺乏结构:Ktav 文档定义为以 UTF-8 编码的 Unicode 码点
(§ 3.1),无法解码的输入没有可供语法处理的文本。§ 3.2 的行终止符
—— `LF`(`0x0A`)、`CR`(`0x0D`)、`CR LF`(`0x0D 0x0A`)—— 是固定的
ASCII 字节序列,在原始字节上始终保持良好定义,不依赖 UTF-8 校验,
因此原始字节流本身支持原始诊断。

具体而言,1-based 诊断行号可以直接在原始字节上计算:严格按照
§ 3.2 的定义统计行终止符(每个 `LF`、单独的 `CR` 或 `CR LF` 序列
算一个终止符),且在任何字节顺序标记移除(§ 3.1)、trim 或换行
规范化之前进行。`InvalidUtf8` 与本节其他类别一样是由源文本引起的
解析错误,因此 § 6 的位置要求对其完整适用:按上述方式计算的
1-based 源行号,以及覆盖错误片段的半开字节偏移 Span
`[start, end)`。错误 span SHOULD 指向第一个无效序列的字节偏移量;
§ 6 仅要求 Span 覆盖错误片段,不固定其精确宽度,本节同样不规定
具体宽度。

