>>>>> lang=en

The parser MUST classify each line after trimming, applying rules in
this exact order:

1. If the trimmed line is empty → blank line; no effect except where
   stated (§ 5.6, multiline).
2. If the trimmed line begins with `##` → comment; ignored (§ 3.4),
   except where stated (§ 5.6, multiline) — `##` is ordinary content
   inside an open multi-line string, not a comment marker.
3. **If the parser is inside an open multi-line string** (§ 5.6): if
   the trimmed line equals the block's terminator, the multi-line
   string is closed; otherwise the raw (untrimmed) line is added to
   the content of the multi-line string.
4. If this is the document's first content line, the root kind is
   determined as in § 5.0.1, and the matched § 5.0.1 rule also
   determines how this line is consumed: the line is consumed
   exactly once, and it is never dispatched a second time.
   - If § 5.0.1 rule 2 or rule 3 matched (closed inline compound
     root): the line is the entire root Value. It is consumed whole,
     and rules 5–8 do not apply to it at all.
   - If § 5.0.1 rule 4 or rule 5 matched (lone `{` / `[`): the line
     is consumed as the root's opening line itself; the root context
     is that multi-line Object / Array, and the line is not
     re-processed as an array-item or pair line.
   - If § 5.0.1 rule 6 matched (pair candidate): the root context is
     an Object, and the line is processed once as the document's
     first pair line (§ 5.3).
   - If § 5.0.1 rule 7 matched (array-item line): the root context
     is an Array, and the line is processed once as the document's
     first array-item line (§ 5.4).
   - If § 5.0.1 rule 8 matched: `UnbalancedBracket` error (§ 6.1);
     nothing is opened and no root context is set.
5. If the trimmed line is exactly `}` → close the innermost open
   Object, otherwise error (§ 6.1).
6. If the trimmed line is exactly `]` → close the innermost open
   Array, otherwise error (§ 6.1).
7. If the innermost open compound is an Array, or there is no open
   compound and the root is an Array (§ 5.0.1): treat the line as
   an **array-item line** (§ 5.4).
8. If the innermost open compound is an Object, or there is no open
   compound and the root is an Object (§ 5.0.1): treat the line as
   a **pair line** (§ 5.3).

>>>>> lang=ru

Парсер MUST классифицировать каждую строку после trim, применяя
правила в точности в следующем порядке:

1. Если обрезанная строка пуста → пустая строка; без эффекта, кроме
   как где оговорено (§ 5.6, многострочная).
2. Если обрезанная строка начинается с `##` → комментарий;
   игнорируется (§ 3.4), кроме как где оговорено (§ 5.6,
   многострочная) — `##` внутри открытой многострочной строки
   является обычным содержимым, а не маркером комментария.
3. **Если парсер находится внутри открытой многострочной строки** (§ 5.6):
   если обрезанная строка равна терминатору блока, многострочная строка
   закрывается; иначе сырая (необрезанная) строка добавляется к
   содержимому многострочной строки.
4. Если это первая содержательная строка документа, тип корня
   определяется согласно § 5.0.1, и совпавшее правило § 5.0.1 также
   определяет, как эта строка потребляется: строка потребляется
   ровно один раз и никогда не диспетчеризуется повторно.
   - Если совпало правило 2 или 3 § 5.0.1 (замкнутый
     inline-корень): строка — это весь корневой Value. Она
     потребляется целиком, и правила 5–8 к ней вообще не применяются.
   - Если совпало правило 4 или 5 § 5.0.1 (одиночный `{` / `[`):
     строка потребляется как строка открытия самого корня; контекст
     корня — этот многострочный Object / Array, и строка не
     обрабатывается повторно как array-item или pair строка.
   - Если совпало правило 6 § 5.0.1 (кандидат в pair): контекст
     корня — Object, и строка обрабатывается один раз как первая
     pair-строка документа (§ 5.3).
   - Если совпало правило 7 § 5.0.1 (array-item line): контекст
     корня — Array, и строка обрабатывается один раз как первый
     array-item документа (§ 5.4).
   - Если совпало правило 8 § 5.0.1: ошибка `UnbalancedBracket`
     (§ 6.1); ничего не открывается, контекст корня не задаётся.
5. Если обрезанная строка в точности `}` → закрыть самый внутренний
   открытый Object, иначе ошибка (§ 6.1).
6. Если обрезанная строка в точности `]` → закрыть самый внутренний
   открытый Array, иначе ошибка (§ 6.1).
7. Если самый внутренний открытый составной элемент — Array, либо
   нет открытых и корень — Array (§ 5.0.1): трактовать строку как
   **array-item line** (§ 5.4).
8. Если самый внутренний открытый составной элемент — Object, либо
   нет открытых и корень — Object (§ 5.0.1): трактовать строку как
   **pair line** (§ 5.3).

>>>>> lang=zh

解析器 MUST 在 trim 之后对每行进行分类,严格按以下顺序应用规则:

1. 经 trim 行为空 → 空白行;无效果,§ 5.6(多行)所述情形除外。
2. 经 trim 行以 `##` 开头 → 注释;忽略(§ 3.4),但 § 5.6(多行)所述情形除外
   —— 在已开启的多行字符串内,`##` 是普通内容,不是注释标记。
3. **解析器处于已开启的多行字符串中**(§ 5.6):若经 trim 行等于
   块终止符,则关闭多行字符串;否则将原始(未 trim)行加入多行
   字符串内容。
4. 若为文档的首条内容行,根类型按 § 5.0.1 判定,且匹配的
   § 5.0.1 规则同时决定该行如何被消费:该行恰好被消费一次,
   绝不会被二次分发。
   - 若匹配 § 5.0.1 规则 2 / 3(闭合 inline 复合根):该行即整个
     根 Value,整行被一次性消费,规则 5–8 对它完全不适用。
   - 若匹配 § 5.0.1 规则 4 / 5(单独的 `{` / `[`):该行作为根本身
     的开启行被消费;根上下文是该多行 Object / Array,该行绝不会
     再被当作 array-item 行或 pair 行处理。
   - 若匹配 § 5.0.1 规则 6(pair 候选行):根上下文为 Object,该行
     恰好处理一次,作为文档的首条 pair 行(§ 5.3)。
   - 若匹配 § 5.0.1 规则 7(array-item 行):根上下文为 Array,该行
     恰好处理一次,作为文档的首条 array-item 行(§ 5.4)。
   - 若匹配 § 5.0.1 规则 8:`UnbalancedBracket` 错误(§ 6.1);
     不开启任何内容,也不设置根上下文。
5. 经 trim 行恰为 `}` → 关闭最内层开启 Object,否则报错(§ 6.1)。
6. 经 trim 行恰为 `]` → 关闭最内层开启 Array,否则报错(§ 6.1)。
7. 若最内层开启复合是 Array 或无开启而根为 Array(§ 5.0.1):将该行视为
   **array-item line**(§ 5.4)。
8. 若最内层开启复合是 Object 或无开启而根为 Object(§ 5.0.1):将该行视为
   **pair line**(§ 5.3)。

