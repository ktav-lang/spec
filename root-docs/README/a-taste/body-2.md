>>>>> lang=en
## Dotted keys — flat alternative to nesting.
node.host: a.example
node.port: 1080
## `::` forces a literal string — keeps the ':' inside the password.
node.auth:: p@ss:word

motd: (
    Welcome to the node.
    Please behave.
)
```

Parses to this value (shown as JSON5 — comments and unquoted keys for
readability). Note how the values map:

>>>>> lang=ru
## Dotted keys — flat alternative to nesting.
node.host: a.example
node.port: 1080
## `::` делает строку литеральной — двоеточие внутри пароля сохраняется.
node.auth:: p@ss:word

motd: (
    Welcome to the node.
    Please behave.
)
```

Разбирается в следующее значение (показано в виде JSON5 — с
комментариями и без кавычек в ключах для читаемости). Обратите
внимание на соответствие значений:

>>>>> lang=zh
## Dotted keys — flat alternative to nesting.
node.host: a.example
node.port: 1080
## `::` 强制字面字符串 —— 密码中的冒号 ':' 得以保留。
node.auth:: p@ss:word

motd: (
    Welcome to the node.
    Please behave.
)
```

解析为下列 Value(以 JSON5 形式展示,带注释与无引号键以便阅读)。
注意各值的对应关系:

