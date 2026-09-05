export default {
  en: `
An array-item line introduces one Value inside the innermost open
Array (or the top-level Array, § 5.0.1). The forms are:

1. **Raw-marker item** — any trimmed array-item line beginning with
   \`::\` commits to raw-marker syntax before any other item
   classification. The body after \`::\` is a literal String (no type
   inference). \`<sep-end>\` rules apply: whitespace or EOL after \`::\`
   is required, and the maximal contiguous run of following whitespace
   belongs to \`<sep-end>\` (so \`::  x\` has value \`x\`). If the
   required separator-end is absent, as in \`::x\`, the result is
   \`MissingSeparatorSpace\`; the line MUST NOT fall through to scalar
   classification.
2. **Closed-inline-object item** — \`{ key: value, … }\` on one line.
3. **Closed-inline-array item** — \`[ v, v, … ]\` on one line.
4. **Empty-inline-object item** — \`{}\`.
5. **Empty-inline-array item** — \`[]\`.
6. **Open compound** — a line whose trimmed content is \`{\`, \`[\`,
   \`(\`, or \`((\` (multi-line opener); pushes a new compound scope
   onto the parser stack.
7. **Empty-multiline-string item** — \`()\` or \`(())\`.
8. **Other item-value** — any non-marker body, dispatched through
   § 5.2 to produce the appropriate Value (keyword, number, or
   String).
9. **Bare-scalar item** — falls through rule 8 with a String result
   if no number / keyword form matched.

`,
  ru: `
Array-item line вводит одно Value внутрь самого внутреннего открытого
Array (или top-level Array, § 5.0.1). Формы:

1. **Raw-маркерный элемент** — любая обрезанная строка array-item,
   начинающаяся с \`::\`, до любой другой классификации фиксируется как
   raw-marker. Тело после \`::\` — литеральная String (без вывода типа).
   Применяются правила \`<sep-end>\`: после \`::\` требуется пробельная
   кодовая точка или конец строки, и вся максимальная непрерывная
   последовательность следующих пробельных кодовых точек принадлежит
   \`<sep-end>\` (поэтому \`::  x\` имеет значение \`x\`). Если требуемого
   окончания разделителя нет, как в \`::x\`, результат —
   \`MissingSeparatorSpace\`; строка MUST NOT проваливаться в
   классификацию скаляра.
2. **Замкнутый inline-объектный элемент** — \`{ key: value, … }\`.
3. **Замкнутый inline-массивный элемент** — \`[ v, v, … ]\`.
4. **Пустой inline-объект** — \`{}\`.
5. **Пустой inline-массив** — \`[]\`.
6. **Открытое составное** — строка, обрезанная содержимое которой
   \`{\`, \`[\`, \`(\`, или \`((\` (многострочный опенер); помещает новый
   составной scope в стек парсера.
7. **Пустая многострочная строка** — \`()\` или \`(())\`.
8. **Прочее value** — любое не-маркерное тело, диспетчеризованное
   через § 5.2 для получения соответствующего Value (ключевое слово,
   число или String).
9. **Голый скаляр** — проваливается в правило 8 с результатом
   String, если ни одна форма числа / ключевого слова не совпала.

`,
  zh: `
array-item line 在最内层开启的 Array(或 top-level Array,
§ 5.0.1)内引入一个 Value。形式:

1. **原始标记项** —— 任意 trim 后以 \`::\` 开头的 array-item line
   在其他项分类之前即确定为 raw-marker 语法。\`::\` 之后的体是字面
   String(无类型推断)。适用 \`<sep-end>\` 规则:要求 \`::\` 之后为空白
   或行末,且紧随其后的最大连续空白序列都属于 \`<sep-end>\`(因此
   \`::  x\` 的值是 \`x\`)。若缺少所需的 separator-end,如 \`::x\`,
   结果是 \`MissingSeparatorSpace\`;该行 MUST NOT 回退到标量分类。
2. **闭合 inline 对象项** \`{ … }\`。
3. **闭合 inline 数组项** \`[ … ]\`。
4. **空 inline 对象项** \`{}\`。
5. **空 inline 数组项** \`[]\`。
6. **开启复合** 单独的 \`{\` / \`[\` / \`(\` / \`((\`(多行开启符);将
   新的复合 scope 压入解析器栈。
7. **空多行字符串项** \`()\` / \`(())\`。
8. **其他值** —— 任意非标记体,经 § 5.2 分发。
9. **裸标量项** —— 若无数字/关键词形式匹配,则落入规则 8,结果
   为 String。

`,
};
