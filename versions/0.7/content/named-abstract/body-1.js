export default {
  en: `
Ktav is a plain-text configuration format designed so that every line
either stands on its own or depends only on explicit, visible brackets.
It offers JSON-shape (scalars, arrays, objects, \`null\`, booleans) with
none of JSON's punctuation: no quotes around strings, no escape
sequences in the common case. Nested keys use a dotted path.
Multi-line strings and inline compounds use small, visible opt-in
markers.

This document specifies the syntax and semantics of the format at
version 0.7.0. Implementations in any programming language may claim
"Ktav 0.7.0 compliance" iff they satisfy every normative statement
below.

0.7.0: § 3.3 whitespace changes from an implementation-defined \`MAY\` to
a fixed, exhaustively-enumerated 25-code-point \`MUST\` (§ 3.3); § 4's
key-segment trimming widens from ASCII-only to the same fixed set, resolving
a standing internal contradiction; the \`\\uXXXX\` escape (§ 3.7.1) and
quoted keys (§ 5.3.3, delimiters \`"\` / \`'\` / \`\` \` \`\`) are added; and
the \`(…)\` multi-line string form now also strips trailing whitespace from
every content line — \`(…)\` already removed each line's shared leading
indent (§ 5.6). The five universal breaking changes are: a leading U+FEFF
is stripped from the document; \`(…)\` no longer preserves trailing
whitespace on content lines; a leading unescaped \`"\`, \`'\`, or \`\` \` \`\`
in a key segment opens a quoted segment instead of being ordinary key
content (so an Object pair \`"port": 1\` names \`port\`, not \`"port"\`);
a recognised escape in an inline scalar forces String before keyword or
numeric classification (so \`1\\.0\` is String, not Float); and a float
literal that is non-finite in the declared Float domain falls back to String
instead of producing a non-finite Float (§ 5.2 rule 14). Separately, an
implementation that literally followed old § 3.3 / § 4 wording and trimmed
only the specified ASCII whitespace has a conditional migration review for
the other members of the 25-code-point set at structural, blank-line,
comment, root-dispatch, separator, scalar/key-edge, and stripped-block
content positions; this is not one of the five universal changes. Also,
the 0.7.0 binary64 minimum and \`roundTiesToEven\` can change values for a
previously conforming narrower-domain implementation (for example, binary32
rounds \`16777217.0\` to \`16777216.0\`); this is an implementation-dependent
numeric migration hazard, not a universal sixth change.

`,
  ru: `
Ktav — это конфигурационный формат на основе обычного текста,
спроектированный так, чтобы каждая строка либо самодостаточна, либо
зависит только от явно видимых открывающих скобок выше. Он
предоставляет JSON-форму (скаляры, массивы, объекты, \`null\`,
булевы значения) без JSON-пунктуации: без кавычек вокруг строк,
без escape-последовательностей в обычном случае. Вложенные ключи
используют точечный путь. Многострочные строки и однострочные
составные значения используют небольшие явные маркеры.

Данный документ описывает синтаксис и семантику формата на версии
0.7.0. Реализации на любом языке программирования могут заявить
«соответствие Ktav 0.7.0» если и только если они выполняют каждое
нормативное утверждение ниже.

0.7.0: § 3.3 меняется с зависящего от реализации \`MAY\` на фиксированное,
исчерпывающе перечисленное \`MUST\` из 25 кодовых точек (§ 3.3); trimming
ключевых сегментов в § 4 расширяется с ASCII-only на тот же фиксированный
набор, устраняя внутреннее противоречие; добавлены escape-последовательность
\`\\uXXXX\` (§ 3.7.1) и квотированные ключи (§ 5.3.3, разделители \`"\` /
\`'\` / \`\` \` \`\`); многострочная форма \`(…)\` теперь также обрезает
завершающие пробельные символы каждой содержательной строки — \`(…)\` уже
убирала общий ведущий отступ (§ 5.6). Пять универсальных ломающих изменений:
ведущий U+FEFF удаляется из документа; \`(…)\` больше не сохраняет замыкающие
пробельные символы строк; ведущая неэкранированная \`"\`, \`'\` или \`\` \` \`\`
в сегменте ключа открывает квотированный сегмент вместо обычного содержимого
(поэтому пара Object \`"port": 1\` называет ключ \`port\`, а не \`"port"\`);
распознанный escape в inline-скаляре фиксирует String до классификации
ключевого слова или числа (поэтому \`1\\.0\` — String, а не Float); а float-
литерал, неконечный в заявленном домене Float, проваливается в String вместо
порождения неконечного Float (§ 5.2, правило 14). Отдельно: реализация,
буквально следовавшая старой формулировке § 3.3 / § 4 и обрезавшая только
указанные ASCII-пробелы, должна условно проверить миграцию для других членов
набора из 25 кодовых точек в структурных, пустых, комментарных, root-dispatch
позициях, вокруг разделителей, на границах скаляра/ключа и в строках stripped-
блоков; это не одно из пяти универсальных изменений. Кроме того, минимум
binary64 и \`roundTiesToEven\` в 0.7.0 могут изменить значения у ранее
соответствовавшей реализации с более узким доменом (например, binary32
округляет \`16777217.0\` до \`16777216.0\`); это зависящая от реализации
числовая опасность миграции, а не универсальное шестое изменение.

`,
  zh: `
Ktav 是一种基于纯文本的配置格式,设计目标是让每一行都能够独立成立,
或仅依赖其上方明确可见的括号。它提供 JSON 的数据形态(标量、数组、
对象、\`null\`、布尔值),但没有 JSON 的标点符号:字符串无引号、常规
情况下无 escape 序列。嵌套键使用点分路径。多行字符串与单行复合值使
用小巧而清晰的 opt-in 标记。

本文档规定格式 0.7.0 版本的语法与语义。任何编程语言的实现可声明
「Ktav 0.7.0 兼容性」,当且仅当满足以下每一条规范性声明。

0.7.0:§ 3.3 从依赖具体实现的 \`MAY\` 变为固定、穷举列出的 25 个码点的
\`MUST\`(§ 3.3);§ 4 的键段 trim 从仅 ASCII 扩展到同一固定集合,解决
此前的内部矛盾;新增 \`\\uXXXX\` escape(§ 3.7.1)以及带引号的键
(§ 5.3.3,分隔符 \`"\` / \`'\` / \`\` \` \`\`);多行字符串 \`(…)\` 形式
现在还会去除每个内容行的尾部空白 —— \`(…)\` 此前已去除每行共享的前导
缩进(§ 5.6)。五项普遍适用的破坏性变更是:前导 U+FEFF 从文档中剥除;
\`(…)\` 不再保留内容行的尾部空白;键段前导的未转义 \`"\`、\`'\` 或
\`\` \` \`\` 开启带引号的段,而不再是普通键内容(因此对象键值对
\`"port": 1\` 命名的键是 \`port\`,而不是 \`"port"\`);inline 标量中的
已识别 escape 在关键字或数字分类之前强制为 String(因此 \`1\\.0\` 是
String 而非 Float);以及声明 Float 域中非有限的 float 字面量回退为
String,不再产生非有限 Float(§ 5.2 规则 14)。此外,字面遵循旧 § 3.3 /
§ 4 措辞、仅修剪指定 ASCII 空白的实现,还需有条件地审查 25 个码点集合
的其它成员在结构位置、空行、注释、根 dispatch、分隔符周围、标量/键边缘
及 stripped 块内容行中的迁移;这不是五项普遍变更之一。另有数值迁移风险:
0.7.0 的 binary64 最低域与 \`roundTiesToEven\` 可能改变此前以更窄域符合
规范的实现的值(例如 binary32 会将 \`16777217.0\` 舍入为 \`16777216.0\`);
这取决于实现,不是普遍适用的第六项变更。

`,
};
