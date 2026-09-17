>>>>> lang=en

The "first content line" is the first line that is neither blank
(§ 5.1 rule 1) nor a comment (§ 5.1 rule 2). The root kind is
established from this line as follows. Rules are applied in order;
the first matching rule wins.

1. If the document has **no content lines** (empty document, or only
   blank/comment lines) → root is an empty **Object**.
2. If the first content line trimmed is a **closed inline object**
   `{ … }` — a `{`, balanced inline content, and a matching `}` as
   the last non-whitespace code point of the trimmed line — → root **IS**
   that inline Object. The document MUST have no further content
   lines; any subsequent non-blank, non-comment line is an
   `OrphanLineAfterTopLevelInline` error (§ 6.14).
3. If the first content line trimmed is a **closed inline array**
   `[ … ]` — a `[`, balanced inline content, and a matching `]` as
   the last non-whitespace code point of the trimmed line — → root **IS**
   that inline Array. The document MUST have no further content
   lines; any subsequent non-blank, non-comment line is an
   `OrphanLineAfterTopLevelInline` error (§ 6.14).
4. If the first content line trimmed is a **lone `{`** (the opening
   brace, possibly preceded or followed by whitespace, with nothing
   else on the line) → root is a **multi-line Object** opened by
   this brace. Its matching `}` on a later line closes the root;
   any content after that matching close line is
   `OrphanLineAfterTopLevelInline` (§ 6.14).
5. If the first content line trimmed is a **lone `[`** → root is a
   **multi-line Array** opened by this bracket. Its matching `]`
   closes the root; content after the matching close is
   `OrphanLineAfterTopLevelInline` (§ 6.14).

>>>>> lang=ru

«Первая содержательная строка» — первая строка, не являющаяся ни
пустой (§ 5.1 правило 1), ни комментарием (§ 5.1 правило 2). Тип
корня устанавливается по этой строке так. Правила применяются по
порядку; побеждает первое совпавшее.

1. Если у документа **нет содержательных строк** (пустой документ
   либо только пустые/комментарии) → корень — пустой **Object**.
2. Если первая содержательная строка после trim — **замкнутый
   inline-объект** `{ … }` (открывающая `{`, балансированное
   inline-содержимое и соответствующая `}` как последняя
   непробельная кодовая точка строки после trim) → корень **И ЕСТЬ**
   этот inline Object. Документ MUST не иметь дальнейших
   содержательных строк; любая последующая непустая некомментарная
   строка — ошибка `OrphanLineAfterTopLevelInline` (§ 6.14).
3. Если первая содержательная строка после trim — **замкнутый
   inline-массив** `[ … ]` (открывающая `[`, балансированное
   inline-содержимое и соответствующая `]` как последняя
   непробельная кодовая точка строки после trim) → корень **И ЕСТЬ**
   этот inline Array. Документ MUST не иметь дальнейших
   содержательных строк; любая последующая непустая некомментарная
   строка — ошибка `OrphanLineAfterTopLevelInline` (§ 6.14).
4. Если первая содержательная строка после trim — **одиночный `{`**
   (только открывающая фигурная скобка, возможно с пробелами до
   и после) → корень — **многострочный Object**, открытый этой
   скобкой. Соответствующая `}` на последующей строке закрывает
   корень; любое содержимое после этой строки закрытия —
   `OrphanLineAfterTopLevelInline` (§ 6.14).
5. Если первая содержательная строка после trim — **одиночный `[`**
   → корень — **многострочный Array**, открытый этой скобкой.
   Соответствующая `]` закрывает корень; содержимое после строки
   закрытия — `OrphanLineAfterTopLevelInline` (§ 6.14).

>>>>> lang=zh

「首条内容行」即既非空白(§ 5.1 规则 1)亦非注释(§ 5.1 规则 2)
的第一行。根按此行判定。规则按顺序应用;首条匹配规则胜出。

1. 若文档**无内容行**(空文档,或仅含空白/注释)→ 根为空 **Object**。
2. 若首条内容行经 trim 后为**闭合 inline 对象** `{ … }`(同一行
   内有 `{`、平衡内容,匹配的 `}` 为 trim 后行末非空白码点)→ 根**就是**
   该 inline Object。文档 MUST 无其他内容行;任何后续的非空白
   非注释行都是 `OrphanLineAfterTopLevelInline` 错误(§ 6.14)。
3. 若首条内容行经 trim 后为**闭合 inline 数组** `[ … ]`(同一行
   内有 `[`、平衡内容,匹配的 `]` 为 trim 后行末非空白码点)→ 根**就
   是**该 inline Array。文档 MUST 无其他内容行;任何后续的
   非空白非注释行都是 `OrphanLineAfterTopLevelInline` 错误
   (§ 6.14)。
4. 若首条内容行经 trim 后为**单独的 `{`**(仅开启大括号,可能前
   后有空白)→ 根为**多行 Object**,由此括号开启。其匹配的 `}`
   在后续行关闭根;关闭行之后的任何内容是
   `OrphanLineAfterTopLevelInline`(§ 6.14)。
5. 若首条内容行经 trim 后为**单独的 `[`** → 根为**多行 Array**,
   由此括号开启。其匹配的 `]` 关闭根;关闭行之后的内容是
   `OrphanLineAfterTopLevelInline`(§ 6.14)。

