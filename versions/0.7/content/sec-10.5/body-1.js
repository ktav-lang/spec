export default {
  en: `

The two cases look symmetric — an empty inline value, either as
the value of a key in an Object or as an item in an Array — but
are treated differently (§ 5.8.2 and § 5.8.3): \`{a:}\` yields a
key \`a\` mapped to the empty String, while \`[,a]\` is a
\`MalformedInlineCompound\` error. The text \`["", a]\` does not
represent an empty String item: the two quote bytes are ordinary inline
scalar content, so that item is a String whose body is two quote bytes,
not String("").

The valid inline spelling \`[(), a]\` is different: \`()\` is the exact
empty-String shortcut dispatched by § 5.2 rule 5 after inline-scalar
collection. It is not the canonical writer form, however. For the
root Value [empty String, "a"], § 5.9.3 emits Array-root items directly
at indent 0: the first raw-marker item safely establishes an Array root,
so no bracket wrapper is needed. The canonical output is:

\`\`\`text
::
a
\`\`\`

The asymmetry is deliberate. An empty pair value is anchored by
an explicit key, so the "explicitly empty field for key X" intent
is unambiguous; the form is concise and useful for representing,
e.g., environment variables set to the empty string. An empty
array item has no such anchor, so the form \`[,a]\` is more likely
a typo (a leading or doubled comma) than a deliberate empty-string
item. Requiring the canonical raw-marker item form for an intentional
empty String makes the intent explicit and catches the common typo at
parse time.

`,
  ru: `

Эти два случая выглядят симметрично — пустое inline-значение, будь
то значение ключа в Object или элемент в Array, — но трактуются
по-разному (§ 5.8.2 и § 5.8.3): \`{a:}\` даёт ключ \`a\`, отображённый
в пустую String, тогда как \`[,a]\` — ошибка \`MalformedInlineCompound\`.
Текст \`["", a]\` не обозначает пустой String-элемент: два символа
кавычек являются обычным содержимым inline-скаляра, поэтому этот
элемент — String с телом из двух байтов кавычки, а не пустая String.

Корректная inline-запись \`[(), a]\` иная: \`()\` — точная shortcut
пустой String, которую после сбора inline-скаляра диспетчеризует
правило 5 § 5.2. Но это не каноническая форма writer'а. Для Value
корня [пустая String, "a"] § 5.9.3 выводит элементы Array-корня
напрямую с отступом 0: первый элемент с raw-маркером безопасно
устанавливает Array-корень, поэтому обёртка квадратными скобками не
нужна. Канонический вывод:

\`\`\`text
::
a
\`\`\`

Асимметрия намеренная. Пустое значение пары привязано явным ключом,
поэтому замысел «явно пустое поле для ключа X» однозначен; форма
лаконична и полезна для представления, например, переменных
окружения, установленных в пустую строку. У пустого элемента массива
такой привязки нет, поэтому форма \`[,a]\` — скорее опечатка (ведущая
или удвоенная запятая), чем намеренный пустой String-элемент.
Требование к пишущему использовать каноническую raw-marker-форму для
намеренного пустого String делает намерение явным и ловит
распространённую опечатку на этапе парсинга.

`,
  zh: `

两种情形看似对称 —— 一个空的 inline 值,或作为 Object 中某键的值,或作为 Array
中的项 —— 但处理方式不同(§ 5.8.2 与 § 5.8.3): \`{a:}\` 产生映射到空 String 的键
\`a\`,而 \`[,a]\` 是 \`MalformedInlineCompound\` 错误。
文本 \`["", a]\` 不表示空 String 项:两个引号字节是普通 inline 标量内容,
因此该项是正文由两个引号字节组成的 String,而不是空 String。

有效的 inline 写法 \`[(), a]\` 不同:\`()\` 是收集 inline 标量后由 § 5.2
规则 5 分派的精确空 String shortcut。但它不是 writer 的规范形式。对于
根 Value [空 String, "a"],§ 5.9.3 以缩进 0 直接输出 Array 根的各项:
首个 raw-marker 项能安全建立 Array 根,因此不需要方括号包裹。规范输出为:

\`\`\`text
::
a
\`\`\`

这种不对称是有意的。空的 pair 值有显式键作锚,故「键 X 的空值」意图明确;该形式
简洁,适合表示例如被设为空字符串的环境变量。空数组项没有这样的锚,故 \`[,a]\` 更
可能是笔误(前导或重复的逗号)而非有意的空 String 项。强制写入器为有意的空 String
使用规范的 raw-marker 形式使意图显式,并在解析时捕获常见笔误。

`,
};
