>>>>> lang=en
For rules 6–9, a body beginning with `{` or `[` is scanned with the
quote-aware, escape-aware delimiter rules of § 5.8. A closer is
**matching** only when it is unescaped and returns the compound's
delimiter depth to zero. If an invalid escape is encountered while
scanning for that closer, the result is `BadEscapeSequence` (§ 6.13),
which takes precedence over a missing closer. This precedence applies
before deciding between rules 8 and 9.
An unterminated quoted key remains quote-opaque and is diagnosed per
§ 6.16 as `UnterminatedInlineCompound`, even if an otherwise bad
escape occurs inside that unclosed quoted segment.
The scan is also scalar-aware: dispatch is decided once from the first
non-whitespace byte. If that byte is neither `{` nor `[`, later
`{`, `}`, `[`, and `]` bytes follow the inline-scalar delimiter
rules of § 5.8.5 rather than changing nested compound depth. A raw-marker
body is opaque to this dispatch: after `::`, § 5.8's
`<inline-raw-scalar>` treats those bytes as literal data and never enters
this compound scan.

>>>>> lang=ru
Для правил 6–9 тело, начинающееся с `{` или `[`, сканируется с учётом
кавычек, escape и глубины разделителей по § 5.8. Закрывающий разделитель
считается **соответствующим**, только если он не escape-нут и возвращает
глубину составного к нулю. Если при поиске этого разделителя встречается
недопустимая escape-последовательность, результатом является
`BadEscapeSequence` (§ 6.13), имеющая приоритет над отсутствующим
закрывающим разделителем. Этот приоритет применяется до выбора между
правилами 8 и 9.
Незакрытый quoted-ключ остаётся непрозрачным для кавычек и
диагностируется по § 6.16 как `UnterminatedInlineCompound`, даже если внутри этого
незакрытого quoted-сегмента встречается иная ошибочная escape-последовательность.
Сканирование также учитывает скалярный режим: диспетчеризация выбирается
один раз по первому непробельному байту. Если этот байт не является `{`
или `[`, последующие байты `{`, `}`, `[` и `]` подчиняются
правилам разделителей inline-скаляра из § 5.8.5, а не меняют глубину
вложенного составного. Тело с raw-маркером непрозрачно для этой
диспетчеризации: после `::` `<inline-raw-scalar>` из § 5.8 считает эти
байты литеральными данными и никогда не входит в это сканирование.

>>>>> lang=zh
对于规则 6–9,以 `{` 或 `[` 开头的体按 § 5.8 的 quote-aware、escape-aware
分隔符规则扫描。只有未 escape 且使复合值分隔符深度回到零的闭合符才是
**匹配**闭合符。如果在扫描该闭合符时遇到无效 escape,结果为
`BadEscapeSequence`(§ 6.13),其优先级高于缺失闭合符。该优先级在决定
规则 8 或 9 之前适用。
未终止的 quoted 键保持引号不透明, 并按 § 6.16 诊断为
`UnterminatedInlineCompound`,即使该未闭合 quoted 段内部还出现了其他错误 escape。
扫描同样感知标量模式:根据首个非空白字节只作一次分发决定。
如果该字节既不是 `{` 也不是 `[`,后续的 `{`、`}`、`[` 与 `]`
按 § 5.8.5 的 inline 标量分隔符规则处理,而不是改变嵌套复合深度。
raw-marker 体对这种分发是不透明的:在 `::` 之后,§ 5.8 的
`<inline-raw-scalar>` 将这些字节视为字面数据,从不进入此复合扫描。

