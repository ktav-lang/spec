export default {
  en: `
A pair separator is selected by the kind/content of its value. The writer
MUST test the following branches in order; exactly one branch applies:

- **Non-String scalar pair:** emit the key, the plain \`: \` separator with
  exactly one ASCII U+0020 SPACE, and the canonical scalar body. Null emits
  \`null\`; Bool emits \`true\` or \`false\`, using the exact § 5.2 keyword
  spellings; Integer and Float use the canonical bodies of § 5.9.8. This
  branch never uses the raw marker \`::\`.

`,
  ru: `
Разделитель пары выбирается по типу/содержимому значения. Writer MUST
проверять следующие ветви по порядку; применяется ровно одна ветвь:

- **Пара с не-String скаляром:** вывести имя ключа, обычный разделитель
  \`: \` с ровно одним ASCII-пробелом U+0020 и каноническое тело скаляра.
  Null выводится как \`null\`; Bool — как \`true\` или \`false\`, с точным
  написанием ключевых слов § 5.2; Integer и Float используют канонические
  тела § 5.9.8. Эта ветвь никогда не использует raw-маркер \`::\`.

`,
  zh: `
对分隔符由值的类型/内容选择。Writer MUST 按以下顺序检查各分支;
恰好适用一个分支:

- **非 String 标量对:** 输出键、普通 \`: \` 分隔符、恰好一个 ASCII
  U+0020 空格以及规范标量体。Null 输出为 \`null\`; Bool 输出为
  \`true\` 或 \`false\`,使用 § 5.2 的精确关键词拼写; Integer 与 Float
  使用 § 5.9.8 的规范体。此分支绝不使用原始标记 \`::\`。

`,
};
