>>>>> lang=en
## Unit contents

Each unit directory contains exactly: `meta.js`, `body-1.md`, ..., `body-N.md`
(N >= 1). A body file IS Markdown — that is the point of the format: the
specification is a Markdown document, and holding it in JavaScript string
literals meant every code fence was written as escaped backticks. `meta.js`
is not Markdown; it is a static data file, and the `.js` extension marks
exactly that difference. A unit directory contains nothing else.

### `meta.js`

Every `meta.js` uses `export default { ... }` (JSON-style). The three shapes,
verbatim:

```js
// frontmatter/meta.js
export default {
  "kind": "frontmatter",
  "number": null,
  "level": null,
  "title": null,
  "bodyParts": 1
}

>>>>> lang=ru
## Состав юнита

Каждая директория юнита содержит ровно: `meta.js`, `body-1.md`, ...,
`body-N.md` (N >= 1). Файл тела — ЭТО Markdown, и в этом весь смысл
формата: спецификация является Markdown-документом, а хранение её в
JS-строках означало, что каждый блок кода писался экранированными
обратными кавычками. `meta.js` — не Markdown, это статический файл
данных, и расширение `.js` отмечает ровно это различие. Ничего другого
директория юнита не содержит.

### `meta.js`

Каждый `meta.js` использует `export default { ... }` (в стиле JSON). Три
формы, дословно:

```js
// frontmatter/meta.js
export default {
  "kind": "frontmatter",
  "number": null,
  "level": null,
  "title": null,
  "bodyParts": 1
}

>>>>> lang=zh
## 单元内容

每个单元目录恰好包含:`meta.js`、`body-1.md`、……、`body-N.md`
(N >= 1)。正文文件**就是** Markdown,这正是该格式的要点:规范本身
是一份 Markdown 文档,而把它存放在 JS 字符串字面量里,意味着每个代码
围栏都要写成转义的反引号。`meta.js` 不是 Markdown,它是静态数据文件,
`.js` 扩展名标记的正是这一区别。单元目录不包含任何其他内容。

### `meta.js`

每个 `meta.js` 使用 `export default { ... }`(JSON 风格)。三种形态,
逐字如下:

```js
// frontmatter/meta.js
export default {
  "kind": "frontmatter",
  "number": null,
  "level": null,
  "title": null,
  "bodyParts": 1
}

