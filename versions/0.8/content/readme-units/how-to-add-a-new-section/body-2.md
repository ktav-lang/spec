>>>>> lang=en
```js
export default {
  "kind": "numbered",
  "number": "9.9",
  "sep": " ",
  "level": 2,
  "title": {
    "en": "Widget Frobnication",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}
```

Note: `sep` depends on the heading text the author writes. For a
dot-style heading `## 9.9. Widget Frobnication` it would be `". "`;
for `## 9.9 Widget Frobnication` it is `" "`. Record what you actually
wrote, and be consistent. For the subsection `### 9.9.1 Widget Modes`,
`sec-9.9.1/meta.js` is the same shape with `"number": "9.9.1"`, `"level": 3`.

>>>>> lang=ru
```js
export default {
  "kind": "numbered",
  "number": "9.9",
  "sep": " ",
  "level": 2,
  "title": {
    "en": "Widget Frobnication",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}
```

Примечание: `sep` зависит от текста заголовка, который пишет автор. Для
заголовка с точкой `## 9.9. Widget Frobnication` это было бы `". "`;
для `## 9.9 Widget Frobnication` — `" "`. Записывайте то, что вы
действительно написали, и будьте последовательны. Для подсекции
`### 9.9.1 Widget Modes` файл `sec-9.9.1/meta.js` той же формы, но с
`"number": "9.9.1"`, `"level": 3`.

>>>>> lang=zh
```js
export default {
  "kind": "numbered",
  "number": "9.9",
  "sep": " ",
  "level": 2,
  "title": {
    "en": "Widget Frobnication",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}
```

注意:`sep` 取决于作者写出的标题文本。对于带点的标题
`## 9.9. Widget Frobnication`,它是 `". "`;对于
`## 9.9 Widget Frobnication`,则是 `" "`。记录你实际写下的形式,并
保持一致。对于子节 `### 9.9.1 Widget Modes`,`sec-9.9.1/meta.js` 形态
相同,只是 `"number": "9.9.1"`、`"level": 3`。

