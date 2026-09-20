>>>>> lang=en
## A taste

One example that exercises every major form the format offers —
`:` pairs (a bare number is typed by its form, everything else is a
String), keyword Bool, `::` (forced literal String), dotted keys,
nested compounds, and a multi-line string.

```text
## A config for a SOCKS5 rotator.
port: 20082
log_level: info
debug: true

banned_patterns: [
    .*\.onion:\d+
    .*\.local
]

upstreams: [
    {
        host: a.example
        port: 1080
        weight: 0.7
        timeouts: {
            read: 30
            write: 10
        }
    }
    {
        host: b.example
        port: 1080
        weight: 0.3
    }
]

>>>>> lang=ru
## На вкус

Один пример, задействующий все основные формы формата — пары `:`
(голое число типизируется по форме, всё остальное — String),
ключевое слово Bool, `::` (форсированная литеральная String),
точечные ключи, вложенные составные значения, многострочная строка.

```text
## A config for a SOCKS5 rotator.
port: 20082
log_level: info
debug: true

banned_patterns: [
    .*\.onion:\d+
    .*\.local
]

upstreams: [
    {
        host: a.example
        port: 1080
        weight: 0.7
        timeouts: {
            read: 30
            write: 10
        }
    }
    {
        host: b.example
        port: 1080
        weight: 0.3
    }
]

>>>>> lang=zh
## 尝一口

一个调动格式所有主要形式的例子 —— `:` 对(裸数字按形式定型,其余
皆为 String)、关键字 Bool、`::`(强制字面 String)、点分键、嵌套
复合值、多行字符串。

```text
## A config for a SOCKS5 rotator.
port: 20082
log_level: info
debug: true

banned_patterns: [
    .*\.onion:\d+
    .*\.local
]

upstreams: [
    {
        host: a.example
        port: 1080
        weight: 0.7
        timeouts: {
            read: 30
            write: 10
        }
    }
    {
        host: b.example
        port: 1080
        weight: 0.3
    }
]

