export default {
  en: `
The parser MUST classify each line after trimming, applying rules in
this exact order:

1. If the trimmed line is empty → blank line; no effect except where
   stated (§ 5.6, multiline).
2. If the trimmed line begins with \`##\` → comment; ignored (§ 3.4),
   except where stated (§ 5.6, multiline) — \`##\` is ordinary content
   inside an open multi-line string, not a comment marker.
3. **If the parser is inside an open multi-line string** (§ 5.6): if
   the trimmed line equals the block's terminator, the multi-line
   string is closed; otherwise the raw (untrimmed) line is added to
   the content of the multi-line string.
4. If this is the document's first content line, the root kind is
   set as in § 5.0.1; processing then proceeds with the same line
   under the chosen-kind dispatch (rules 5–8).
5. If the trimmed line is exactly \`}\` → close the innermost open
   Object, otherwise error (§ 6.1).
6. If the trimmed line is exactly \`]\` → close the innermost open
   Array, otherwise error (§ 6.1).
7. If the innermost open compound is an Array, or there is no open
   compound and the root is an Array (§ 5.0.1): treat the line as
   an **array-item line** (§ 5.4).
8. If the innermost open compound is an Object, or there is no open
   compound and the root is an Object (§ 5.0.1): treat the line as
   a **pair line** (§ 5.3).

`,
  ru: `
Парсер MUST классифицировать каждую строку после trim, применяя
правила в точности в следующем порядке:

1. Если обрезанная строка пуста → пустая строка; без эффекта, кроме
   как где оговорено (§ 5.6, многострочная).
2. Если обрезанная строка начинается с \`##\` → комментарий;
   игнорируется (§ 3.4), кроме как где оговорено (§ 5.6,
   многострочная) — \`##\` внутри открытой многострочной строки
   является обычным содержимым, а не маркером комментария.
3. **Если парсер находится внутри открытой многострочной строки** (§ 5.6):
   если обрезанная строка равна терминатору блока, многострочная строка
   закрывается; иначе сырая (необрезанная) строка добавляется к
   содержимому многострочной строки.
4. Если это первая содержательная строка документа, тип корня
   устанавливается согласно § 5.0.1; обработка затем продолжается
   этой же строкой через диспетчеризацию по выбранному типу
   (правила 5–8).
5. Если обрезанная строка в точности \`}\` → закрыть самый внутренний
   открытый Object, иначе ошибка (§ 6.1).
6. Если обрезанная строка в точности \`]\` → закрыть самый внутренний
   открытый Array, иначе ошибка (§ 6.1).
7. Если самый внутренний открытый составной элемент — Array, либо
   нет открытых и корень — Array (§ 5.0.1): трактовать строку как
   **array-item line** (§ 5.4).
8. Если самый внутренний открытый составной элемент — Object, либо
   нет открытых и корень — Object (§ 5.0.1): трактовать строку как
   **pair line** (§ 5.3).

`,
  zh: `
解析器 MUST 在 trim 之后对每行进行分类,严格按以下顺序应用规则:

1. 经 trim 行为空 → 空白行;无效果(§ 5.6 除外)。
2. 经 trim 行以 \`##\` 开头 → 注释;忽略(§ 3.4),但 § 5.6 除外
   —— 在已开启的多行字符串内,\`##\` 是普通内容,不是注释标记。
3. **解析器处于已开启的多行字符串中**(§ 5.6):若经 trim 行等于
   块终止符,则关闭多行字符串;否则将原始(未 trim)行加入多行
   字符串内容。
4. 若为文档的首条内容行,根类型按 § 5.0.1 设置;随后以同行进入
   对应类型的分发(规则 5–8)。
5. 经 trim 行恰为 \`}\` → 关闭最内层开启 Object,否则报错(§ 6.1)。
6. 经 trim 行恰为 \`]\` → 关闭最内层开启 Array,否则报错(§ 6.1)。
7. 若最内层开启复合是 Array 或无开启而根为 Array:将该行视为
   **array-item line**(§ 5.4)。
8. 若最内层开启复合是 Object 或无开启而根为 Object:将该行视为
   **pair line**(§ 5.3)。

`,
};
