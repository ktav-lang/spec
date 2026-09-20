>>>>> lang=en
### Strings, straight

A non-compound scalar body is trimmed at both edges before it is
classified. A non-empty body that is not a keyword or numeric literal
is a String, so internal whitespace and punctuation remain part of the
value. No quoting means no quoting rules — paths, URLs, regexes, tokens
with punctuation all just work.

```text
pattern: .*\.onion:\d+
url: https://example.com:8080/path?x=1
key: s3cret/with:colons and-dashes
padded:   hello
```

Here `padded` has the String value `hello`: separator padding and body
edge whitespace are trimmed before classification. When a string would
collide with grammar (starts with `{` or `[`, equals a keyword like
`true`, or is exactly one of `(`, `((`, `()`, `(())`), prefix the
separator with `::`:

```text
literal_bracket:: [
keyword_as_string:: true
```

### Numbers, typed by form

>>>>> lang=ru
### Строки напрямую

Тело скаляра, не являющееся составным, обрезается по обеим границам
до классификации. Непустое тело, не являющееся ключевым словом или
числовым литералом, — String; внутренние пробелы и пунктуация входят
в значение. Отсутствие кавычек означает отсутствие правил кавычек —
пути, URL, регулярки, токены с пунктуацией просто работают.

```text
pattern: .*\.onion:\d+
url: https://example.com:8080/path?x=1
key: s3cret/with:colons and-dashes
padded:   hello
```

Здесь `padded` имеет значение String `hello`: padding разделителя и
краевые пробелы тела обрезаются до классификации. Когда строка
конфликтовала бы с грамматикой (начинается с `{` или `[`, равна
ключевому слову вроде `true` или в точности равна одному из `(`, `((`,
`()` или `(())`), префиксуйте разделитель через `::`:

```text
literal_bracket:: [
keyword_as_string:: true
```

### Числа, типизированные по форме

>>>>> lang=zh
### 字符串，直给

非复合标量 body 在分类前会修剪两端。非空且不属于关键字或数字
字面量的 body 是 String,所以内部空白与标点都属于值。没有引号
意味着没有引号规则——路径、URL、正则、含标点的令牌都可以直接写。

```text
pattern: .*\.onion:\d+
url: https://example.com:8080/path?x=1
key: s3cret/with:colons and-dashes
padded:   hello
```

这里 `padded` 的 String 值是 `hello`:分隔符 padding 与 body 两端
空白会在分类前修剪。当字符串可能与语法冲突（以 `{` 或 `[` 开头、
等于 `true` 之类的关键字,或恰好等于 `(`、`((`、`()`、`(())` 之一）
时，将分隔符改为 `::`:

```text
literal_bracket:: [
keyword_as_string:: true
```

### 数字,按形式定型

