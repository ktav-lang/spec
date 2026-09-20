>>>>> lang=en

Ktav is a plain-text configuration format designed so that every line
either stands on its own or depends only on explicit, visible brackets.
It offers JSON-shape (scalars, arrays, objects, `null`, booleans) with
none of JSON's punctuation: no quotes around strings, no escape
sequences in the common case. Nested keys use a dotted path.
Multi-line strings and inline compounds use small, visible opt-in
markers.

This document specifies the syntax and semantics of the format at
version 0.8.0. Implementations in any programming language may claim
"Ktav 0.8.0 compliance" iff they satisfy every normative statement
below.

0.8.0: § 5.2's rules 13–14 gain a redundant-leading-zero exception, and
§ 8.1 gains an obligation on a parser-conforming implementation to expose
a strict parsing entry point. The one universal breaking change is: a
base-10 digit run whose first digit is `0` while at least one further
digit follows — `01234`, `-045`, `00`, `0_7`, and a float's integer part
in `01.5`, `05e3` — is no longer inferred as a number at all. Such a body
falls through to rule 15 and is a String carrying the digits exactly as
written, so `zip: 01234` is `String("01234")` and not `Integer(1234)`,
through every entry point. `0`, `0.5`, `0x1A`, `0o755`, `0b1010`,
`1_000_000` and `+7` are unaffected, and canonical renderings do not
change — the writer keys the `::` marker to § 3.6's grammar, which is
untouched. Separately, § 8.1 now requires a strict parsing entry point
that rejects a lossy scalar with `LossyScalar`; that is an obligation on
an implementation rather than a change to what a document means, and no
known implementation is affected, because the reference implementation
already behaved this way before the corpus that checks it existed.

>>>>> lang=ru

Ktav — это конфигурационный формат на основе обычного текста,
спроектированный так, чтобы каждая строка либо самодостаточна, либо
зависит только от явно видимых скобок. Он
предоставляет JSON-форму (скаляры, массивы, объекты, `null`,
булевы значения) без JSON-пунктуации: без кавычек вокруг строк,
без escape-последовательностей в обычном случае. Вложенные ключи
используют точечный путь. Многострочные строки и однострочные
составные значения используют небольшие видимые маркеры, включаемые
по выбору.

Данный документ описывает синтаксис и семантику формата на версии
0.8.0. Реализации на любом языке программирования могут заявить
«соответствие Ktav 0.8.0» если и только если они выполняют каждое
нормативное утверждение ниже.

0.8.0: правила 13–14 § 5.2 получают исключение для избыточного ведущего
нуля, а § 8.1 получает обязательство для parser-конформной реализации
предоставлять строгую точку входа парсинга. Единственное универсальное
ломающее изменение: ряд десятичных цифр, первая цифра которого `0`, при
том что за ней следует хотя бы одна цифра, — `01234`, `-045`, `00`,
`0_7`, а также целая часть float в `01.5`, `05e3` — больше вообще не
выводится как число. Такое тело проваливается в правило 15 и является
String, несущей цифры точно как написано, поэтому `zip: 01234` — это
`String("01234")`, а не `Integer(1234)`, через любую точку входа. `0`,
`0.5`, `0x1A`, `0o755`, `0b1010`, `1_000_000` и `+7` не затронуты, а
канонические представления не меняются — writer привязывает маркер `::`
к грамматике § 3.6, которая не изменилась. Отдельно: § 8.1 теперь
требует строгую точку входа парсинга, которая отвергает скаляр с
потерями через `LossyScalar`; это обязательство для реализации, а не
изменение смысла документа, и ни одна известная реализация не затронута,
поскольку референсная реализация вела себя так уже до появления корпуса,
который это проверяет.

>>>>> lang=zh

Ktav 是一种基于纯文本的配置格式,设计目标是让每一行都能够独立成立,
或仅依赖明确可见的括号。它提供 JSON 的数据形态(标量、数组、
对象、`null`、布尔值),但没有 JSON 的标点符号:字符串无引号、常规
情况下无 escape 序列。嵌套键使用点分路径。多行字符串与单行复合值使
用小巧而清晰的 opt-in 标记。

本文档规定格式 0.8.0 版本的语法与语义。任何编程语言的实现可声明
「Ktav 0.8.0 兼容性」,当且仅当满足以下每一条规范性声明。

0.8.0:§ 5.2 的规则 13–14 新增冗余前导零例外,§ 8.1 新增对 parser
一致性实现的义务,要求其提供严格解析入口。唯一普遍适用的破坏性变更是:
首位数字为 `0` 且其后至少还有一位数字的十进制数字串 —— `01234`、
`-045`、`00`、`0_7`,以及 `01.5`、`05e3` 中 float 的整数部分 ——
不再被推断为数字。这样的体落入规则 15,成为原样承载这些数字的
String,因此 `zip: 01234` 是 `String("01234")` 而不是 `Integer(1234)`,
且经由任何入口皆然。`0`、`0.5`、`0x1A`、`0o755`、`0b1010`、
`1_000_000` 与 `+7` 不受影响,规范渲染也不改变 —— writer 将 `::`
标记绑定到未变动的 § 3.6 语法。此外,§ 8.1 现在要求提供严格解析
入口,以 `LossyScalar` 拒绝有损标量;这是对实现的义务,而非对文档
含义的改变,且没有已知实现受影响,因为参考实现早在检查它的语料库
出现之前就已如此行事。

