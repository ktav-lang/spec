
```
endpoint: {host: api.example, port: 443, tls: true}
ports: [80, 443, 8080]
users: [{name: alice, age: 30}, {name: bob, age: 25,}]
```

`endpoint` — inline-объект; `ports` — inline-массив из трёх целых
чисел; `users` — inline-массив из двух inline-объектов. Хвостовая
запятая после `25` допустима.

