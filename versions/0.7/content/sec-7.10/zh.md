
```
"cache:redis": enabled
'say "hi": now': ok
```

`"cache:redis"` 直接以 quoted 形式写出键 `cache:redis` ——
等价于 § 7.9 中裸转义的 `cache\:redis`,但不需要在行内嵌入反斜杠
(§ 10.7)。`'say "hi": now'` 写出键 `say "hi": now`:单引号分隔符
对内嵌的 `"` 字符无需 escape(自我 escape,§ 10.7),对内嵌的 `:`
也无需 escape(在 `<quoted-segment>` 内部只有段自身的分隔符是
结构性的,§ 3.7)。这两个键都含有 `:`,因此裸形式将需要 `\:`,
规范 writer(§ 5.9.10)会保持它们为 quoted 形式;规范分隔符始终是
`"`,因此第二个键内嵌的双引号在规范输出中被重新 escape 为 `\"`:

```
"cache:redis": enabled
"say \"hi\": now": ok
```

