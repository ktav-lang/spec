>>>>> lang=en

0.8.0 carries two changes: one that alters a document's Value, and one
that adds an obligation on an implementation.

**§ 5.2 — the Value change.** A decimal integer whose digit run begins
with a redundant leading zero is no longer inferred as a number; it is
a String carrying the digits exactly as written. `zip: 01234` was
`Integer(1234)` under 0.7.x and is the String `"01234"` under 0.8.0,
through every entry point, the lax one included. Rule 14 applies the
same exception to a float's integer part (`01.5`, `05e3`). To find
affected documents, look for a base-10 scalar matching `[+-]?0[0-9_]+`
after a plain `:` separator; a document that wants the numeric reading
must drop the zero (`zip: 1234`), and one that wants the String needs
no change at all — that is now what it already means. Deliberately
unaffected: `0`, `0.5`, `0x1A`/`0o755`/`0b1010` (whose `0` belongs to
the base prefix), `1_000_000` and `+7` all keep inferring numbers.

>>>>> lang=ru

0.8.0 несёт два изменения: одно меняет Value документа, другое
добавляет обязанность реализации.

**§ 5.2 — изменение Value.** Десятичное целое, чей ряд цифр начинается
с избыточного ведущего нуля, больше не выводится как число; это String,
несущая цифры ровно так, как они написаны. `zip: 01234` был
`Integer(1234)` в 0.7.x и является String `"01234"` в 0.8.0 — через
любую точку входа, включая нестрогую. Правило 14 применяет то же
исключение к целой части float (`01.5`, `05e3`). Чтобы найти
затронутые документы, ищите скаляр по основанию 10, совпадающий с
`[+-]?0[0-9_]+`, после обычного разделителя `:`; документу, которому
нужно числовое чтение, следует убрать ноль (`zip: 1234`), а документу,
которому нужна строка, менять не нужно ничего — теперь это и есть его
значение. Намеренно не затронуты: `0`, `0.5`, `0x1A`/`0o755`/`0b1010`
(их `0` принадлежит префиксу основания), `1_000_000` и `+7` —
все они по-прежнему выводятся как числа.

>>>>> lang=zh

0.8.0 带来两项变更:一项改变文档的 Value,另一项为实现增加义务。

**§ 5.2 —— Value 的变更。** 数字串以冗余前导零开头的十进制整数不再
被推断为数字;它是一个按书写原样携带这些数字的 String。`zip: 01234`
在 0.7.x 中是 `Integer(1234)`,在 0.8.0 中则是 String `"01234"` ——
通过每一个入口,包括宽松入口。规则 14 对 float 的整数部分适用同一
例外(`01.5`、`05e3`)。要找出受影响的文档,请在普通 `:` 分隔符之后
查找匹配 `[+-]?0[0-9_]+` 的十进制标量;需要数字读法的文档应去掉那个
零(`zip: 1234`),而需要字符串的文档完全无需改动 —— 那现在正是它
本来的含义。刻意不受影响的有:`0`、`0.5`、`0x1A`/`0o755`/`0b1010`
(其 `0` 属于进制前缀)、`1_000_000` 与 `+7`,它们仍被推断为数字。

