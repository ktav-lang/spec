>>>>> lang=en
### Dotted keys

Keys may be dotted paths. These two documents are *identical*:

```text
server.host: 127.0.0.1
server.port: 8080
```

```text
server: {
    host: 127.0.0.1
    port: 8080
}
```

Dotted keys mix freely with nested form. The parser builds the same
tree either way. Useful for:

- CLI/env overrides (`--set server.port=9090`).
- Partial edits in small configs without restructuring.
- Flat-first files that grow nested sections as needed.

A key whose decoded text begins with `##` may use the bare input form
`\u0023#a\:b: 1`; the `\u0023` escape is accepted input. A canonical writer
MUST quote that key instead, for example `"##a:b": 1`, so the output cannot
be mistaken for a comment.

>>>>> lang=ru
### Точечные ключи

Ключами могут быть точечные пути. Эти два документа *идентичны*:

```text
server.host: 127.0.0.1
server.port: 8080
```

```text
server: {
    host: 127.0.0.1
    port: 8080
}
```

Точечные ключи свободно сочетаются с вложенной формой. Парсер строит
одно и то же дерево в обоих случаях. Полезно для:

- CLI/env-переопределений (`--set server.port=9090`).
- Частичных правок в небольших конфигах без реструктуризации.
- Файлов с плоской основой, обрастающих вложенными секциями по мере
  необходимости.

Ключ, чьё декодированное содержимое начинается с `##`, может использовать
bare-ввод `\u0023#a\:b: 1`; escape `\u0023` принимается как ввод. Но
canonical writer MUST заключить такой ключ в кавычки, например
`"##a:b": 1`, чтобы вывод нельзя было принять за комментарий.

>>>>> lang=zh
### 点分键

键可以是点分路径。下面这两份文档是*等价*的：

```text
server.host: 127.0.0.1
server.port: 8080
```

```text
server: {
    host: 127.0.0.1
    port: 8080
}
```

点分键可以与嵌套写法自由混用，解析器都会构造出同一棵树。常用场景：

- CLI/环境变量覆盖（`--set server.port=9090`）。
- 在小型配置中做局部修改而不重组结构。
- 起初扁平、根据需要再长出嵌套段落的文件。

解码后内容以 `##` 开头的键可以使用 bare 输入
`\u0023#a\:b: 1`;其中 `\u0023` escape 是可接受的输入。但规范 writer
MUST 改用引号包围该键,例如 `"##a:b": 1`,这样输出不会被误读为注释。

