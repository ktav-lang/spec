
stripped 块内,若某内容行 trim 后恰为 `)`,该行将与关闭符无法区分;
写入端 MUST 在需要写出这样的内容行时切换到 verbatim 形式。类似的
规则适用于 verbatim 块内 trim 后恰为 `))` 的内容行 —— 此时写入端
切换到 stripped 形式。

解析器行为对称:若 stripped 块内某内容行 trim 后恰为 `)`,解析器
MUST 在该行关闭块;若 verbatim 块内某内容行 trim 后恰为 `))`,
亦同。写入端因此 MUST 遵守上述规则 —— 若要表达此类内容,
多行字符串必须切换为另一种形式。

