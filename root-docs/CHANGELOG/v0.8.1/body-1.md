>>>>> lang=en
## [0.8.1] — 2026-10-21

Editorial errata and regression coverage. No new value-inference or canonical-output rules are introduced.

- § 5.1: consume the first content line exactly once. An inline root is the whole Value; a lone `{` / `[` opens the root itself. An explicit root left open at EOF is `UnclosedCompound`; implicit roots need no closer.
- § 6.15: UTF-8 validation precedes grammar diagnostics, but LF, CR and CRLF can be counted in raw bytes. The existing source-error location requirement applies to `InvalidUtf8`; no exact span width is introduced.
- Corpus: 228 valid and 90 invalid fixtures, including uppercase-prefix Strings, unclosed explicit roots and malformed UTF-8, plus valid U+FFFD and U+10FFFF controls. Manifest schema remains 1; diagnostic coordinates are checked by implementation tests, not new oracle fields.

Lowercase-only numeric prefixes and explicit closing delimiters were already required by 0.8.0. The added witnesses expose implementation defects; they do not redefine the language.

>>>>> lang=ru
## [0.8.1] — 2026-10-21

Редакционные исправления и регрессионное покрытие. Новые правила вывода типов или канонического вывода не вводятся.

- § 5.1: первая содержательная строка потребляется ровно один раз. Inline-корень — весь Value; одиночная `{` / `[` открывает сам корень. Незакрытый к EOF явный корень — `UnclosedCompound`; неявному корню закрыватель не нужен.
- § 6.15: проверка UTF-8 предшествует грамматической диагностике, но LF, CR и CRLF можно считать в сырых байтах. Существующее требование к позиции ошибки применяется к `InvalidUtf8`; точная ширина span не предписывается.
- Корпус: 228 valid и 90 invalid fixtures, включая String с префиксами в верхнем регистре, незакрытые явные корни и невалидный UTF-8, а также валидные контроли U+FFFD и U+10FFFF. Схема manifest остаётся 1; координаты диагностики проверяются тестами реализаций, без новых полей oracle.

Числовые префиксы только в нижнем регистре и явные закрывающие разделители уже требовались в 0.8.0. Новые примеры выявляют дефекты реализаций, а не меняют язык.

>>>>> lang=zh
## [0.8.1] —— 2026-10-21

编辑勘误与回归覆盖。没有引入新的类型推断或规范输出规则。

- § 5.1：首条内容行只消费一次。Inline 根就是整个 Value；单独的 `{` / `[` 开启根本身。到 EOF 仍未闭合的显式根产生 `UnclosedCompound`；隐式根不需要闭合符。
- § 6.15：UTF-8 校验先于语法诊断，但可直接在原始字节中计数 LF、CR 和 CRLF。现有的源错误位置要求同样适用于 `InvalidUtf8`；未规定精确的 span 宽度。
- 语料库：228 个 valid 和 90 个 invalid fixtures，覆盖大写前缀 String、未闭合的显式根及无效 UTF-8，并增加有效 U+FFFD 和 U+10FFFF 对照。Manifest schema 仍为 1；诊断坐标由实现测试检查，不新增 oracle 字段。

仅允许小写数值前缀和显式闭合符的要求在 0.8.0 中已存在。新增用例揭示实现缺陷，并未重新定义语言。

