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

`,
  zh: `
Ktav 是一种基于纯文本的配置格式,设计目标是让每一行都能够独立成立,
或仅依赖其上方明确可见的括号。它提供 JSON 的数据形态(标量、数组、
对象、\`null\`、布尔值),但没有 JSON 的标点符号:字符串无引号、常规
情况下无 escape 序列。嵌套键使用点分路径。多行字符串与单行复合值使
用小巧而清晰的 opt-in 标记。

本文档规定格式 0.7.0 版本的语法与语义。任何编程语言的实现可声明
「Ktav 0.7.0 兼容性」,当且仅当满足以下每一条规范性声明。

`,
};
