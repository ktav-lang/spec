
```
tags: [hello\, world, line1\nline2, contains\}brace]
path: {win: C:\\Users\\alice, unix: /home/alice}
```

`tags[0]` is `String("hello, world")` (comma escaped),
`tags[1]` is `String("line1\nline2")` (with embedded newline),
`tags[2]` is `String("contains}brace")`. Both `path` values are
literal paths.

