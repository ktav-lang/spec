
首个(且唯一的)内容行是一个闭合 inline 复合值的文档:

```
{host: localhost, port: 8080, tags: [a, b, c]}
```

根 Value 就是该 inline Object —— 文档层不需要任何外层括号;
inline 形式本身就是文档。顶层的 inline Array 同理:

```
[1, 2, 3, 4]
```

