export default {
  en: `<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-raw-scalar> ::= sequence of bytes after the raw marker,
                        terminated by the first unescaped "," / "}" /
                        "]" or by <line-end> (which is an error per
                        § 6.11); surrounding whitespace is trimmed from
                        this sequence before § 3.7 escape processing,
                        and the resulting bytes are the literal String
                        body. This production does NOT dispatch through
                        <inline-value> or <inline-scalar>; an initial
                        "{" or "[" is literal data.
<inline-scalar>    ::= sequence of bytes terminated by an unescaped
                       "," / "}" / "]" or by <line-end> (which is
                       an error per § 6.11); escape sequences per
                       § 3.7 are processed; surrounding whitespace
                       is trimmed before dispatch to § 5.2

<multiline-content-line> ::= any line within an open <multiline>
                             followed by <line-end>;
                             the terminator (")" or "))") ends the block
\`\`\`

Notes on the notation:

- \`(ws)\` stands for zero or more line-bounded \`ws\` code points defined
  above; LF and CR are excluded.
- \`1*ws\` stands for **one or more** of those same line-bounded code points.
- \`!\` is a zero-width negative lookahead: \`!X\` succeeds only when \`X\`
  does not match at the current position, and consumes nothing.
- \`<sep-end>\` stands for "at least one line-bounded whitespace code point,
  or the end of the line". After a separator it MUST consume the whole
  immediately following contiguous run of such whitespace code points (the
  maximal run); the remaining bytes form the body. This also applies to a
  raw-marker array item, so both spaces in \`::  x\` belong to \`<sep-end>\`
  and the value is \`x\`, not \` x\`. It is used after the multi-line pair
  separators (\`:\`, \`::\`). Writing \`key:value\` (no whitespace, no EOL
  after the separator) is a syntax error in the multi-line pair form — see
  § 6.10. Inline-compound pairs (§ 5.8) do not require whitespace after
  \`:\` / \`::\`.
- For array-item dispatch, after trimming, a leading \`::\` commits to
  \`<item-literal>\` before \`<item-value>\` is considered. If \`<sep-end>\`
  is absent (for example, the sole line \`::x\`), the parser MUST report
  \`MissingSeparatorSpace\` and MUST NOT fall back to scalar \`<item-value>\`.
- \`&line-end\` is a zero-width positive lookahead for \`<line-end>\`; it
  matches either eol or EOF without consuming it. Every line production
  consumes exactly one \`<line-end>\`, so a final line need not have a
  terminator byte. EOF is a terminal zero-byte marker: it may terminate only
  the final line production and the \`<line-end>\` at EOF may be consumed at
  most once; this prevents \`<line>*\` from repeating a zero-width \`blank\`
  production when \`(ws)=0\` at EOF.
- \`any-chars-until-line-end\` denotes zero or more source bytes and stops
  before (without consuming) \`<line-end>\`; the enclosing line production
  consumes it. The zero-length case permits an empty \`<comment-body>\`.
  \`<raw-line>\` is a line-bounded alias for the same zero-or-more form;
  its zero-length case permits an empty raw-marker \`<item-literal>\` or
  raw pair value.
- At an inline-pair position, the parser MUST recognise the two-byte raw
  marker \`::\` before the one-byte plain separator \`:\`. Equivalently,
  \`<plain-inline-separator>\` is inapplicable when the next byte is \`:\`;
  \`::\` can never be parsed as a plain \`:\` followed by a value. After
  \`::\`, the parser uses the dedicated \`<inline-raw-scalar>\` production,
  not \`<inline-value>\` or \`<inline-scalar>\`: it consumes through the
  first unescaped delimiter, processes escapes, and treats an initial
  \`{\` or \`[\` as literal content. The \`::\` marker therefore cannot
  open or recurse into a compound.
- The \`<inline-value>\` alternatives are checked **left-to-right** on
  the first non-whitespace code point of the inline-value position. If that
  byte is \`{\`, the value is a nested inline object (matching one of
  the first two \`{\`-rules) and MUST close with \`}\` on the same line;
  if the byte is \`[\`, it is a nested inline array. Any other first
  byte makes the value an \`<inline-scalar>\`. The decision is taken
  once, at the start of the inline-value position; subsequent \`{\`
  or \`[\` bytes inside the inline scalar are literal data (§ 5.8.5).

`,
  ru: `<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-raw-scalar> ::= последовательность байтов после raw-маркера
                        до первого неэкранированного "," / "}" /
                        "]" или до <line-end> (что является ошибкой
                        по § 6.11); окружающие пробелы обрезаются из
                        этой последовательности перед обработкой escape
                        по § 3.7, а получившиеся байты являются телом
                        литеральной String. Эта продукция НЕ проходит
                        через <inline-value> или <inline-scalar>; начальные
                        "{" или "[" являются литеральными данными.
<inline-scalar>    ::= последовательность байтов до неэкранированного
                       "," / "}" / "]" или до <line-end> (что —
                       ошибка по § 6.11); escape-последовательности
                       по § 3.7 обрабатываются; окружающие пробелы
                       обрезаются перед классификацией по § 5.2

<multiline-content-line> ::= любая строка внутри открытого <multiline>,
                             за которой следует <line-end>;
                             терминатор (")" или "))") закрывает блок
\`\`\`

Примечания к нотации:

- \`(ws)\` — ноль или более определённых выше ограниченных строкой кодовых
  точек \`ws\`; LF и CR исключены.
- \`1*ws\` — **одна или более** тех же ограниченных строкой кодовых точек.
- \`!\` — нулевой ширины отрицательный lookahead для следующего элемента
  грамматики: \`!X\` срабатывает только если \`X\` не совпадает в текущей
  позиции, и ничего не поглощает.
- \`<sep-end>\` — «как минимум одна ограниченная строкой пробельная кодовая
  точка или конец строки».
  После разделителя MUST поглощаться вся непосредственно следующая
  непрерывная последовательность таких пробельных кодовых точек (то есть
  максимальный contiguous run), а оставшиеся байты образуют тело; это также
  относится к raw-маркерным array-item. Поэтому в \`::  x\` оба пробела
  принадлежат \`<sep-end>\`, а значение равно \`x\`, не \` x\`.
  Используется после разделителей пар многострочной формы (\`:\`,
  \`::\`). Запись \`key:value\` (без пробела, без EOL после разделителя) —
  синтаксическая ошибка в многострочной форме пары — см. § 6.10.
  Inline-пары в составных (§ 5.8) НЕ требуют пробела после \`:\` /
  \`::\`.
- При разборе array-item после обрезки ведущий \`::\` фиксирует выбор
  \`<item-literal>\` до рассмотрения \`<item-value>\`. Если \`<sep-end>\`
  отсутствует (например, единственная строка \`::x\`), parser MUST сообщить
  \`MissingSeparatorSpace\` и MUST NOT откатываться к scalar \`<item-value>\`.
- \`&line-end\` — нулевой ширины положительный lookahead для \`<line-end>\`; он
  совпадает с eol или EOF, не поглощая их. Каждая продукция строки
  поглощает ровно один \`<line-end>\`, поэтому последняя строка может
  не иметь байта-терминатора. EOF — конечный нулевой байтовый маркер: он
  может завершить только последнюю продукцию строки, а \`<line-end>\` в EOF
  поглощается не более одного раза; поэтому \`<line>*\` не может повторять
  нулевую по ширине продукцию \`blank\` при \`(ws)=0\` и EOF.
- \`any-chars-until-line-end\` обозначает ноль или более байтов исходного
  текста и останавливается перед \`<line-end>\`, не поглощая его; его поглощает
  окружающая продукция строки. Нулевая длина допускает пустой
  \`<comment-body>\`. \`<raw-line>\` — ограниченный строкой псевдоним той
  же формы «ноль или более»; его нулевая длина допускает пустой
  raw-маркерный \`<item-literal>\` или raw-значение пары.
- В позиции inline-пары парсер MUST распознавать двухбайтовый raw-маркер
  \`::\` раньше однобайтового обычного разделителя \`:\`. Эквивалентно,
  \`<plain-inline-separator>\` неприменим, если следующий байт — \`:\`;
  \`::\` никогда нельзя разобрать как обычный \`:\` с последующим
  значением. После \`::\` используется специальная продукция
  \`<inline-raw-scalar>\`, а не \`<inline-value>\` и не
  \`<inline-scalar>\`: она идёт до первого неэкранированного разделителя,
  обрабатывает escape и считает начальные \`{\` или \`[\` литеральными
  данными. Поэтому \`::\` не может открыть или рекурсивно разобрать
  составное значение.
- Альтернативы \`<inline-value>\` проверяются **слева-направо** по
  первому непробельному байту в позиции inline-значения. Если этот
  байт — \`{\`, значение — вложенный inline-объект (одна из первых
  двух \`{\`-альтернатив) и MUST закрыться \`}\` на той же строке; если
  байт — \`[\`, значение — вложенный inline-массив. Любой другой
  первый байт делает значение \`<inline-scalar>\`. Решение принимается
  один раз, в начале позиции inline-значения; последующие байты
  \`{\` / \`[\` внутри inline-скаляра — литеральные данные (§ 5.8.5).

`,
  zh: `<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-raw-scalar> ::= raw 标记之后的字节序列,
                        在第一个未 escape 的 "," / "}" /
                        "]" 或 <line-end> 处终止(后者按
                        § 6.11 为错误);该序列的周围空白
                        在 § 3.7 escape 处理之前修剪,
                        所得字节就是字面 String 体。此产生式
                        不经过 <inline-value> 或
                        <inline-scalar> 分发;初始 "{" 或
                        "[" 是字面数据。
<inline-scalar>    ::= 由未 escape 的 "," / "}" / "]" 或
                       <line-end> 终止的字节序列(后者按
                       § 6.11 为错误);§ 3.7 的 escape
                       序列被处理;周围空白在分发到
                       § 5.2 前被修剪

<multiline-content-line> ::= 打开的 <multiline> 内的任意行,
                             后随 <line-end>;
                             终止符 (")" 或 "))") 关闭该块
\`\`\`

关于该记法的说明:

- \`(ws)\` 表示零个或多个上文定义的行边界内 \`ws\` 码点;LF 和 CR
  不包括在内。
- \`1*ws\` 表示**一个或多个**同样的行边界内码点。
- \`!\` 表示针对下一个语法元素的零宽负向先行断言: \`!X\` 仅当
  \`X\` 在当前位置不匹配时成功,且不消耗任何内容。
- \`<sep-end>\` 表示「至少一个行边界内空白码点,或行末」。分隔符之后
  MUST 吸收所有紧接着的、连续的此类空白码点(即 maximal contiguous
  run),剩余字节才构成体;这同样适用于 raw-marker array-item。因此
  在 \`::  x\` 中两个空格都属于 \`<sep-end>\`,值是 \`x\`,而不是
  \` x\`。它用在多行
  pair 分隔符(\`:\`、\`::\`)之后。写 \`key:value\`(分隔符后无空白、
  无行末)在多行 pair 形式中是语法错误 —— 见 § 6.10。inline
  复合值(§ 5.8)中的对不要求 \`:\` / \`::\` 之后有空白。
- 对 array-item 的分发,修剪后,前导 \`::\` 在考虑 \`<item-value>\`
  之前即提交到 \`<item-literal>\`。若缺少 \`<sep-end>\`(例如唯一一行
  \`::x\`),parser MUST 报告 \`MissingSeparatorSpace\`,且 MUST NOT 回退
  到 scalar \`<item-value>\`。
- \`&line-end\` 是针对 \`<line-end>\` 的零宽正向先行断言 —— 它匹配
  eol 或 EOF 而不消耗它。每个行产生式恰好消耗一个 \`<line-end>\`,
  因此最后一行可以没有终止字节。EOF 是终结性的零字节标记:只能终止
  最后一个行产生式,且 EOF 处的 \`<line-end>\` 最多消耗一次;因此在
  \`(ws)=0\` 且到达 EOF 时,\`<line>*\` 不会重复零宽的 \`blank\` 产生式。
- \`any-chars-until-line-end\` 表示零个或多个源字节,在 \`<line-end>\`
  之前停止且不消耗它;由外层行产生式消耗该终止符。零长度情形允许
  空 \`<comment-body>\`。\`<raw-line>\` 是同一零个或多个形式的行界
  别名;其零长度情形允许空 raw-marker \`<item-literal>\` 或空 raw pair 值。
- 在 inline pair 位置,parser MUST 先识别两字节 raw 标记 \`::\`,再识别
  单字节普通分隔符 \`:\`。等价地,若下一个字节是 \`:\`,则
  \`<plain-inline-separator>\` 不适用;\`::\` 绝不能解析为普通 \`:\`
  加后续值。\`::\` 之后使用专用 \`<inline-raw-scalar>\` 产生式,而非
  \`<inline-value>\` 或 \`<inline-scalar>\`:它延伸到第一个未 escape 的
  分隔符,处理 escape,并将初始 \`{\` 或 \`[\` 视为字面内容。因此
  \`::\` 不能开启或递归解析复合值。
- \`<inline-value>\` 的各候选按 inline 值位置上**首个非空白码点**
  从左到右检查。若该字节为 \`{\`,值是嵌套 inline 对象(匹配前两条
  \`{\`-规则之一)且 MUST 在同一行以 \`}\` 关闭;若该字节为 \`[\`,
  则是嵌套 inline 数组。任何其他首字节使值成为 \`<inline-scalar>\`。
  决定一次性作出,位于 inline 值位置的开头;之后 inline 标量内的
  \`{\` 或 \`[\` 字节均为字面数据(§ 5.8.5)。

`,
};
