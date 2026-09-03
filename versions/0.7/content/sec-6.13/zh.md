
`BadEscapeSequence`(§ 3.7)。inline 标量值或键中的 `\X` 形式,
其中 `X` 不是 `\`、`,`、`}`、`]`、`{`、`[`、`n`、`r`、`.`、`:`、`u`
之一,为 `BadEscapeSequence` 错误。反斜杠后紧随行末(即 `\` 与
行终止符之间无字节)亦为 `BadEscapeSequence` 错误 —— inline
标量上下文不跨越行边界(§ 3.2)。

`\u` 之后没有紧跟恰好四位十六进制数字(§ 3.7.1),同样是
`BadEscapeSequence` 错误;孤立代理项也是 —— 即高代理项之后没有
紧跟合法的低代理项 `\uXXXX` escape,或低代理项之前没有紧跟高
代理项。

