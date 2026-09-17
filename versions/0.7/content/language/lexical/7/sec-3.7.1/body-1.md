>>>>> lang=en

`\uXXXX` consists of the two bytes `\u` followed by **exactly four**
hexadecimal digits (`[0-9a-fA-F]`, case-insensitive), naming a
16-bit code unit by its hexadecimal value. Fewer than four hex
digits following `\u`, or a non-hex byte before the fourth digit, is
a `BadEscapeSequence` error (§ 6.13) — the escape is never partially
consumed. Exactly four digits are consumed; any further hex-looking
byte immediately after is ordinary content, not part of the escape:
an escape naming `U+0041` immediately followed by the literal digit
`1` decodes to `A1` — two characters, not a five-digit escape.

Code points outside the Basic Multilingual Plane (above `U+FFFF`) are
written as a **surrogate pair**: a high surrogate (`U+D800`–`U+DBFF`)
immediately followed by a low surrogate (`U+DC00`–`U+DFFF`), each as
its own `\uXXXX` escape, combined per the UTF-16 surrogate-pair
algorithm into a single code point. A high surrogate not immediately
followed by a valid low-surrogate `\uXXXX` escape, or a low surrogate
that does not immediately follow a high surrogate, is a **lone
surrogate** and is a `BadEscapeSequence` error — this specification
does not permit unpaired surrogates, unlike some other formats that
leave the case undefined. Code points immediately outside the
surrogate range (`U+D7FF` and `U+E000`) are ordinary code points, not
surrogates, and are valid on their own.

>>>>> lang=ru

`\uXXXX` состоит из двух байтов `\u`, за которыми следуют **ровно
четыре** шестнадцатеричные цифры (`[0-9a-fA-F]`, регистр не важен),
задающие 16-битную кодовую единицу её шестнадцатеричным значением.
Менее четырёх hex-цифр после `\u`, либо не-hex байт до четвёртой
цифры — ошибка `BadEscapeSequence` (§ 6.13): escape никогда не
поглощается частично. Поглощаются ровно четыре цифры; любые
дальнейшие похожие на hex байты сразу после — обычное содержимое,
не часть escape (escape, называющий `U+0041`, за которым сразу
следует литеральная цифра `1`, декодируется в `A1` — два символа,
а не в пятизначный escape).

Кодовые точки за пределами Basic Multilingual Plane (выше `U+FFFF`)
записываются **суррогатной парой**: высокий суррогат
(`U+D800`–`U+DBFF`), сразу за которым следует низкий суррогат
(`U+DC00`–`U+DFFF`), каждый — своей отдельной escape-последовательностью
`\uXXXX`, объединяемые по алгоритму суррогатных пар UTF-16 в одну
кодовую точку. Высокий суррогат, за которым сразу не следует валидный
низкий суррогат в форме `\uXXXX`, либо низкий суррогат, которому
не предшествует непосредственно высокий — это **одинокий
суррогат**, и это ошибка
`BadEscapeSequence` — данная спецификация не допускает непарные
суррогаты, в отличие от некоторых других форматов, оставляющих этот
случай неопределённым. Кодовые точки сразу за пределами диапазона
суррогатов (`U+D7FF` и `U+E000`) — обычные кодовые точки, не
суррогаты, и валидны сами по себе.

>>>>> lang=zh

`\uXXXX` 由两个字节 `\u` 加上**恰好四位**十六进制数字
(`[0-9a-fA-F]`,大小写不敏感)组成,以十六进制值指定一个 16 位
码元。`\u` 之后少于四位十六进制数字,或第四位数字之前出现非十六
进制字节,均为 `BadEscapeSequence` 错误(§ 6.13)—— escape 从不
被部分消费。恰好消费四位数字;紧随其后、看起来像十六进制的额外
字节属于普通内容,不属于该 escape(命名 `U+0041` 的 escape 后紧跟
字面数字 `1`,解码为 `A1`—— 两个字符,而非五位 escape)。

基本多文种平面(Basic Multilingual Plane,即高于 `U+FFFF`)之外
的码点以**代理对**形式书写:一个高代理项(`U+D800`–`U+DBFF`)紧跟
一个低代理项(`U+DC00`–`U+DFFF`),各自为独立的 `\uXXXX` escape,
按 UTF-16 代理对算法组合为单个码点。高代理项之后没有紧跟合法的低
代理项 `\uXXXX` escape,或低代理项之前没有紧跟高代理项,均为**孤立
代理项**,是 `BadEscapeSequence` 错误 —— 本规范不允许未配对的代理
项,不同于某些其他格式将此情形留作未定义行为。紧邻代理区间之外的
码点(`U+D7FF` 与 `U+E000`)是普通码点,不是代理项,可单独有效。

