>>>>> lang=en
verbatim: ((
    line 1
        exact leading whitespace preserved
    line 3
))
```

`(` strips the common leading indent — write code/text that *reads*
well in the file, the value comes out clean. `((` preserves every
content-line byte after line-ending normalization; it does not preserve
the bytes of the whole document.

### Keywords

Lowercase only: `null`, `true`, `false`. Anything else — `Null`,
`TRUE`, `yes`, `on` — is a plain string. No magic type coercion,
no versioned gotcha list.

```text
port: 8080
active: true
timeout: null
```

```json5
{
  port: 8080,     // bare integer → Integer
  active: true,   // keyword → native JSON bool
  timeout: null,  // keyword → native JSON null
}
```

>>>>> lang=ru
verbatim: ((
    line 1
        exact leading whitespace preserved
    line 3
))
```

`(` срезает общий ведущий отступ — пишите код/текст, который *читается*
в файле хорошо, а значение получается чистым. `((` сохраняет каждый
байты строк содержимого после нормализации переводов строк; байты всего
документа при этом не сохраняются.

### Ключевые слова

Только в нижнем регистре: `null`, `true`, `false`. Всё остальное —
`Null`, `TRUE`, `yes`, `on` — обычная строка. Никакого волшебного
приведения типов, никакого зависящего от версии списка ловушек.

```text
port: 8080
active: true
timeout: null
```

```json5
{
  port: 8080,     // голое целое → Integer
  active: true,   // ключевое слово → нативный JSON bool
  timeout: null,  // ключевое слово → нативный JSON null
}
```

>>>>> lang=zh
verbatim: ((
    line 1
        exact leading whitespace preserved
    line 3
))
```

`(` 会剥除公共前导缩进——在文件里按可读的方式书写代码/文本，结果
依然干净。`((` 在换行符规范化后保留每个内容行的字节,但不保留整个
文档的字节。

### 关键字

仅小写：`null`、`true`、`false`。其它写法——`Null`、`TRUE`、`yes`、
`on`——都是普通字符串。不做任何类型魔法，也没有随版本漂移的「陷阱清单」。

```text
port: 8080
active: true
timeout: null
```

```json5
{
  port: 8080,     // 裸整数 → Integer
  active: true,   // 关键字 → 原生 JSON bool
  timeout: null,  // 关键字 → 原生 JSON null
}
```

