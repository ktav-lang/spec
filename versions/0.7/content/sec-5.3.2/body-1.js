export default {
  en: `
A pair \`a.b.c: v\` is semantically equivalent to a nested chain of
single-segment pairs: \`a:\` opens an Object containing \`b:\` opens an
Object containing \`c: v\`. Each intermediate name MUST resolve to an
Object. This equivalence is exact and applies regardless of how many
other pairs — dotted or plain — appear between two pairs that share a
dotted prefix: \`a.b: 1\` / \`c: 2\` / \`a.d: 3\` is exactly equivalent to
writing \`a: {b: 1}\` / \`c: 2\` / \`a: {d: 3}\` with the two \`a\` blocks
merged into one, in the order of \`a\`'s first appearance —
\`{a: {b: 1, d: 3}, c: 2}\`. An intervening sibling pair (\`c: 2\` above)
does not close the synthetic Object or invalidate a later pair that
reopens it.

Two directions of conflict both resolve to \`KeyPathConflict\` (§ 6.3),
because both amount to the same thing — a name being an Object in one
place and a leaf in another:

- A dotted-key pair whose path passes through a name that already
  holds a non-Object leaf Value — set either by an earlier plain pair
  (\`a: 1\` then \`a.b: 2\`) or by an earlier dotted pair that reached a
  conflicting depth — errors, since the dotted form needs that name
  to be an Object.
- Symmetrically, a plain (non-dotted) pair whose key names an Object
  already established by an earlier dotted-key pair (\`a.b: 1\` then
  \`a: 2\`) also errors: a plain pair always assigns its value directly
  as a leaf, and an Object cannot be silently overwritten by one.

The reverse of both is unrestricted and not a conflict: a dotted-key
pair extending into an Object that already exists — whether that
Object was itself created by an earlier dotted-key pair, or written
explicitly as \`a: {...}\` or \`a: {}\` — merges into it. \`a: {x: 1}\`
followed later by \`a.y: 2\` produces \`{a: {x: 1, y: 2}}\`, the same as
if \`a.y: 2\` had appeared adjacent to \`a\`'s own block; an explicit
Object is not "closed" against later dotted-key extension any more
than a synthetic one is.

Dotted keys are expanded the same way inside inline objects
(§ 5.8): \`{a.b: 1, a.c: 2}\` produces \`{a: {b: 1, c: 2}}\`.

`,
  ru: `
Пара \`a.b.c: v\` семантически эквивалентна цепочке однокомпонентных
пар: \`a:\` открывает Object, содержащий \`b:\`, открывающий Object,
содержащий \`c: v\`. Каждое промежуточное имя MUST разрешаться в
Object. Эта эквивалентность точна и действует независимо от того,
сколько других пар — точечных или обычных — стоит между двумя парами
с общим точечным префиксом: \`a.b: 1\` / \`c: 2\` / \`a.d: 3\` в точности
эквивалентно записи \`a: {b: 1}\` / \`c: 2\` / \`a: {d: 3}\` со слиянием
двух блоков \`a\` в один, в порядке первого появления \`a\` —
\`{a: {b: 1, d: 3}, c: 2}\`. Промежуточная пара-«сосед» (\`c: 2\` выше)
не закрывает синтетический Object и не делает недействительной
более позднюю пару, которая его переоткрывает.

Оба направления конфликта дают \`KeyPathConflict\` (§ 6.3), потому что
оба сводятся к одному и тому же: имя оказывается Object в одном
месте и листом в другом:

- Точечная пара, чей путь проходит через имя, уже содержащее
  не-Object лист — установленное либо более ранней обычной парой
  (\`a: 1\`, затем \`a.b: 2\`), либо более ранней точечной парой,
  достигшей конфликтующей глубины — даёт ошибку, поскольку точечная
  форма требует, чтобы это имя было Object.
- Симметрично, обычная (не точечная) пара, чей ключ называет Object,
  уже установленный более ранней точечной парой (\`a.b: 1\`, затем
  \`a: 2\`), тоже даёт ошибку: обычная пара всегда присваивает своё
  значение напрямую как лист, а Object нельзя молча перезаписать им.

Обратное для обоих направлений не ограничено и не является
конфликтом: точечная пара, расширяющая уже существующий Object —
неважно, создан ли этот Object более ранней точечной парой или
записан явно как \`a: {...}\` или \`a: {}\`, — сливается с ним.
\`a: {x: 1}\`, за которой позже следует \`a.y: 2\`, даёт
\`{a: {x: 1, y: 2}}\` — так же, как если бы \`a.y: 2\` стояла рядом с
собственным блоком \`a\`; явный Object не «закрыт» для последующего
точечного расширения ничуть не больше, чем синтетический.

Точечные ключи разворачиваются так же внутри inline-объектов
(§ 5.8): \`{a.b: 1, a.c: 2}\` даёт \`{a: {b: 1, c: 2}}\`.

`,
  zh: `
\`a.b.c: v\` ≡ \`a:\` Object 含 \`b:\` Object 含 \`c: v\`。每中间名 MUST
解析为 Object。这一等价关系是精确的,并且与共享点分前缀的两个
pair 之间出现了多少其他 pair(点分或非点分)无关:\`a.b: 1\` /
\`c: 2\` / \`a.d: 3\` 完全等价于写作 \`a: {b: 1}\` / \`c: 2\` /
\`a: {d: 3}\` 并将两个 \`a\` 块按 \`a\` 首次出现的顺序合并为一个 ——
\`{a: {b: 1, d: 3}, c: 2}\`。中间的兄弟 pair(上例中的 \`c: 2\`)不会
关闭该合成 Object,也不会使之后重新打开它的 pair 失效。

两个方向的冲突都归为 \`KeyPathConflict\`(§ 6.3),因为二者本质相同:
同一个名字在一处是 Object,在另一处是叶子:

- 点分 pair 的路径经过一个已经持有非 Object 叶子 Value 的名字 ——
  该叶子可能由更早的普通 pair 设置(\`a: 1\`,然后 \`a.b: 2\`),也
  可能由更早、到达冲突深度的点分 pair 设置 —— 会报错,因为点分
  形式要求该名字是 Object。
- 对称地,一个普通(非点分)pair,其键所命名的 Object 已由更早
  的点分 pair 建立(\`a.b: 1\`,然后 \`a: 2\`),同样会报错:普通
  pair 总是把其值直接赋为叶子,而 Object 不能被静默地用叶子
  覆盖。

反方向则不受限制,也不构成冲突:点分 pair 扩展一个已经存在的
Object —— 无论该 Object 是由更早的点分 pair 创建,还是显式写作
\`a: {...}\` 或 \`a: {}\` —— 都会并入其中。\`a: {x: 1}\` 之后若跟着
\`a.y: 2\`,结果是 \`{a: {x: 1, y: 2}}\`,与 \`a.y: 2\` 紧邻 \`a\` 自身
的块出现完全相同;显式 Object 并不会因此对后续的点分扩展「关闭」,
合成的 Object 也是如此。

inline 对象中同样展开:\`{a.b: 1, a.c: 2}\` → \`{a: {b: 1, c: 2}}\`。

`,
};
