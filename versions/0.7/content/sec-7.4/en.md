
```
endpoint: {host: api.example, port: 443, tls: true}
ports: [80, 443, 8080]
users: [{name: alice, age: 30}, {name: bob, age: 25,}]
```

`endpoint` is an inline Object; `ports` is an inline Array of three
integers; `users` is an inline Array of two inline Objects. The
trailing comma after `25` is allowed.

