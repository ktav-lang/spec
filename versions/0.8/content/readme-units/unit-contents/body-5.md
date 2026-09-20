>>>>> lang=en
**There is no escaping.** The content is stored as itself: a code fence is
written as a code fence, a backslash is a backslash, `${` is two ordinary
characters. This is why the format is Markdown rather than a string
literal — the specification is full of fenced examples, and every one of
them used to be spelled with escaped backticks.

The one thing the content may not contain is a line beginning
`>>>>> lang=`. That spelling was chosen because it is not syntax this
document uses: a Markdown heading marker would have competed with the
prose it delimits. A stray or duplicated separator is a build error, never
a silent block boundary.

The format itself names no languages and fixes no order — the decoded
result is a map. What it requires is that a language appear at most once
per file. That every source carries the same set, and that the set is
exactly `en`, `ru`, `zh`, is this specification's own rule layered on top.

The unit's full body text for a language is the **concatenation** of chunks
1..N, in order, with **no separator** between chunks.

**Release tokens.** Any unit body may contain the plain-ASCII tokens
`@@VERSION@@` and `@@DATE@@`; they are ordinary text here, so no
escaping is needed. At build time the builder substitutes them with the
`version` / `released` values from `release.js` in every language. A
surviving token in a spec output fails the build; README.source.md is never
substituted and may mention the tokens literally.

**Splitting rule (exact numbers).** Let `L` = max line count over the unit's
three language bodies.

>>>>> lang=ru
**Экранирования нет.** Содержимое хранится как есть: забор кода записан
забором кода, обратная косая — это обратная косая, `${` — два обычных
символа. Ради этого формат и сделан Markdown, а не строковым литералом:
спецификация полна примеров в заборах, и каждый из них раньше писался
экранированными backticks.

Единственное, чего не может содержать содержимое, — строку, начинающуюся
с `>>>>> lang=`. Это написание выбрано потому, что оно не является
разметкой, которую использует сам документ: маркер заголовка Markdown
конкурировал бы с прозой, которую разделяет. Лишний или повторный
разделитель — ошибка сборки, а не молчаливая граница блока.

Сам формат не называет языков и не фиксирует порядок — декодированный
результат является отображением. Он требует лишь, чтобы язык встречался
в файле не более одного раза. А то, что все исходники несут одинаковый
набор и что этот набор — ровно `en`, `ru`, `zh`, является собственным
правилом этой спецификации поверх формата.

Полный текст тела юнита на языке — это **конкатенация** кусков 1..N по
порядку, **без разделителя** между кусками.

**Релизные токены.** Любое тело юнита может содержать ASCII-токены
`@@VERSION@@` и `@@DATE@@`; здесь это обычный текст, поэтому
экранирование не нужно. При сборке Builder подставляет вместо них значения
`version` / `released` из `release.js` на всех языках. Токен,
прорвавшийся в spec-вывод, роняет сборку; README.source.md не
подставляется никогда и может упоминать токены буквально.

**Правило разбиения (точные числа).** Пусть `L` — максимум числа строк
по трём языковым телам юнита.

>>>>> lang=zh
**没有转义。**内容按其本来面目存储:代码围栏就写成代码围栏,反斜杠
就是反斜杠,`${` 就是两个普通字符。这正是该格式采用 Markdown 而非
字符串字面量的原因——规范中满是围栏示例,而它们过去每一个都要用转义
反引号来书写。

内容唯一不能包含的,是以 `>>>>> lang=` 开头的行。选择这种写法,是
因为它不是本文档自身使用的语法:Markdown 的标题标记会与它所分隔的
正文相互竞争。多余或重复的分隔行是构建错误,而绝不是一个无声的块
边界。

格式本身不指定语言,也不固定顺序——解码结果是一个映射。它只要求同一
语言在一个文件中至多出现一次。所有源文件携带相同的集合、且该集合恰好
是 `en`、`ru`、`zh`,则是本规范在格式之上自行附加的规则。

某语言单元的完整正文,是该语言第 1..N 块按顺序的**拼接**,块与块
之间**没有分隔符**。

**发布令牌。**任何单元正文都可以包含纯 ASCII 令牌 `@@VERSION@@` 与
`@@DATE@@`;它们在这里就是普通文本,因此无需转义。构建时 Builder 会在
所有语言中把它们替换为 `release.js` 的 `version` / `released` 值。残留到
spec 输出中的令牌会使构建失败;README.source.md 永不被替换,可按字面
提及这些令牌。

**拆分规则(精确数字)。**令 `L` 为该单元三种语言正文行数的最大值。

