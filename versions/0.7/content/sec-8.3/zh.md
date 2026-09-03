
下式 MUST 对任何由 parser-conforming 实现产生的**可表示**
(representable)Value V(§ 5.9.0)成立(由同 Value 域的 writer- 和
parser-conforming 实现执行):

```
emit_canonical(parse(emit_canonical(V))) == emit_canonical(V)
```

即:解析规范输出并再次输出产生字节相同的输出。规范形式是
parse-emit 循环的不动点。不可表示的 Value 不在此不变式的范围内:
§ 5.9 对 writer-conforming 实现的要求是以错误拒绝此类 Value,而
不是将其序列化(§ 5.9.0)。

