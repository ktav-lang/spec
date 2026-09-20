>>>>> lang=en
## How the generator builds a file

`scripts/build_spec.mjs` walks the manifest in order. For each unit it reads
`manifest.js`/`meta.js` as strict UTF-8 text and `JSON.parse`s the payload after
`export default `, then statically shape-scans and decodes `body-1.md` ..
`body-N.md` **in order** (no code under `content/` is ever executed), then:

- for `frontmatter`: emit the concatenation of the `en` / `ru` / `zh`
  strings of `body-1` .. `body-N`, verbatim;
- for every other unit: emit
  `'#'.repeat(level) + ' ' + (numbered ? number + sep : '') + title[lang] + '\n'`,
  then the concatenated body strings;
- concatenate.

The same run writes the three content READMEs from `README.source.md`; in
`--check` mode it compares those files byte-for-byte as well as the three
generated specification files.

Commands:

>>>>> lang=ru
## Как генератор собирает файл

`scripts/build_spec.mjs` идёт по манифесту по порядку. Для каждого
юнита он читает `manifest.js`/`meta.js` как строгий UTF-8-текст и разбирает payload
после `export default ` через `JSON.parse`, затем статически сканирует и
декодирует `body-1.md` .. `body-N.md` **по порядку** (код под `content/`
никогда не исполняется), затем:

- для `frontmatter`: вывести конкатенацию строк `en` / `ru` / `zh` из
  `body-1` .. `body-N`, дословно;
- для любого другого юнита: вывести
  `'#'.repeat(level) + ' ' + (numbered ? number + sep : '') + title[lang] + '\n'`,
  затем конкатенацию строк тела;
- конкатенировать.

Команды:

```sh
node scripts/build_spec.mjs          # writes the 3 spec .md files and 3 content READMEs
node scripts/build_spec.mjs --check  # verifies byte-identity, writes nothing
node --test scripts/test_build_spec.mjs  # adversarial builder test suite (negative paths)
```

>>>>> lang=zh
## 生成器如何构建文件

`scripts/build_spec.mjs` 按顺序遍历 manifest。对每个单元,它以
严格的 UTF-8 读取 `manifest.js`/`meta.js`,并对 `export default ` 之后的
payload 执行 `JSON.parse`,然后**按顺序**静态扫描并解码 `body-1.md` ..
`body-N.md`(`content/` 下的代码从不被执行),然后:

- 对 `frontmatter`:输出 `body-1` .. `body-N` 的 `en` / `ru` / `zh`
  字符串的拼接,原样;
- 对其他任何单元:输出
  `'#'.repeat(level) + ' ' + (numbered ? number + sep : '') + title[lang] + '\n'`,
  然后输出正文字符串的拼接;
- 整体拼接。

命令:

```sh
node scripts/build_spec.mjs          # writes the 3 spec .md files and 3 content READMEs
node scripts/build_spec.mjs --check  # verifies byte-identity, writes nothing
node --test scripts/test_build_spec.mjs  # adversarial builder test suite (negative paths)
```

