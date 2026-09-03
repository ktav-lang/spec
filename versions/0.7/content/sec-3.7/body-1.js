export default {
  en: `
Inside an **inline scalar value** (the body of a pair value or array
item that appears inside an inline compound, § 5.8) and inside
**keys** (the key portion of a pair, § 5.3), a backslash byte \`\\\`
begins an **escape sequence**. The following **fourteen** escape
sequences are recognised; each is replaced by the indicated byte or
code point before further classification (§ 5.2 for values) or
key-segment splitting (§ 4 for keys). A position consumed by any
recognised escape — named or \`\\uXXXX\` — is never re-examined as a
structural delimiter (dotted-path dot, pair-separator colon, inline
comma/brace/bracket, quoted-segment delimiter): this holds uniformly,
regardless of which of the fourteen forms produced the decoded byte.

| Sequence | Replacement |
|----------|-------------|
| \`\\\\\`     | \`\\\` (one backslash byte) |
| \`\\,\`     | \`,\` |
| \`\\}\`     | \`}\` |
| \`\\]\`     | \`]\` |
| \`\\{\`     | \`{\` |
| \`\\[\`     | \`[\` |
| \`\\n\`     | LF (\`0x0A\`) |
| \`\\r\`     | CR (\`0x0D\`) |
| \`\\.\`     | \`.\` (literal dot — does NOT split a dotted key segment) |
| \`\\:\`     | \`:\` (literal colon — does NOT act as the key/value separator) |
| \`\\"\`     | \`"\` (literal double quote) |
| \`\\'\`     | \`'\` (literal single quote) |
| \`\` \\\` \`\` | \`\` \` \`\` (literal backtick) |
| \`\\uXXXX\` | the Unicode code point \`U+XXXX\` — see below |

The four bracket-escape forms (\`\\}\`, \`\\]\`, \`\\{\`, \`\\[\`) exist for
symmetry: any byte that could open or close an inline compound has
an explicit literal form. \`\\{\` and \`\\[\` are most useful at the
*start* of an inline scalar value — where an unescaped \`{\` or \`[\`
would open a nested compound — but the parser accepts them
anywhere in the inline-scalar context.

The two key-oriented escapes (\`\\.\`, \`\\:\`) allow a key segment
to contain a literal dot or colon — characters that are otherwise
structural (dot separates path segments; colon separates the key
from its value). Example: \`a\\.b: v\` produces the flat key \`a.b\`
with value \`v\` (no nesting); \`a\\:b: v\` produces the key \`a:b\`.

The three quote escapes (\`\\"\`, \`\\'\`, \`\` \\\` \`\`) exist for the quoted
key form (§ 5.3.3): inside a \`<quoted-segment>\`, only the segment's
own opening delimiter is structural (its first unescaped occurrence
closes the segment); the two other quote characters are ordinary
content there and need no escape. \`\\"\` / \`\\'\` / \`\` \\\` \`\` are
recognised uniformly in every context where escapes are recognised
at all — bare key segments, quoted key segments, and inline scalar
values alike — exactly as \`\\.\` and \`\\:\` already are: a quote
character has no structural meaning in a bare segment or an inline
value either, so the escape is simply redundant (but valid) there,
the same relationship \`\\.\`/\`\\:\` already have with inline values.

Any other \`\\X\` form (including \`\\#\`, \`\\t\`, \`\\ <space>\`,
\`\\<any-other>\`) is a \`BadEscapeSequence\` error (§ 6.13). See
§ 3.7.1 below for the specific validity rules of \`\\uXXXX\`.

Escape sequences are NOT processed in:

- Multi-line scalar values (the body of a pair or array item that is
  the whole content of a line, § 5.3 / § 5.4).
- Multi-line string content (\`(…)\` and \`((…))\`, § 5.6) — content is
  verbatim.
- Comments (§ 3.4) — content is ignored.

In contexts without escape processing, the literal byte sequence
\`\\X\` is two characters (\`\\\` followed by \`X\`).

`,
  ru: `
Внутри **inline-скалярного значения** (тела пары или элемента
массива, появляющегося внутри однострочного составного значения,
§ 5.8) и внутри **ключей** (часть ключа пары, § 5.3), байт обратной
косой \`\\\` начинает **escape-последовательность**. Распознаются
следующие **четырнадцать** escape-последовательностей; каждая
заменяется указанным байтом или кодовой точкой перед дальнейшей
классификацией (§ 5.2 для значений) или разделением на сегменты
(§ 4 для ключей). Позиция, поглощённая любой распознанной
escape-последовательностью — именованной или \`\\uXXXX\` — никогда
повторно не рассматривается как структурный разделитель (точка
пути, двоеточие-разделитель пары, запятая/скобка/фигурная скобка
внутри однострочного составного, разделитель квотированного
сегмента): это верно единообразно, независимо от того, какая из
четырнадцати форм породила декодированный байт.

| Последовательность | Замена |
|----------|-------------|
| \`\\\\\`     | \`\\\` (один обратный слэш) |
| \`\\,\`     | \`,\` |
| \`\\}\`     | \`}\` |
| \`\\]\`     | \`]\` |
| \`\\{\`     | \`{\` |
| \`\\[\`     | \`[\` |
| \`\\n\`     | LF (\`0x0A\`) |
| \`\\r\`     | CR (\`0x0D\`) |
| \`\\.\`     | \`.\` (литеральная точка — НЕ разделяет сегменты ключа) |
| \`\\:\`     | \`:\` (литеральное двоеточие — НЕ действует как разделитель пары) |
| \`\\"\`     | \`"\` (литеральная двойная кавычка) |
| \`\\'\`     | \`'\` (литеральная одинарная кавычка) |
| \`\` \\\` \`\` | \`\` \` \`\` (литеральный обратный апостроф) |
| \`\\uXXXX\` | кодовая точка Unicode \`U+XXXX\` — см. ниже |

Четыре скобочных escape-формы (\`\\}\`, \`\\]\`, \`\\{\`, \`\\[\`) существуют
ради симметрии: у любого байта, который может открыть или закрыть
inline-составное, есть явная литеральная форма. \`\\{\` и \`\\[\` чаще
всего нужны в *начале* inline-скалярного значения — там
не-экранированные \`{\` / \`[\` открыли бы вложенное составное —
но парсер принимает их в любой позиции inline-скалярного контекста.

Два escape для ключей (\`\\.\`, \`\\:\`) позволяют сегменту ключа
содержать литеральную точку или двоеточие — символы, которые иначе
являются структурными (точка разделяет сегменты пути; двоеточие
разделяет ключ от значения). Пример: \`a\\.b: v\` порождает плоский
ключ \`a.b\` со значением \`v\` (без вложенности); \`a\\:b: v\` порождает
ключ \`a:b\`.

Три кавычечных escape (\`\\"\`, \`\\'\`, \`\` \\\` \`\`) существуют для
квотированной формы ключа (§ 5.3.3): внутри \`<quoted-segment>\`
структурным является только собственный открывающий разделитель
сегмента (его первое неэкранированное вхождение закрывает сегмент);
два других символа кавычек там — обычное содержимое и не нуждаются
в escape. \`\\"\` / \`\\'\` / \`\` \\\` \`\` распознаются единообразно в любом
контексте, где escape-последовательности вообще распознаются, —
как в голых сегментах ключа, так и в квотированных, так и в
inline-скалярных значениях — точно так же, как уже ведут себя
\`\\.\` и \`\\:\`: символ кавычки не имеет структурного значения ни в
голом сегменте, ни в inline-значении, поэтому там escape просто
избыточен (но валиден) — то же отношение, что уже есть у \`\\.\`/\`\\:\`
с inline-значениями.

Любая другая форма \`\\X\` (включая \`\\#\`, \`\\t\`,
\`\\ <пробел>\`, \`\\<любой-другой>\`) — ошибка \`BadEscapeSequence\` (§ 6.13).
Точные правила валидности \`\\uXXXX\` см. в § 3.7.1 ниже.

Escape-последовательности НЕ обрабатываются в:

- Многострочных скалярных значениях (тело пары или элемента массива,
  занимающее всё содержимое строки, § 5.3 / § 5.4).
- Содержимом многострочной строки (\`(…)\` и \`((…))\`, § 5.6) —
  содержимое verbatim.
- Комментариях (§ 3.4) — содержимое игнорируется.

В контекстах без обработки escape-последовательностей литеральная
последовательность байтов \`\\X\` — это два символа (\`\\\`, затем \`X\`).

`,
  zh: `
**inline 标量值**(在单行复合值 § 5.8 中出现的对值或数组项的值)
以及**键**(对中的键部分,§ 5.3)内,反斜杠字节 \`\\\` 开始一个
**escape 序列**。识别以下**十四个** escape 序列;每个在进一步分类
(§ 5.2,用于值)或键段分割(§ 4,用于键)之前替换为指定字节或码点。
被任意一个已识别 escape —— 无论是命名形式还是 \`\\uXXXX\` —— 所占据
的位置,永远不会被重新视为结构性分隔符(点分路径的点、对分隔符
冒号、inline 中的逗号/花括号/方括号、quoted-segment 的分隔符):
无论解码出的字节来自这十四种形式中的哪一种,此规则一致适用。

| 序列 | 替换 |
|----------|-------------|
| \`\\\\\`     | \`\\\` |
| \`\\,\`     | \`,\` |
| \`\\}\`     | \`}\` |
| \`\\]\`     | \`]\` |
| \`\\{\`     | \`{\` |
| \`\\[\`     | \`[\` |
| \`\\n\`     | LF (\`0x0A\`) |
| \`\\r\`     | CR (\`0x0D\`) |
| \`\\.\`     | \`.\` (字面点 —— 不分割键段) |
| \`\\:\`     | \`:\` (字面冒号 —— 不作为键/值分隔符) |
| \`\\"\`     | \`"\` (字面双引号) |
| \`\\'\`     | \`'\` (字面单引号) |
| \`\` \\\` \`\` | \`\` \` \`\` (字面反引号) |
| \`\\uXXXX\` | Unicode 码点 \`U+XXXX\` —— 见下文 |

四个括号转义形式(\`\\}\`、\`\\]\`、\`\\{\`、\`\\[\`)出于对称性而存在:任何
能够打开或关闭 inline 复合值的字节都有显式的字面形式。\`\\{\` 与
\`\\[\` 最有用的位置是 inline 标量值的*开头* —— 那里未转义的 \`{\`
或 \`[\` 会打开嵌套复合值 —— 但解析器在 inline 标量上下文的
任何位置都接受它们。

两个面向键的 escape(\`\\.\`、\`\\:\`)允许键段包含字面的点或冒号
—— 否则这些字符是结构性的(点分割路径段;冒号分割键与值)。例:
\`a\\.b: v\` 产生平坦键 \`a.b\`,值 \`v\`(无嵌套);\`a\\:b: v\` 产生键
\`a:b\`。

三个引号 escape(\`\\"\`、\`\\'\`、\`\` \\\` \`\`)是为了支持带引号的键形式
(§ 5.3.3)而存在:在 \`<quoted-segment>\` 内部,只有该段自身的
开启分隔符是结构性的(其第一次未转义出现即关闭该段);另外两种
引号字符在其中是普通内容,无需转义。\`\\"\` / \`\\'\` / \`\` \\\` \`\` 在
每一个识别 escape 的上下文中都一致地被识别 —— 无论是裸键段、
带引号的键段,还是 inline 标量值 —— 正如 \`\\.\` 与 \`\\:\` 已经的
表现一样:引号字符在裸段或 inline 值中都没有结构性含义,因此该
escape 在那里只是多余的(但仍合法)—— 与 \`\\.\`/\`\\:\` 在 inline
值中的关系相同。

其他任何 \`\\X\` 形式(包括 \`\\#\`、\`\\t\`、\`\\<空格>\`、
\`\\<其他任意>\`)是 \`BadEscapeSequence\` 错误(§ 6.13)。
\`\\uXXXX\` 的具体有效性规则见下文 § 3.7.1。

Escape 序列**不**在以下场景处理:

- 多行标量值(占整行内容的对体或数组项体,§ 5.3 / § 5.4)。
- 多行字符串内容(\`(…)\` 与 \`((…))\`,§ 5.6)—— 内容 verbatim。
- 注释(§ 3.4)—— 内容被忽略。

无 escape 处理的上下文中,\`\\X\` 字面字节序列为两个字符。

`,
};
