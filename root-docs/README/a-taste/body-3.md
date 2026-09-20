>>>>> lang=en
- `:` with a bare integer body (`20082`) — Integer; with a bare
  decimal body (`0.7`) — Float; any other body (`info`, a regex, a
  path) — String, verbatim, even for digit-ish content.
- `: true` / `: false` / `: null` — Bool / Null keywords.
- `::` — forced literal String, no classification applied.

```json5
{
  port: 20082,
  log_level: "info",
  debug: true,

  banned_patterns: [
    ".*\\.onion:\\d+",
    ".*\\.local",
  ],

  upstreams: [
    {
      host: "a.example",
      port: 1080,
      weight: 0.7,
      timeouts: { read: 30, write: 10 },
    },
    {
      host: "b.example",
      port: 1080,
      weight: 0.3,
    },
  ],

>>>>> lang=ru
- `:` с голым целым телом (`20082`) — Integer; с голым десятичным
  (`0.7`) — Float; любое другое тело (`info`, regex, путь) — String,
  дословно, даже для цифроподобного содержимого.
- `: true` / `: false` / `: null` — ключевые Bool / Null.
- `::` — форсированная литеральная String, классификация не применяется.

```json5
{
  port: 20082,
  log_level: "info",
  debug: true,

  banned_patterns: [
    ".*\\.onion:\\d+",
    ".*\\.local",
  ],

  upstreams: [
    {
      host: "a.example",
      port: 1080,
      weight: 0.7,
      timeouts: { read: 30, write: 10 },
    },
    {
      host: "b.example",
      port: 1080,
      weight: 0.3,
    },
  ],

>>>>> lang=zh
- `:` 跟裸整数 body(`20082`)—— Integer;跟裸小数 body(`0.7`)
  —— Float;其余任何 body(`info`、正则、路径)—— String,逐字
  保留,即便内容像数字。
- `: true` / `: false` / `: null` —— 关键字 Bool / Null。
- `::` —— 强制字面 String,不进行分类。

```json5
{
  port: 20082,
  log_level: "info",
  debug: true,

  banned_patterns: [
    ".*\\.onion:\\d+",
    ".*\\.local",
  ],

  upstreams: [
    {
      host: "a.example",
      port: 1080,
      weight: 0.7,
      timeouts: { read: 30, write: 10 },
    },
    {
      host: "b.example",
      port: 1080,
      weight: 0.3,
    },
  ],

