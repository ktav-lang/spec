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

0.7.0: § 3.3 whitespace changes from an implementation-defined \`MAY\`
to a fixed, exhaustively-enumerated 25-code-point \`MUST\` (§ 3.3);
§ 4's key-segment trimming widens from ASCII-only to the same fixed
set, resolving a standing internal contradiction; adds the \`\\uXXXX\`
escape (§ 3.7.1) and quoted keys (§ 5.3.3, delimiters \`"\` / \`'\` /
\`\` \` \`\`); the \`(…)\` multi-line string form now also strips
trailing whitespace from every content line — \`(…)\` already removed
each line's shared leading indent (§ 5.6). Five independently-scoped
breaking changes: value/key-edge trimming now covers 21 additional
code points beyond space/tab — VT and FF (§ 3.3's remaining two ASCII
whitespace members) plus the 19 non-ASCII code points in the § 3.3
set — non-breaking
in practice against every 0.6.x Rust-core release, which already
trimmed the full set there; the \`(…)\` trailing-edge strip is
breaking even for the Rust core, which previously preserved
trailing whitespace (including plain ASCII space/tab) on every line
of a stripped-form block; a line whose first content begins with
an unescaped \`"\`, \`'\`, or \`\` \` \`\` no longer necessarily parses as
before — the quote character now opens a quoted segment there instead
of being ordinary content, so e.g. an Object pair \`"port": 1\` now
names the key \`port\`, not \`"port"\` (§ 5.3.3, § 10.7, Appendix D);
a recognised escape in an inline scalar now forces String before keyword
or numeric classification (so \`1\\.0\` is String, not Float); and a float
literal that is non-finite in the declared Float domain now falls back to
String rather than producing a non-finite Float (§ 5.2 rule 14).

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

0.7.0: § 3.3 меняется с зависящего от реализации \`MAY\` на
фиксированное, исчерпывающе перечисленное \`MUST\` из 25 кодовых точек
(§ 3.3); trimming ключевых сегментов в § 4 расширяется с ASCII-only
на тот же фиксированный набор, устраняя действовавшее внутреннее
противоречие; добавлена escape-последовательность \`\\uXXXX\` (§ 3.7.1)
и квотированные ключи (§ 5.3.3, разделители \`"\` / \`'\` / \`\` \` \`\`);
многострочная строковая форма \`(…)\` теперь также обрезает
завершающие пробельные символы каждой содержательной строки —
\`(…)\` уже убирала общий ведущий отступ каждой строки (§ 5.6). Пять
независимо-ограниченных ломающих изменения: обрезка на границе
значения/ключа теперь покрывает 21 дополнительную кодовую точку
сверх пробела/табуляции — VT и FF (два оставшихся ASCII-члена
множества § 3.3) плюс 19 не-ASCII кодовых точек этого множества —
на практике не ломающее ни
для одного релиза 0.6.x Rust-ядра, которое уже обрезало там полный
набор; замыкающая обрезка \`(…)\` — ломающая даже для Rust-ядра,
которое ранее сохраняло замыкающие пробельные символы (включая
обычный ASCII-пробел/табуляцию) на каждой строке stripped-блока;
строка, содержательная часть которой начинается с неэкранированного
\`"\`, \`'\` или \`\` \` \`\`, больше не обязательно разбирается как раньше —
теперь символ кавычки открывает там квотированный сегмент вместо
того, чтобы быть обычным содержимым, так что, например, пара объекта
\`"port": 1\` теперь именует ключ \`port\`, а не \`"port"\` (§ 5.3.3,
§ 10.7, Приложение D); распознанный escape в inline-скаляре теперь
фиксирует String до классификации ключевого слова или числа (поэтому
\`1\\.0\` — String, а не Float); а float-литерал, неконечный в заявленном
домене Float, теперь проваливается в String вместо порождения неконечного
Float (§ 5.2, правило 14).

`,
  zh: `
Ktav 是一种基于纯文本的配置格式,设计目标是让每一行都能够独立成立,
或仅依赖其上方明确可见的括号。它提供 JSON 的数据形态(标量、数组、
对象、\`null\`、布尔值),但没有 JSON 的标点符号:字符串无引号、常规
情况下无 escape 序列。嵌套键使用点分路径。多行字符串与单行复合值使
用小巧而清晰的 opt-in 标记。

本文档规定格式 0.7.0 版本的语法与语义。任何编程语言的实现可声明
「Ktav 0.7.0 兼容性」,当且仅当满足以下每一条规范性声明。

0.7.0:§ 3.3 从依赖具体实现的 \`MAY\` 变为固定的、穷举列出的 25 个码点
的 \`MUST\`(§ 3.3);§ 4 的键段 trim 规则从仅 ASCII 扩展到同一固定集合,
解决了此前存在的内部矛盾;新增 \`\\uXXXX\` escape(§ 3.7.1)以及带引号
的键(§ 5.3.3,分隔符 \`"\` / \`'\` / \`\` \` \`\`);多行字符串
\`(…)\` 形式现在还会去除每个内容行的尾部空白 —— \`(…)\` 此前已去除每行
共享的前导缩进(§ 5.6)。五项范围各自独立的破坏性变更:值/键边界的
trim 现在在空格/制表符之外额外覆盖 21 个码点:VT 与 FF(§ 3.3 集合中
剩余的两个 ASCII 空白成员),加上该集合中的 19 个非 ASCII 码点 ——
相对于每一个已发布的 0.6.x Rust 核心版本,实际上并非破坏性,它们本就
已经去除了完整的集合;\`(…)\` 的尾部 trim 即使对 Rust 核心也是破坏性的
—— 它此前在 stripped 块的每一行都保留尾部空白(包括普通 ASCII
空格/制表符);某一行的内容部分若以未转义的 \`"\`、\`'\` 或 \`\` \` \`\`
开头,不再必然按此前的方式解析 —— 引号字符现在会在该处开启一个带
引号的段,而不再作为普通内容,因此例如对象键值对 \`"port": 1\` 现在
命名的键是 \`port\`,而不是 \`"port"\`(§ 5.3.3、§ 10.7、附录 D);inline
标量中已识别的 escape 现在会在关键字或数字分类之前强制为 String
(因此 \`1\\.0\` 是 String 而非 Float);而在声明的 Float 域中非有限的
float 字面量现在回退为 String,不再产生非有限 Float(§ 5.2 规则 14)。

`,
};
