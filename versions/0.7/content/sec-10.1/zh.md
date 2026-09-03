
在 0.1.x 到 0.3.x 版本中,获得 Integer 或 Float Value 的唯一方式是书写类型标记
`key:i 5` / `key:f 0.5`。普通 pair 形式 `key: 5` 产生 String。这些标记在语法上是
Ktav 独有的,容易忘记,并且重复了词法层面已经掌握的信息(一串数字**就是**数字)。

0.5.0 移除了这些标记,改为从标量体的词法形式推断数字/关键词 Value。raw 标记 `::`
保留为显式的「强制 String」覆盖。

这是一次 strict-break 变更:旧版本中以 `:i` / `:f` 书写的文档在 0.5.0 中解析结果
不同(`:i` / `:f` 文本成为值的一部分,或依空白情况产生 `MissingSeparator` /
`MissingSeparatorSpace` 错误)。不提供自动迁移。

