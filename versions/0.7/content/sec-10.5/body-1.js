export default {
  en: `
The two cases look symmetric — an empty inline value, either as
the value of a key in an Object or as an item in an Array — but
are treated differently (§ 5.8.2 and § 5.8.3): \`{a:}\` yields a
key \`a\` mapped to the empty String, while \`[,a]\` is a
\`MalformedInlineCompound\` error.

The asymmetry is deliberate. An empty pair value is anchored by
an explicit key, so the "explicitly empty field for key X" intent
is unambiguous; the form is concise and useful for representing,
e.g., environment variables set to the empty string. An empty
array item has no such anchor, so the form \`[,a]\` is more likely
a typo (a leading or doubled comma) than a deliberate empty-string
item. Forcing the writer to use \`["", a]\` for an intentional empty
String makes the intent explicit and catches the common typo at
parse time.

`,
  ru: `
Эти два случая выглядят симметрично — пустое inline-значение, будь
то значение ключа в Object или элемент в Array, — но трактуются
по-разному (§ 5.8.2 и § 5.8.3): \`{a:}\` даёт ключ \`a\`, отображённый
в пустую String, тогда как \`[,a]\` — ошибка \`MalformedInlineCompound\`.

Асимметрия намеренная. Пустое значение пары привязано явным ключом,
поэтому замысел «явно пустое поле для ключа X» однозначен; форма
лаконична и полезна для представления, например, переменных
окружения, установленных в пустую строку. У пустого элемента массива
такой привязки нет, поэтому форма \`[,a]\` — скорее опечатка (ведущая
или удвоенная запятая), чем намеренный пустой String-элемент.
Требование к пишущему использовать \`["", a]\` для намеренного пустого
String делает намерение явным и ловит распространённую опечатку на
этапе парсинга.

`,
  zh: `
两种情形看似对称 —— 一个空的 inline 值,或作为 Object 中某键的值,或作为 Array
中的项 —— 但处理方式不同(§ 5.8.2 与 § 5.8.3): \`{a:}\` 产生映射到空 String 的键
\`a\`,而 \`[,a]\` 是 \`MalformedInlineCompound\` 错误。

这种不对称是有意的。空的 pair 值有显式键作锚,故「键 X 的空值」意图明确;该形式
简洁,适合表示例如被设为空字符串的环境变量。空数组项没有这样的锚,故 \`[,a]\` 更
可能是笔误(前导或重复的逗号)而非有意的空 String 项。强制写入器为有意的空 String
使用 \`["", a]\` 使意图显式,并在解析时捕获常见笔误。

`,
};
