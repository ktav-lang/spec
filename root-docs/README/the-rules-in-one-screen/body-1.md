>>>>> lang=en
## The rules, in one screen

A Ktav document's root is an Object or Array determined by its first
content line. Inside any object you have pairs; inside any array you have
items.

```text
## comment             — any line starting with '##'
key: value             — scalar pair; bare number → Integer/Float,
                         any other body → String
key:: value            — scalar pair; value is ALWAYS a literal string
key: { ... }           — multi-line object; `}` closes on its own line
key: [ ... ]           — multi-line array; `]` closes on its own line
key: { a: 1, b: 2 }    — inline object, one line, comma-separated
key: [ 1, 2 ]          — inline array, one line, comma-separated
key: {}   /   key: []  — empty compound, inline
key: ( ... )           — multi-line string; common indent stripped
key: (( ... ))         — multi-line string; verbatim (no stripping)
value                  — inside an array: bare item (typed by form)
:: value               — inside an array: literal-string item
```

That's the whole language. No commas or quotes are required for the
common case — commas appear only as separators inside one-line inline
compounds — and the closed 14-entry escape table (§ 3.7) provides
literal-byte escapes and explicit scalar classification. The `::` marker
(in the separator
for pairs, or as a line prefix for array items) forces a literal
string.

>>>>> lang=ru
## Правила на одном экране

Корень документа Ktav — это Object или Array, определяемый первой
содержательной строкой. Внутри любого объекта — пары; внутри любого
массива — элементы.

```text
## comment             — any line starting with '##'
key: value             — scalar pair; bare number → Integer/Float,
                         any other body → String
key:: value            — scalar pair; value is ALWAYS a literal string
key: { ... }           — multi-line object; `}` closes on its own line
key: [ ... ]           — multi-line array; `]` closes on its own line
key: { a: 1, b: 2 }    — inline object, one line, comma-separated
key: [ 1, 2 ]          — inline array, one line, comma-separated
key: {}   /   key: []  — empty compound, inline
key: ( ... )           — multi-line string; common indent stripped
key: (( ... ))         — multi-line string; verbatim (no stripping)
value                  — inside an array: bare item (typed by form)
:: value               — inside an array: literal-string item
```

Это весь язык. В обычном случае не нужны ни запятые, ни кавычки —
запятые встречаются только как разделители внутри однострочных
inline-составных — а замкнутая таблица из 14 escape-последовательностей
задаёт escape для литеральных байтов и явную классификацию скаляра.
Маркер `::` (в разделителе для пар или в префиксе строки для элементов
массива) делает значение литеральной строкой.

>>>>> lang=zh
## 一屏看完的规则

Ktav 文档的根是由首条内容行决定的 Object 或 Array。任何对象里是键值对，
任何数组里是元素。

```text
## comment             — any line starting with '##'
key: value             — scalar pair; bare number → Integer/Float,
                         any other body → String
key:: value            — scalar pair; value is ALWAYS a literal string
key: { ... }           — multi-line object; `}` closes on its own line
key: [ ... ]           — multi-line array; `]` closes on its own line
key: { a: 1, b: 2 }    — inline object, one line, comma-separated
key: [ 1, 2 ]          — inline array, one line, comma-separated
key: {}   /   key: []  — empty compound, inline
key: ( ... )           — multi-line string; common indent stripped
key: (( ... ))         — multi-line string; verbatim (no stripping)
value                  — inside an array: bare item (typed by form)
:: value               — inside an array: literal-string item
```

整个语言就这些。常见情形下无需逗号与引号 —— 逗号只作为单行
inline 复合值内的分隔符出现 —— 另有一条封闭的 14 项转义表,
用于字面字节与显式的标量分类。`::` 标记（出现在分隔符里
用于键值对，或行首前缀里用于数组元素）强制取字面字符串。

