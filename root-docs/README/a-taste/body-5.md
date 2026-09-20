>>>>> lang=en
```text
retries: 3
version: 1.2
build:: 0007
label: v1.2
```

```json5
{
  retries: 3,        // bare integer — Integer
  version: 1.2,      // bare decimal — Float
  build: "0007",     // `::` — forced literal String
  label: "v1.2",     // not a bare number — String
}
```

>>>>> lang=ru
```text
retries: 3
version: 1.2
build:: 0007
label: v1.2
```

```json5
{
  retries: 3,        // голое целое — Integer
  version: 1.2,      // голое десятичное — Float
  build: "0007",     // `::` — форсированная литеральная String
  label: "v1.2",     // не голое число — String
}
```

>>>>> lang=zh
```text
retries: 3
version: 1.2
build:: 0007
label: v1.2
```

```json5
{
  retries: 3,        // 裸整数 — Integer
  version: 1.2,      // 裸小数 — Float
  build: "0007",     // `::` — 强制字面 String
  label: "v1.2",     // 并非裸数字 — String
}
```

