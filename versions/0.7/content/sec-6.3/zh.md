
点分路径经过一个已经持有非 Object 叶子的名字,或普通(非点分)pair 的键命名了一个已由更早的点分 pair 建立的 Object —— 都是 `KeyPathConflict` 错误(§ 5.3.2)。重新打开合成前缀的 sub-Object —— 通过共享同一前缀的后续点分 pair,中间可隔任意数量的兄弟 pair —— 不构成冲突;见 § 5.3.2 的合并语义。

