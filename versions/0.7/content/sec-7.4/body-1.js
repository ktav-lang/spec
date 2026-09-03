export default {
  en: `
\`\`\`
endpoint: {host: api.example, port: 443, tls: true}
ports: [80, 443, 8080]
users: [{name: alice, age: 30}, {name: bob, age: 25,}]
\`\`\`

\`endpoint\` is an inline Object; \`ports\` is an inline Array of three
integers; \`users\` is an inline Array of two inline Objects. The
trailing comma after \`25\` is allowed.

`,
  ru: `
\`\`\`
endpoint: {host: api.example, port: 443, tls: true}
ports: [80, 443, 8080]
users: [{name: alice, age: 30}, {name: bob, age: 25,}]
\`\`\`

\`endpoint\` — inline-объект; \`ports\` — inline-массив из трёх целых
чисел; \`users\` — inline-массив из двух inline-объектов. Хвостовая
запятая после \`25\` допустима.

`,
  zh: `
\`\`\`
endpoint: {host: api.example, port: 443, tls: true}
ports: [80, 443, 8080]
users: [{name: alice, age: 30}, {name: bob, age: 25,}]
\`\`\`

\`endpoint\` 是一个 inline Object;\`ports\` 是一个包含三个整数的
inline Array;\`users\` 是一个包含两个 inline Object 的 inline
Array。\`25\` 之后的尾部逗号是允许的。

`,
};
