
```
tags: [hello\, world, line1\nline2, contains\}brace]
path: {win: C:\\Users\\alice, unix: /home/alice}
```

`tags[0]` 是 `String("hello, world")`(逗号被 escape),
`tags[1]` 是 `String("line1\nline2")`(内嵌换行),
`tags[2]` 是 `String("contains}brace")`。两个 `path` 值都是
字面路径。

