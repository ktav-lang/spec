export default {
  en: `
\`\\uXXXX\` consists of the two bytes \`\\u\` followed by **exactly four**
hexadecimal digits (\`[0-9a-fA-F]\`, case-insensitive), naming a
16-bit code unit by its hexadecimal value. Fewer than four hex
digits following \`\\u\`, or a non-hex byte before the fourth digit, is
a \`BadEscapeSequence\` error (§ 6.13) — the escape is never partially
consumed. Exactly four digits are consumed; any further hex-looking
byte immediately after is ordinary content, not part of the escape:
an escape naming \`U+0041\` immediately followed by the literal digit
\`1\` decodes to \`A1\` — two characters, not a five-digit escape.

Code points outside the Basic Multilingual Plane (above \`U+FFFF\`) are
written as a **surrogate pair**: a high surrogate (\`U+D800\`–\`U+DBFF\`)
immediately followed by a low surrogate (\`U+DC00\`–\`U+DFFF\`), each as
its own \`\\uXXXX\` escape, combined per the UTF-16 surrogate-pair
algorithm into a single code point. A high surrogate not immediately
followed by a valid low-surrogate \`\\uXXXX\` escape, or a low surrogate
that does not immediately follow a high surrogate, is a **lone
surrogate** and is a \`BadEscapeSequence\` error — this specification
does not permit unpaired surrogates, unlike some other formats that
leave the case undefined. Code points immediately outside the
surrogate range (\`U+D7FF\` and \`U+E000\`) are ordinary code points, not
surrogates, and are valid on their own.

\`\\uXXXX\` is recognised only where escape sequences are recognised at
all: inline scalar values and keys. It is **not** processed inside
multi-line scalar values, multi-line string content (\`(…)\` /
\`((…))\`, § 5.6), or comments — in those contexts the six bytes
\`\\\`, \`u\`, and four following characters are literal content, exactly
as any other unrecognised-elsewhere escape form would be (§ 3.7,
"Escape sequences are NOT processed in", above).

A canonical writer emits ordinary Unicode content as UTF-8 directly;
it is under no obligation to represent any code point as \`\\uXXXX\`
instead. In canonical output this discretion is exercised nowhere
except within a key segment (§ 5.9.10): a non-empty scalar's body is
never escaped in canonical form at all (§ 5.9.4, § 5.9.7), and
§ 5.9.10's own key-escaping algorithm has no discretion of its
own — every code point it requires escaped uses the named form when
one exists and \`\\uXXXX\` otherwise, never a writer's choice between
the two. The SHOULD/MAY language below therefore describes a writer
producing hand-authored, non-canonical Ktav text, not the canonical
algorithm. Where such a writer chooses to escape a byte that also
has a named escape in the table above, it SHOULD prefer the named
form (\`\\.\` over the \`\\uXXXX\` form of the same code point, for
consistency with the other thirteen named forms) and use \`\\uXXXX\` only
for code points with no named escape. When \`\\uXXXX\` is emitted, the four hex
digits MUST be uppercase (\`0-9A-F\`) — parsing is case-insensitive
(§ 3.7.1 above), but two writer-conforming implementations emitting
the same code point MUST produce byte-identical output (§ 5.9's
determinism requirement).

`,
  ru: `
\`\\uXXXX\` состоит из двух байтов \`\\u\`, за которыми следуют **ровно
четыре** шестнадцатеричные цифры (\`[0-9a-fA-F]\`, регистр не важен),
задающие 16-битную кодовую единицу её шестнадцатеричным значением.
Менее четырёх hex-цифр после \`\\u\`, либо не-hex байт до четвёртой
цифры — ошибка \`BadEscapeSequence\` (§ 6.13): escape никогда не
поглощается частично. Поглощаются ровно четыре цифры; любые
дальнейшие похожие на hex байты сразу после — обычное содержимое,
не часть escape (escape, называющий \`U+0041\`, за которым сразу
следует литеральная цифра \`1\`, декодируется в \`A1\` — два символа,
а не в пятизначный escape).

Кодовые точки за пределами Basic Multilingual Plane (выше \`U+FFFF\`)
записываются **суррогатной парой**: высокий суррогат
(\`U+D800\`–\`U+DBFF\`), сразу за которым следует низкий суррогат
(\`U+DC00\`–\`U+DFFF\`), каждый — своей отдельной escape-последовательностью
\`\\uXXXX\`, объединяемые по алгоритму суррогатных пар UTF-16 в одну
кодовую точку. Высокий суррогат, за которым сразу не следует валидный
низкий суррогат в форме \`\\uXXXX\`, либо низкий суррогат, которому
не предшествует непосредственно высокий — это **одинокий
суррогат**, и это ошибка
\`BadEscapeSequence\` — данная спецификация не допускает непарные
суррогаты, в отличие от некоторых других форматов, оставляющих этот
случай неопределённым. Кодовые точки сразу за пределами диапазона
суррогатов (\`U+D7FF\` и \`U+E000\`) — обычные кодовые точки, не
суррогаты, и валидны сами по себе.

\`\\uXXXX\` распознаётся только там, где вообще распознаются
escape-последовательности: в inline-скалярных значениях и ключах.
Он **не** обрабатывается внутри многострочных скалярных значений,
содержимого многострочных строк (\`(…)\` / \`((…))\`, § 5.6) или
комментариев — в этих контекстах шесть байтов \`\\\`, \`u\` и четыре
следующих символа являются буквальным содержимым, точно так же, как
и любая другая нераспознанная в этих контекстах escape-форма
(см. выше «Escape-последовательности НЕ обрабатываются в»).

Канонический writer выводит обычное Unicode-содержимое напрямую как
UTF-8; он не обязан представлять какую-либо кодовую точку как
\`\\uXXXX\`. В каноническом выводе эта свобода выбора используется
нигде, кроме как внутри сегмента ключа (§ 5.9.10): тело непустого
скаляра в канонической форме вообще никогда не экранируется
(§ 5.9.4, § 5.9.7), а собственный алгоритм экранирования ключа из
§ 5.9.10 не имеет никакой свободы выбора — каждая кодовая точка,
которую он требует экранировать, использует именованную форму, если
она существует, и \`\\uXXXX\` в противном случае, но никогда не выбор
writer'а между ними. Поэтому формулировки SHOULD/MAY ниже описывают
writer, производящий написанный вручную, неканонический текст Ktav,
а не канонический алгоритм. Там, где writer решает экранировать
байт, у которого также есть именованный escape из таблицы выше, он
SHOULD предпочесть
именованную форму (\`\\.\` вместо формы \`\\uXXXX\` той же кодовой
точки, для согласованности с уже существующими десятью) и
использовать \`\\uXXXX\` только для кодовых точек без именованного
escape. Когда writer всё же выводит \`\\uXXXX\`, четыре hex-цифры
MUST быть в верхнем регистре (\`0-9A-F\`) — парсинг регистронезависим
(§ 3.7.1 выше), но два writer-conforming реализации, выводящие
одну и ту же кодовую точку, MUST давать побайтово идентичный
результат (требование детерминизма § 5.9).

`,
  zh: `
\`\\uXXXX\` 由两个字节 \`\\u\` 加上**恰好四位**十六进制数字
(\`[0-9a-fA-F]\`,大小写不敏感)组成,以十六进制值指定一个 16 位
码元。\`\\u\` 之后少于四位十六进制数字,或第四位数字之前出现非十六
进制字节,均为 \`BadEscapeSequence\` 错误(§ 6.13)—— escape 从不
被部分消费。恰好消费四位数字;紧随其后、看起来像十六进制的额外
字节属于普通内容,不属于该 escape(命名 \`U+0041\` 的 escape 后紧跟
字面数字 \`1\`,解码为 \`A1\`—— 两个字符,而非五位 escape)。

基本多文种平面(Basic Multilingual Plane,即 \`U+FFFF\` 以上)之外
的码点以**代理对**形式书写:一个高代理项(\`U+D800\`–\`U+DBFF\`)紧跟
一个低代理项(\`U+DC00\`–\`U+DFFF\`),各自为独立的 \`\\uXXXX\` escape,
按 UTF-16 代理对算法组合为单个码点。高代理项之后没有紧跟合法的低
代理项 \`\\uXXXX\` escape,或低代理项之前没有紧跟高代理项,均为**孤立
代理项**,是 \`BadEscapeSequence\` 错误 —— 本规范不允许未配对的代理
项,不同于某些其他格式将此情形留作未定义行为。紧邻代理区间之外的
码点(\`U+D7FF\` 与 \`U+E000\`)是普通码点,不是代理项,可单独有效。

\`\\uXXXX\` 仅在识别 escape 序列的位置被识别:inline 标量值与键。
它**不**在多行标量值、多行字符串内容(\`(…)\` / \`((…))\`,§ 5.6)或
注释中被处理 —— 在这些语境中,\`\\\`、\`u\` 及随后四个字符是字面内容,
与其他在这些语境中未被识别的 escape 形式一样(见上文「Escape 序列
不在以下场景处理」)。

规范 writer 直接以 UTF-8 输出普通 Unicode 内容;它没有义务将任何
码点表示为 \`\\uXXXX\`。在规范输出中,这种自由裁量权仅在键段
(§ 5.9.10)内被行使:非空标量的体在规范形式下从不被转义
(§ 5.9.4、§ 5.9.7),而 § 5.9.10 自身的键转义算法没有任何自由
裁量权 —— 它要求转义的每个码点,若存在命名形式则使用命名形式,
否则使用 \`\\uXXXX\`,从不由 writer 在二者之间选择。因此下文的
SHOULD/MAY 措辞描述的是产生手写、非规范 Ktav 文本的 writer,而非
规范算法。当 writer 选择转义一个在上表中也有命名形式的
字节时,SHOULD 优先使用命名形式(\`\\.\` 优于点的 \`\\uXXXX\` 形式,与
已有的十个保持一致),仅对没有命名形式的码点使用 \`\\uXXXX\`。当
writer 确实输出 \`\\uXXXX\` 时,四位十六进制数字 MUST 为大写
(\`0-9A-F\`)—— 解析不区分大小写(见上文 § 3.7.1),但两个
writer-conforming 实现输出同一码点时 MUST 产生字节相同的结果
(§ 5.9 的确定性要求)。

`,
};
