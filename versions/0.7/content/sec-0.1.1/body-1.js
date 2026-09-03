export default {
  en: `
- Added top-level Array as a recognised root kind (§ 5.0.1) — first-
  content-line array-item shapes (bare scalars, typed markers, lone
  \`{\` / \`[\`, multi-line openers) now produce a root-level Array
  instead of erroring. Strictly additive — every 0.1.0 document
  parses identically.

`,
  ru: `
- Добавлен top-level Array как распознаваемый тип корня (§ 5.0.1) —
  формы array-item первой содержательной строки (голые скаляры,
  типизированные маркеры, одиночные \`{\` / \`[\`, многострочные
  опенеры) теперь дают root-level Array вместо ошибки. Строго
  аддитивно — любой 0.1.0-документ разбирается идентично.

`,
  zh: `
- 新增顶层 Array 作为可识别的根类型(§ 5.0.1)—— 首条内容行的
  array-item 形式(裸标量、类型标记、单独的 \`{\` / \`[\`、多行开启符)
  现在产生 root-level Array,而不是报错。纯增量式变更 —— 任何
  0.1.0 文档的解析结果都不变。

`,
};
