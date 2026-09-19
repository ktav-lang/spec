>>>>> lang=en

An inline array item is any `<inline-value>`. The inline scalar
form is dispatched through § 5.2 after escape processing.

An **empty inline-array item** — a position where one item is
expected but no characters appear, e.g. the body between two
commas (`[a,, b]`) or directly after the opener (`[, a]`) — is
NOT an empty String. It is a `MalformedInlineCompound` error
(§ 6.12). The asymmetry with empty pair values (§ 5.8.2) is
deliberate; see § 10.5 for the rationale.

The single trailing comma immediately before the closing
delimiter (`[a, b,]`, `{a: 1, b: 2,}`) is a recognised trailing
comma, NOT an empty item, per § 5.8.

>>>>> lang=ru

Inline-элемент массива — любой `<inline-value>`. Inline-скаляр
диспетчеризуется через § 5.2 после обработки escape.

**Пустой inline-элемент массива** — позиция, где ожидается один
элемент, но не появляется ни одного символа, например тело между двумя
запятыми (`[a,, b]`) или сразу после опенера (`[, a]`) — это
НЕ пустая String. Это ошибка `MalformedInlineCompound` (§ 6.12).
Асимметрия с пустыми значениями пар (§ 5.8.2) намеренна; см.
§ 10.5 для обоснования.

Одиночная замыкающая запятая непосредственно перед закрывающим
разделителем (`[a, b,]`, `{a: 1, b: 2,}`) — это распознаваемая
замыкающая запятая, а НЕ пустой элемент (§ 5.8).

>>>>> lang=zh

inline 数组项为任意 `<inline-value>`。inline 标量在 escape 处理后
通过 § 5.2 分发。

**空 inline 数组项** —— 期望一个项但未出现任何字符的位置,如两个逗号
之间的体(`[a,, b]`)或开启符紧后(`[, a]`)—— **不是**空 String,
而是 `MalformedInlineCompound` 错误(§ 6.12)。与对的空值
(§ 5.8.2)的不对称是有意的;理由见 § 10.5。

紧邻闭合符之前的单个尾部逗号(`[a, b,]`、`{a: 1, b: 2,}`)是公认的
尾部逗号,而**不是**空项(§ 5.8)。

