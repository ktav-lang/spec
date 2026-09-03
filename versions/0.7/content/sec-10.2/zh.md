
行式形式的一个常见烦恼是短对象变得冗长:

```
server: {
    host: localhost
    port: 8080
}
```

四行只说了一件事。inline 形式

```
server: {host: localhost, port: 8080}
```

只有一行。其代价(以逗号作分隔符、闭合符必须同行出现)足够小,增加这一选项对
紧凑性是明显的胜利。

