>>>>> lang=en
## Markdown safety contract

Unit body text MUST NOT contain a raw HTML block opener outside a confirmed
fenced code block. This closed-world rule covers all seven CommonMark HTML
block forms: `script/pre/style/textarea` tags, comments, processing instructions,
declarations, CDATA sections, the block-tag list, and other complete open or
close tags. Type 7 applies only when the line is a complete valid open or
closing tag plus optional whitespace, so autolinks,
malformed tag-like text, and inline-tag prose are not forbidden by that rule.
HTML-like text inside a confirmed fenced code block remains allowed.

>>>>> lang=ru
## Контракт безопасности Markdown

Текст тела юнита MUST NOT содержать открывающую строку HTML-блока вне
подтверждённого fenced code block. Это закрытое правило охватывает все семь
форм HTML-блоков CommonMark: теги `script/pre/style/textarea`, комментарии,
processing instructions, декларации, секции CDATA, список блочных тегов и
прочие полные открывающие или закрывающие теги. Тип 7 применяется только когда
строка целиком состоит из корректного открывающего или закрывающего тега и
необязательных пробельных символов; autolink, некорректный текст, похожий на
тег, и проза со встроенными тегами этим правилом не запрещены. HTML-подобный
текст внутри подтверждённого fenced code block по-прежнему разрешён.

>>>>> lang=zh
## Markdown 安全契约

单元正文 MUST NOT 在已确认的 fenced code block 之外包含原始 HTML 块
开启语法。此封闭规则涵盖 CommonMark 的全部七种 HTML 块形式：
`script/pre/style/textarea` 标签、注释、处理指令、声明、CDATA 区段、块级标签
列表，以及其他完整的开始或结束标签。类型 7 仅在线路完整由有效的开始或结束
标签及可选空白组成时适用；自动链接、格式错误的类标签文本和含内联标签的正文
不受该规则禁止。已确认的 fenced code block 内仍允许类似 HTML 的文本。

