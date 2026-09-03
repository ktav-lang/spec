
```
literal_true:: true
literal_zero:: 0
literal_hex:: 0xFF
literal_path:: /usr/local/bin
literal_comma_only:: just,a,comma,separated,plain,string
```

以上所有值都是 String,而非其推断出的类型。raw 标记无条件地
强制按 String 分发。注意:在这种多行 raw 形式中**不**进行
escape 处理 —— 体内的 `\n` 是 `\` 与 `n` 两个字符。

