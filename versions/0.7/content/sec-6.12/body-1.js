export default {
  en: `
A structural defect inside a closed inline compound — one that is
not already classified as \`UnterminatedInlineCompound\` — is a
\`MalformedInlineCompound\` error. The defects covered are:

- A leading comma immediately after the opener (\`{,a: 1}\`,
  \`[,1, 2]\`).
- Two or more consecutive commas (\`{a: 1,, b: 2}\`, \`[1,, 2]\`).
- An empty inline-array item, i.e. a comma not preceded by a value
  (\`[a,, b]\`); the trailing comma exception of § 5.8 still applies
  to a single comma immediately before the closing delimiter.
- Other inline structural defects that do not raise
  \`UnterminatedInlineCompound\` (e.g. a missing pair separator
  inside an inline object: \`{a 1, b: 2}\`).

Empty pair values (\`{a:}\`, \`{a::}\`) are NOT a defect — they yield
an empty String per § 5.8.2.

`,
  ru: `
Структурный дефект внутри замкнутого inline-составного, не
квалифицируемый как \`UnterminatedInlineCompound\`, — это ошибка
\`MalformedInlineCompound\`. Покрываемые случаи:

- Ведущая запятая сразу после опенера (\`{,a: 1}\`, \`[,1, 2]\`).
- Две или более последовательных запятых (\`{a: 1,, b: 2}\`,
  \`[1,, 2]\`).
- Пустой inline-элемент массива (\`[a,, b]\`); исключение для
  замыкающей запятой § 5.8 по-прежнему применимо к одиночной
  запятой непосредственно перед закрывающим разделителем.
- Прочие структурные дефекты, не дающие \`UnterminatedInlineCompound\`
  (например, отсутствующий разделитель пары внутри inline-объекта:
  \`{a 1, b: 2}\`).

Пустые значения пар (\`{a:}\`, \`{a::}\`) — НЕ дефект; они дают пустую
String по § 5.8.2.

`,
  zh: `
闭合 inline 复合值内部不归入 \`UnterminatedInlineCompound\` 的结构
缺陷,是 \`MalformedInlineCompound\` 错误。覆盖情况:

- 开启符紧后的前导逗号(\`{,a: 1}\`、\`[,1, 2]\`)。
- 两个或更多连续逗号(\`{a: 1,, b: 2}\`、\`[1,, 2]\`)。
- 空 inline 数组项(\`[a,, b]\`);§ 5.8 关于闭合符前单个尾部逗号
  的例外仍适用。
- 其他不引发 \`UnterminatedInlineCompound\` 的结构缺陷(如 inline
  对象内缺失对分隔符:\`{a 1, b: 2}\`)。

对的空值(\`{a:}\`、\`{a::}\`)**不**是缺陷;按 § 5.8.2 为空 String。

`,
};
