
```
example\.com: prod
a\:b: v
deep.example\.com: 1
path\\to: x
```

`example\.com` 是单个键 `example.com` —— `\.` 是字面点,不是路径分隔
符。`a\:b` 是键 `a:b`(字面冒号)。`deep.example\.com` 嵌套在
`deep` 下,叶键为 `example.com`(第一个点分割路径;escape 后的点
不分割)。`path\\to` 是键 `path\to` —— 字面反斜杠,写作 `\\`。自
0.7.0 起,规范 writer(§ 5.9.10)只要另需对结构性字节(这里是 `.`
或 `:`)做 escape,就会优先选用**quoted** 形式而非 bare-with-escape,
因此前三个的规范形式为:

```
"example.com": prod
"a:b": v
deep: {
    "example.com": 1
}
```

`path\\to: x` 的规范形式不变:只 escape 字面反斜杠并不会切换形式
(§ 10.7),因为加引号并不能省去这个 escape。四者仍然都能
round-trip(§ 8.3);只是前三者的字节形态相对 0.6.x 的
bare-with-escape 输出发生了变化。

