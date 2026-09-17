>>>>> lang=en

A key segment is emitted after escape processing and the trimming
rule of § 4. Internal whitespace is preserved. Dotted keys are NOT
re-expanded: a Value parsed from `a.b.c: 1` is indistinguishable
in the Value model from one parsed from `a: { b: { c: 1 } }`, and
the canonical writer chooses the explicit nested form (not the
dotted form).

>>>>> lang=ru

Сегмент ключа выводится после обработки escape и применения trim
(§ 4). Внутренние пробелы сохраняются. Точечные ключи НЕ
разворачиваются обратно: Value, разобранное из `a.b.c: 1`,
неотличимо в модели Value от полученного из `a: { b: { c: 1 } }`, и
канонический эмиттер выбирает явную вложенную форму (а не точечную).

>>>>> lang=zh

键段在 escape 处理与 § 4 trim 后输出。段内空白保留。点分键
**不**反展开:从 `a.b.c: 1` 解析得到的 Value 在 Value 模型中与
从 `a: { b: { c: 1 } }` 得到的不可区分,规范 writer 选择显式
嵌套形式(而非点分形式)。

键段以两种形式之一输出 —— **裸** 或 **quoted**(§ 5.3.3)——
由单一规则决定:输出**裸**形式(下面的重新 escape 方案),除非
(a) 裸形式将需要对至少一个 `<quoted-segment>`(§ 4)允许作为
字面、未 escape 内容的字节做 escape —— 结构性字节 `.`、`:`、
`,`、`{`、`}`、`[`、`]`(下面第 1 条,不含 `\`、LF、CR),或
`(` / `)`(下面第 2 条的一部分,因为二者在键段位置都不会打开
多行字符串)—— 或边缘空白的 escape(下面第 3 条),仅当该字节是
`<quoted-segment>` 在该边缘位置本就允许裸出现的字节时才适用 ——
这对制表符、VT、FF 以及任何非 ASCII 的 § 3.3 空白码点成立,但对
LF 或 CR 不成立,因为 `<quoted-segment>` 无论在边缘还是内部都
从不允许它们裸出现(§ 4 的 `<dq-char>` / `<sq-char>` /
`<bt-char>` 在任何位置都排除它们;见下面的豁免说明);或 (b) 该段
解码后的内容以 `"`、`'`
或 `` ` `` 开头(裸形式下的前导引号字符在重解析时会被误读为
开启 `<quoted-segment>`,因此它总是强制使用 quoted 形式,即使
段中其他内容都不需要 escape);或 (c) 该段是根 Object 首个
序列化键的第一段(§ 5.9.3),且其解码内容以 U+FEFF 开头 ——
裸形式届时会把 U+FEFF 的原始 3 字节 UTF-8 编码放在整个文档的
字节偏移 0 处,与 § 3.1 要求 conforming 读取器在识别任何键之前
就剥离的元数据字节顺序标记无法区分,导致在重解析时悄悄丢失该
码点;quoted 形式的开启 `"` 则占据字节偏移 0,因此 U+FEFF 永远
不会被误认为 BOM,一旦 quoting 把它移出该位置,它自身也无需
escape(§ 5.9.12 一般性地陈述了这一防护,以及根-Array 首项的
类似情形);或 (d) 该段是键的第一段,且其解码内容以两字节序列
`##` 开头 —— 这完全不是一个 escape 需求,不同于 (a)-(c):没有任何
裸形式的 escape 会改变 § 5.1 规则 2 在重读时检查的原始前两个
字节,因此无论段中其他位置如何 escape,都无法阻止一个以裸 `##`
开头的行在重读时被分发为注释;quoted 形式的开启 `"` 是唯一能
避免这一冲突的方式,因为它是唯一首字节永远不是 `#` 的形式。
需要 escape 字面反斜杠、LF、CR、控制字节或 DEL ——
第 1 条的 `\\`/`\n`/`\r` 条目以及第 2 条中控制字节/DEL 的部分,
无论出现在段内哪个位置,包括其首字节或末字节 —— 本身并不触发
quoted 形式:`<quoted-segment>` 排除并 escape
它们的方式与 `<bare-segment>` 完全相同(§ 4 的 `<dq-char>` /
`<sq-char>` / `<bt-char>`,§ 5.3.3),所以加引号对它们没有任何
好处,裸形式仍是同样需要 escape 但更简单的选择 —— 边缘的 LF 或
CR 正属于这一豁免,而不属于上面规则 (a) 的边缘空白析取项。否则(选择
quoted 形式)分隔符无条件为 `"` —— 分隔符的选择是固定的,不依赖
内容,因此 writer 无需先针对全部三个候选扫描内容。两种形式都能
解析回同一个键(§ 5.3.3),但 writer 输出哪一种并非自由选择:
一旦内容已知,完全由本规则决定,不留任何余地(§ 5.9 的确定性
要求)。

