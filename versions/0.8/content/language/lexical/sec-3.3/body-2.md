>>>>> lang=en
Whitespace at the beginning of a line is **indentation** and is
significant for human readability only — the parser ignores it
(except as a separator inside line tokens). Whitespace inside line
tokens and around inline-compound delimiters is optional everywhere
the grammar permits it (§ 4); implementations MAY emit canonical
formatting with explicit single-space separators.

This is the single definition of whitespace used throughout this
specification — for line-level structural recognition (comment
markers, blank lines, compound openers/closers, § 4's grammar
notation) exactly as much as for trimming the edges of key segments,
scalar values, and multi-line string content (§ 5.6). There is no
separate, narrower "structural" whitespace concept.

>>>>> lang=ru
Пробелы в начале строки — это **отступ** и значимы только для
читабельности; парсер их игнорирует (за исключением случаев, когда
они служат разделителем внутри токенов строки). Пробельные символы
внутри токенов строки и вокруг разделителей однострочных составных
значений необязательны везде, где грамматика это допускает (§ 4);
реализации MAY генерировать каноническое форматирование с явным
одиночным пробелом-разделителем.

Это единое определение пробельного символа используется во всей
спецификации — в равной мере для структурного распознавания на
уровне строк (маркеры комментариев, пустые строки, открывающие/
закрывающие скобки составных значений, нотация грамматики § 4) и для
обрезки границ ключевых сегментов, скалярных значений и содержимого
многострочных строк (§ 5.6). Отдельного, более узкого понятия
«структурного» пробела не существует.

>>>>> lang=zh
行首空白是**缩进**,仅对人类可读性有意义;解析器忽略之(除非用作
行内 token 的分隔符)。行内 token 中的空白以及单行复合值分隔符
周围的空白在语法允许的位置都是可选的(§ 4);实现 MAY 输出带显式
单空格分隔符的规范格式。

这是贯穿本规范全文使用的唯一空白定义 —— 无论是用于行级结构识别
(注释标记、空行、复合值的开闭括号、§ 4 的文法记号),还是用于
trim 键段、标量值与多行字符串内容(§ 5.6)的边界,均一致适用。不存
在另一个更窄的「结构性」空白概念。

