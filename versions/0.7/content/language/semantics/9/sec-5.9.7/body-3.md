>>>>> lang=en
The canonical writer prefers verbatim multi-line form `((` … `))`
for strings requiring multi-line representation. If any segment of
the body (after splitting on `LF`), when trimmed of leading and
trailing whitespace (§ 3.3), is exactly `))` — matching § 5.6.1's
parser-side closer trigger, which trims a content line before
comparing it to `))` — verbatim form is impossible: the segment
would be misread as the closer regardless of any leading or
trailing whitespace of its own (e.g. a segment `"  ))"` collides
just as much as a bare `"))"`). In that case the canonical writer
MUST switch to stripped form `(` … `)` with no leading indent (the
writer emits body segments at indent 0 so the common-indent
computation yields zero). The closing `)` line is then at the
outer indent.

(Rationale: stripped form's `)` closer leaves `))` available as
content, which is the only way to represent that byte sequence in
a multi-line value — provided no segment also collides with the
`)` closer; see below.)

A String whose body would require both forms — containing a
segment that trims to exactly `))` (forcing the stripped-form
fallback above) AND a segment that trims to exactly `)` (which
would then collide with the stripped-form closer) — is not
representable in the canonical multi-line form. A writer-conforming
implementation MUST reject such a Value with an error rather than
serialise it; it is outside the scope of the round-trip property of
§ 8.3. Portable documents SHOULD NOT rely on such content.

>>>>> lang=ru
Канонический эмиттер предпочитает verbatim multi-line `((` … `))`
для строк, требующих многострочного представления. Если какой-то
сегмент тела (после разбивки по `LF`), будучи обрезан от ведущих
и хвостовых пробельных символов (§ 3.3), в точности равен `))` —
совпадая с триггером закрывателя на стороне парсера из § 5.6.1,
который обрезает содержательную строку перед сравнением с `))` —
verbatim форма невозможна: сегмент был бы ошибочно принят за
закрыватель независимо от собственных ведущих или хвостовых
пробелов (например, сегмент `"  ))"` сталкивается так же, как и
голый `"))"`). В этом случае канонический эмиттер MUST переключиться
на stripped форму `(` … `)` без ведущего отступа (writer выводит
сегменты тела на отступе 0, так что вычисление общего отступа даёт
ноль). Закрывающая `)` строка выводится на внешнем отступе.

(Обоснование: stripped-форма с закрывателем `)` оставляет `))`
доступным как содержание — единственный способ представить такую
последовательность байтов в multi-line значении — при условии, что
ни один сегмент также не сталкивается с закрывателем `)`; см. ниже.)

String, тело которой требует обеих форм — содержит сегмент,
обрезающийся в точности до `))` (вынуждающий откат к
stripped-форме выше), И сегмент, обрезающийся в точности до `)`
(который тогда столкнётся с закрывателем stripped-формы) — не
представима в канонической multi-line форме. Реализация-эмиттер
MUST отклонить такое Value с ошибкой, а не сериализовать его; это
вне области действия round-trip свойства § 8.3. Переносимые
документы SHOULD NOT полагаться на такое содержимое.

>>>>> lang=zh
体同时需要两种形式的 String —— 既含有修剪后恰为 `))` 的段
(迫使采用上述 stripped 回退),又含有修剪后恰为 `)` 的段(会与
stripped 形式的关闭符碰撞)—— 不能以规范多行形式表示。
writer-conforming 实现 MUST 以错误拒绝此类 Value,而不是将其
序列化;它不在 § 8.3 round-trip 性质的范围内。可移植文档
SHOULD NOT 依赖此类内容。

自 0.7.0 起,若体含有修剪后恰为 `))` 的段(迫使采用上述 stripped
回退),且**同时**在任意内容行上还有尾部空白(§ 3.3),同样不可
表示:stripped 形式现在会在输出时去除该尾部空白,导致回退悄悄
丢失它。writer-conforming 实现 MUST 以错误拒绝此类 Value,而不是
将其序列化,与上述两种形式皆需的情形处理方式相同。可移植文档
SHOULD NOT 在同时需要修剪后恰为 `))` 的段的多行 String 内容中
依赖尾部空白。

