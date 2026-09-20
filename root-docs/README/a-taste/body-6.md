>>>>> lang=en
### With `::` — keywords and brackets as plain strings

A body that would otherwise be classified as a keyword (`null`,
`true`, `false`), an empty compound (`{}`, `[]`), or start a compound
(`{`, `[`) needs the raw `::` marker to come out as a plain String.

```text
## Would be Bool true without `::` — here it's the string "true".
on_release:: true
## Starts with `[` — `::` prevents "open array" interpretation.
regex::      [a-z]+
## IPv6 address literal — same reason.
ipv6::       [::1]:8080
## `null` keyword used as a literal four-char string.
placeholder:: null
```

```json5
{
  on_release: "true",
  regex: "[a-z]+",
  ipv6: "[::1]:8080",
  placeholder: "null",
}
```

>>>>> lang=ru
### С `::` — ключевые слова и скобки как обычные строки

Body, который иначе был бы классифицирован как ключевое слово
(`null`, `true`, `false`), пустое составное (`{}`, `[]`) или начало
составного (`{`, `[`), требует сырого маркера `::`, чтобы стать
обычной String.

```text
## Без `::` было бы Bool true — здесь это строка "true".
on_release:: true
## Начинается с `[` — `::` предотвращает "открытие массива".
regex::      [a-z]+
## IPv6-адрес — та же причина.
ipv6::       [::1]:8080
## Ключевое слово `null` как литеральная четырёхсимвольная строка.
placeholder:: null
```

```json5
{
  on_release: "true",
  regex: "[a-z]+",
  ipv6: "[::1]:8080",
  placeholder: "null",
}
```

>>>>> lang=zh
### 用 `::` —— 关键字与括号变成普通字符串

当 body 会被分类为关键字（`null`、`true`、`false`）、空复合值
（`{}`、`[]`）或开启复合值（`{`、`[`）时，需要用原始 `::` 标记才能
让它成为普通 String。

```text
## 若不用 `::` 会变成 Bool true —— 此处是字符串 "true"。
on_release:: true
## 以 `[` 开头 —— `::` 阻止"开启数组"的解释。
regex::      [a-z]+
## IPv6 地址字面量 —— 同理。
ipv6::       [::1]:8080
## `null` 关键字用作字面的四个字符的字符串。
placeholder:: null
```

```json5
{
  on_release: "true",
  regex: "[a-z]+",
  ipv6: "[::1]:8080",
  placeholder: "null",
}
```

