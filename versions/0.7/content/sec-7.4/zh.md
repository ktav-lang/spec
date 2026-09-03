
```
endpoint: {host: api.example, port: 443, tls: true}
ports: [80, 443, 8080]
users: [{name: alice, age: 30}, {name: bob, age: 25,}]
```

`endpoint` 是一个 inline Object;`ports` 是一个包含三个整数的
inline Array;`users` 是一个包含两个 inline Object 的 inline
Array。`25` 之后的尾部逗号是允许的。

