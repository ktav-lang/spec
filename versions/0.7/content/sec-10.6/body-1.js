export default {
  en: `
The format is intentionally permissive on input — comments, inline
compounds, numeric literals in multiple bases, underscores, mixed
escape styles — but **strict on output**. A single canonical
serialisation (§ 5.9) is defined for every **representable** Value.

This separation lets humans write Ktav in the form most natural
to them (compact inline, explicit multi-line, comments, mixed
bases) while machines exchange a deterministic byte sequence.
Byte-deterministic output also makes Ktav useful as a target for
generated configuration: any two writer-conforming implementations
operating on the same Value produce the same bytes, so diffs over
generated files are stable.

The conformance suite tests both directions: input variety via
\`name.ktav\` fixtures (reader-side), output determinism via
\`name.canonical.ktav\` fixtures (writer-side), and equivalence to
\`name.json\` oracles (Value model).

`,
  ru: `
Формат намеренно либерален на входе — комментарии, inline-составные
значения, числовые литералы в нескольких основаниях, подчёркивания,
смешанные стили экранирования, — но **строг на выходе**. Для каждого
**представимого** Value определена единственная каноническая
сериализация (§ 5.9).

Это разделение позволяет людям писать Ktav в наиболее естественной
для них форме (компактный inline, явная многострочность,
комментарии, смешанные основания), тогда как машины обмениваются
детерминированной последовательностью байтов. Байт-детерминированный
вывод также делает Ktav полезным в качестве цели для генерируемой
конфигурации: любые две writer-conforming реализации, работающие с
одним и тем же Value, порождают одни и те же байты, поэтому диффы
по сгенерированным файлам стабильны.

Конформный корпус проверяет оба направления: разнообразие ввода
через фикстуры \`name.ktav\` (reader-side), детерминизм вывода через
фикстуры \`name.canonical.ktav\` (writer-side) и эквивалентность
\`name.json\` оракулам (модель Value).

`,
  zh: `
该格式在输入上刻意宽容 —— 注释、inline 复合值、多种基数的数字字面量、下划线、
混合的 escape 风格 —— 但**输出上严格**。为每个**可表示** Value 定义了唯一的规范
序列化(§ 5.9)。

这种分离让人以最自然的形式书写 Ktav(紧凑 inline、显式多行、注释、混合基数),而
机器交换确定性的字节序列。字节确定性输出也使 Ktav 适合作为生成配置的目标:任何
两个 writer-conforming 实现对同一 Value 产生相同字节,因此生成文件之上的 diff
保持稳定。

合规语料双向测试:输入多样性经 \`name.ktav\` fixture(读取侧),输出确定性经
\`name.canonical.ktav\` fixture(写入侧),以及与 \`name.json\` oracle 的等价性
(Value 模型)。

`,
};
