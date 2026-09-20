>>>>> lang=en
`sec-9.9/body-1.md` (fictional placeholder content), marking where the
trailing newline rules apply:

```js
// sec-9.9/body-1.md  (last unit in manifest order? then en must end "\n", else "\n\n")
export default {
  en: `Frobnicate the widget.

(body of 9.9)
`,
  ru: `...`,
  zh: `...`,
};
```

The trailing blank line before the next unit's heading is the LAST bytes of
the LAST chunk of the unit (here `body-1.md`, since `"bodyParts": 1`): the
`en` string above ends `"\n\n"` (exactly one blank line) unless 9.9 is the
last unit in manifest order, in which case it ends with a single `"\n"`.
Earlier chunks (in a multi-chunk unit) carry no such trailing bytes.

>>>>> lang=ru
`sec-9.9/body-1.md` (вымышленное содержимое-заполнитель) с пометками,
где действуют правила завершающего перевода строки:

```js
// sec-9.9/body-1.md  (last unit in manifest order? then en must end "\n", else "\n\n")
export default {
  en: `Frobnicate the widget.

(body of 9.9)
`,
  ru: `...`,
  zh: `...`,
};
```

Завершающая пустая строка перед заголовком следующего юнита — это
ПОСЛЕДНИЕ байты ПОСЛЕДНЕГО куска юнита (здесь `body-1.md`, поскольку
`"bodyParts": 1`): строка `en` выше заканчивается `"\n\n"` (ровно одна
пустая строка), если только 9.9 не последний юнит в порядке манифеста —
тогда она заканчивается одним `"\n"`. Более ранние куски (в юните из
нескольких кусков) таких завершающих байтов не несут.

>>>>> lang=zh
`sec-9.9/body-1.md`(虚构占位内容),并标出末尾换行规则适用的位置:

```js
// sec-9.9/body-1.md  (last unit in manifest order? then en must end "\n", else "\n\n")
export default {
  en: `Frobnicate the widget.

(body of 9.9)
`,
  ru: `...`,
  zh: `...`,
};
```

下一个单元标题之前的末尾空行,是该单元最后一块(此处 `body-1.md`,
因为 `"bodyParts": 1`)的最后几个字节:上面 `en` 字符串以 `"\n\n"`
结尾(恰好一行空行),除非 9.9 是 manifest 顺序中的最后一个单元——
那它以单个 `"\n"` 结尾。多块单元中更早的块不携带这类末尾字节。

