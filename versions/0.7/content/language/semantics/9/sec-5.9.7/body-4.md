>>>>> lang=en
As of 0.7.0, a body containing a segment that trims to exactly
`))` (forcing the stripped-form fallback above) that ALSO has
trailing whitespace (§ 3.3) on any content line is likewise not
representable: the stripped form now strips that trailing
whitespace on emission, so the fallback would silently lose it. A
writer-conforming implementation MUST reject such a Value with an
error rather than serialise it, exactly as for the
both-forms-required case above. Portable documents SHOULD NOT rely
on trailing whitespace inside a multi-line String body that also
requires a segment trimming to `))`.

Independently of the trailing-whitespace case above, a body forced
into stripped form (via a segment trimming to exactly `))`) where
every non-blank segment shares at least one leading whitespace code
point in the same position is likewise not representable: on
re-parse, § 5.6's minimum-leading-whitespace computation cannot
distinguish that shared leading whitespace from writer-added
structural indentation, and would strip it. This ambiguity in the
stripped form's parsing rule predates 0.7.0 — it is documented here
for the first time, alongside the other non-representable cases
this form already has. A writer-conforming implementation MUST
reject such a Value with an error rather than serialise it, exactly
as for the other cases above. Portable documents SHOULD NOT rely on
shared leading whitespace inside a multi-line String body that also
requires a segment trimming to `))`.

>>>>> lang=ru
Начиная с 0.7.0, тело, содержащее сегмент, обрезающийся в точности
до `))` (вынуждающий откат к stripped-форме выше), которое ТАКЖЕ
имеет хвостовой пробел (§ 3.3) на какой-либо содержательной
строке, также не представимо: stripped-форма теперь обрезает этот
хвостовой пробел при выводе, так что откат незаметно потерял бы
его. Реализация-эмиттер MUST отклонить такое Value с ошибкой, а не
сериализовать его, точно так же, как и для случая, требующего
обеих форм выше. Переносимые документы SHOULD NOT полагаться на
хвостовой
пробел внутри multi-line String, которая также требует сегмента,
обрезающегося до `))`.

Независимо от случая с хвостовым пробелом выше, тело, вынужденное
перейти в stripped-форму (через сегмент, обрезающийся в точности
до `))`), в котором каждый непустой сегмент разделяет как минимум
одну пробельную кодовую точку на одной и той же позиции, также не
представимо: при повторном парсинге вычисление общего ведущего
пробела из § 5.6 не может отличить этот общий ведущий пробел от
структурного отступа, добавленного writer'ом, и обрежет его. Эта
неоднозначность в правиле парсинга stripped-формы существовала до
0.7.0 — здесь она задокументирована впервые, наряду с другими
непредставимыми случаями, уже существующими для этой формы.
Реализация-эмиттер MUST отклонить такое Value с ошибкой, а не
сериализовать его, точно так же, как и для других случаев выше.
Переносимые документы
SHOULD NOT полагаться на общий ведущий пробел внутри multi-line
String, которая также требует сегмента, обрезающегося до `))`.

>>>>> lang=zh
与上面的尾部空白情形无关,若体被迫采用 stripped 形式(通过修剪后
恰为 `))` 的段),且每个非空段在相同位置至少共享一个空白码点,
同样不可表示:重解析时,§ 5.6 的公共前导空白计算无法将这一共享
前导空白与 writer 添加的结构性缩进区分开,会将其去除。stripped
形式解析规则中的这一模糊性早于 0.7.0 就已存在 —— 此处首次将其
记录下来,与该形式已有的其他不可表示情形并列。writer-conforming
实现 MUST 以错误拒绝此类 Value,而不是将其序列化,与上述其他
情形处理方式相同。可移植文档 SHOULD NOT 在同时需要修剪
后恰为 `))` 的段的多行 String 内容中依赖共享的前导空白。

