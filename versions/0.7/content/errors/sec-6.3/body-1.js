export default {
  en: `
A dotted-key path that passes through a name already holding a
non-Object leaf, or a plain (non-dotted) pair whose key names an
Object already established by an earlier dotted-key pair, is a
\`KeyPathConflict\` error (§ 5.3.2). Reopening a synthetic-prefix
sub-Object — via a later dotted-key pair sharing the same prefix,
after any number of intervening sibling pairs — is NOT a conflict;
see § 5.3.2's merge semantics.

`,
  ru: `
Точечный путь, проходящий через имя, уже содержащее не-Object лист, или обычная (не точечная) пара, чей ключ называет Object, уже установленный более ранней точечной парой, — это ошибка \`KeyPathConflict\` (§ 5.3.2). Переоткрытие синтетического sub-Object более поздней точечной парой с тем же префиксом — после любого числа промежуточных пар-«соседей» — не является конфликтом; см. семантику слияния в § 5.3.2.

`,
  zh: `
点分路径经过一个已经持有非 Object 叶子的名字,或普通(非点分)pair 的键命名了一个已由更早的点分 pair 建立的 Object —— 都是 \`KeyPathConflict\` 错误(§ 5.3.2)。重新打开合成前缀的 sub-Object —— 通过共享同一前缀的后续点分 pair,中间可隔任意数量的兄弟 pair —— 不构成冲突;见 § 5.3.2 的合并语义。

`,
};
