
An **inline compound** is an Object or Array written on a single
line. The body of an inline compound is bounded by `{` / `}` for
Objects or `[` / `]` for Arrays. Items inside are separated by `,`
bytes. A trailing comma is permitted before the closing delimiter:

```
{a: 1, b: 2}
{a: 1, b: 2,}        ; trailing comma OK
[1, 2, 3]
[1, 2, 3,]
```

