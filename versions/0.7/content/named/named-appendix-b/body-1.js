export default {
  en: `
Three breaking changes must be addressed when migrating a 0.1.x
document to 0.5.0:

1. **Typed markers removed.** Replace \`:i 42\` / \`:f 3.14\` with
   bare \`42\` / \`3.14\`. To keep the literal as a String, write
   \`:: 42\`.
2. **Comments use \`##\`.** Replace \`# comment\` lines with
   \`## comment\`. A single \`#\` byte at line start has no special
   meaning in 0.5.0 and would be parsed as part of a content
   line.
3. **Bare numbers are typed.** \`port: 8080\` produces
   \`Integer(8080)\` in 0.5.0, not \`String("8080")\`. If a consumer
   expects the value as a String, change the source to
   \`port:: 8080\`.

A fourth, narrower change applies only to documents that exploited
the 0.1.1 lone-\`{\` / lone-\`[\` root-Array shape:

4. **Lone \`{\` / \`[\` on the first content line is now the root,
   not a single Array item.** In 0.1.1 a document beginning with
   a lone \`{\` produced a root Array containing one Object; in
   0.5.0 the lone \`{\` opens the root Object directly. JSONL-style
   documents (multiple top-level objects on consecutive lines)
   are no longer accepted. Wrap them in an explicit \`[\` / \`]\`
   array.

A document using only quoted-style values, explicit String form
(\`key:: value\`), and explicit array brackets is broadly compatible
across both versions.

`,
  ru: `
Три ломающих изменения требуют внимания при миграции
0.1.x-документа на 0.5.0:

1. **Типизированные маркеры удалены.** Замените \`:i 42\` / \`:f 3.14\`
   на голые \`42\` / \`3.14\`. Чтобы сохранить литерал как String,
   пишите \`:: 42\`.
2. **Комментарии используют \`##\`.** Замените \`# comment\` строки
   на \`## comment\`. Одиночный \`#\` в начале строки в 0.5.0 не
   имеет специального значения и будет разобран как часть
   содержательной строки.
3. **Голые числа теперь типизированы.** \`port: 8080\` даёт
   \`Integer(8080)\` в 0.5.0, не \`String("8080")\`. Если потребитель
   ожидает String, измените источник на \`port:: 8080\`.

Четвёртое, более узкое изменение применяется только к документам,
эксплуатировавшим 0.1.1-форму lone-\`{\` / lone-\`[\` root-Array:

4. **Одиночный \`{\` / \`[\` на первой содержательной строке — теперь
   корень, не одиночный Array элемент.** В 0.1.1 документ,
   начинающийся с одиночного \`{\`, давал корневой Array,
   содержащий один Object; в 0.5.0 одиночный \`{\` открывает
   корневой Object напрямую. JSONL-стиль (несколько top-level
   объектов на последовательных строках) больше не принимается.
   Оберните такие документы в явные \`[\` / \`]\`.

Документ, использующий только формы значений в кавычках, явную
String-форму (\`key:: value\`) и явные скобки массива, в целом
совместим между обеими версиями.

`,
  zh: `
三个 breaking 变更需在 0.1.x 文档迁移到 0.5.0 时处理:

1. **类型标记移除。** 将 \`:i 42\` / \`:f 3.14\` 替换为裸的 \`42\` /
   \`3.14\`。若要保留为 String,使用 \`:: 42\`。
2. **注释使用 \`##\`。** 将 \`# comment\` 行替换为 \`## comment\`。
   0.5.0 中,行首单 \`#\` 无特殊含义。
3. **裸数字现在被类型化。** \`port: 8080\` 在 0.5.0 产生
   \`Integer(8080)\`,不再是 \`String("8080")\`。若消费方期望
   String,将源改为 \`port:: 8080\`。

第四个更窄的变更仅适用于利用 0.1.1 的 lone-\`{\` / lone-\`[\`
root-Array 形式的文档:

4. **首条内容行的单独 \`{\` / \`[\` 现在是根,不是单一 Array 项。**
   0.1.1 中,以单独 \`{\` 开始的文档产生含一个 Object 的根 Array;
   0.5.0 中,单独 \`{\` 直接打开根 Object。JSONL 式文档(多个 top-
   level 对象在相邻行)不再被接受;请用显式 \`[\` / \`]\` 包裹。

仅使用带引号风格的值、显式 String 形式(\`key:: value\`)与显式
数组括号的文档,在两个版本间大致兼容。

`,
};
