# versions/0.7/content/ —— 规范内容单元

**Languages:** [English](README.md) · [Русский](README.ru.md) · **简体中文**

## 这个目录是什么

本目录是 `versions/0.7/spec.md`、`versions/0.7/spec.ru.md` 与
`versions/0.7/spec.zh.md` 的**逐节来源(源头)**。

- `versions/0.7/` 下的三个 `.md` 文件是**生成的构件**。它们仍保留在
  仓库中,以便在 GitHub 上直接阅读规范,但**切勿手动编辑**:手工
  改动会被下一次构建覆盖,并使 `node scripts/build_spec.mjs --check`
  失败。
- 本目录中的**内容单元**(每节一个文件夹)才是人来编辑的对象。
- `scripts/check_translation_parity.py` 仍继续对生成的 `.md` 文件
  运行,作为事后结构关卡;`node scripts/build_spec.mjs --check` 才是
  逐字节关卡。

## 当前清单

共 103 个单元:1 个 `frontmatter/`、97 个带编号的 `sec-<number>/`
(`sec-1`、`sec-3.1`、`sec-5.3.3`、`sec-10.7`),以及 5 个命名的
`named-<slug>/`(`named-abstract`、`named-appendix-a` ..
`named-appendix-d`)。另有:

- `manifest.js` —— 单元的有序列表(见下文)。
- `package.json` —— `{"type":"module"}`。历史遗留:曾用于
  `build_spec.mjs` 把 `meta.js`/`body-*.js` 当作 ES 模块动态导入的阶段。
  在完成 closed-world 加固后(`content/` 下再无任何代码被执行——
  `manifest.js` 与 `meta.js` 作为 UTF-8 文本读取并通过 `JSON.parse` 解析,
  `body-*.js` 经静态扫描后解码),此文件已不再是功能上必需的,但仍保留
  在原位,顶层仍允许它存在。

## 文件夹命名约定

- **带编号的节**:`sec-<number>`,其中 `<number>` 是标题中出现的
  确切节号:`sec-1`、`sec-5.3.3`。
- **不带编号的节**(没有编号的 >= 2 级标题):`named-<slug>`。slug
  **仅由英文标题文本**派生(因此与语言无关):
  1. 如有 `.`,在第一个 `.` 处截断("Appendix A. Changes" ->
     "Appendix A");
  2. 转小写;
  3. 把每一段 `[a-z0-9]` 之外的连续字符替换为单个 `-`;
  4. 去除首尾的 `-`。

  例:"Abstract" -> `abstract`;"Appendix D. Migration from 0.6.x" ->
  `appendix-d`。
- **`frontmatter/`** 是特殊单元,保存第一个节标题之前的全部内容:
  h1 标题行、`**Languages:**` / `**Version:**` / `**Date:**` 字段块,
  以及——仅在 `ru`/`zh` 正文串中——关于译文的信息性免责声明
  blockquote。h1 标题**位于**frontmatter 正文内容之内,原样保留;
  `frontmatter` 自身没有标题。

## 单元内容

每个单元目录恰好包含:`meta.js`、`body-1.js`、……、`body-N.js`
(N >= 1)。`content/` 下的 `.md` 文件只有三个根 README(`README.md`、
`README.ru.md`、`README.zh.md`);单元目录内完全禁止 `.md` 文件。

## README 的统一源对象与 inventory lock

`scripts/locks/section-inventory.0.7.lock.json` 是独立的、有版本的有序
inventory。Builder 在普通 CLI 运行中必须读取它,并拒绝 `manifest.js` 的
成员或顺序发生漂移。

`README.source.js` 是本目录三个 README 共用的 `{ en, ru, zh }` source
object。Builder 会静态检查它并据此生成 `README.md`、`README.ru.md` 和
`README.zh.md`;手动修改任何一个 README 都会使 `--check` 失败。

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

// sec-3.1/meta.js
export default {
  "kind": "numbered",
  "number": "3.1",
  "sep": " ",
  "level": 3,
  "title": {
    "en": "...",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}

// named-appendix-a/meta.js
export default {
  "kind": "named",
  "number": null,
  "level": 2,
  "title": {
    "en": "...",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}
```

整个文件必须逐字节等于 `export default ` 加上以严格 JSON 序列化的值
（`JSON.stringify(value, null, 2)`）再加单个末尾换行：每行一个键、
2 空格缩进、LF 换行、无末尾分号。`export default ` 之后的 payload 是作为
JSON（`JSON.parse`）解析的，**不是**作为 JavaScript 对象字面量求值——
末尾逗号、注释、不带引号的键以及分号在那里永远不合法（与 `body-<k>.js`
不同，后者是 JS 源码，只是受到严格限制）。重复的键同样会被拒绝：构建器
将文件与上面的规范序列化逐字节比较，重复键会使原始文件与它不一致。

字段含义:

- `kind` —— `frontmatter`、`numbered` 或 `named`。
- `number` —— 以字符串表示的节号(`"3.1"`),非编号单元与
  frontmatter 为 `null`。
- `level` —— 标题中 `#` 的数量(`##` = 2)。frontmatter 为 `null`。
- `title` —— 每种语言的标题文本,**不含**前导编号与分隔符;生成器
  会重新拼接上去。
- `sep` —— 编号与标题之间实际使用的分隔符。**它为何存在:**规范
  的标题约定有意混用 `## 1. Introduction`(顶层编号节,点 + 空格)
  与 `### 3.1 Character Set`(更深的子节,仅空格)。生成器必须逐字节
  复现每个标题,因此实际分隔符按单元记录。只有 `". "` 与 `" "` 合法。
  抽取脚本强制同一单元的三种语言使用相同的 `sep`。
- `bodyParts` —— 该单元 `body-*.js` 文件的整数个数(`body-1.js` ..
  `body-N.js` 中的 N)。总是 >= 1。所有单元(包括 `frontmatter`)都
  有,且总是排在**最后**。

### `body-<k>.js`

每个 `body-<k>.js` 恰好是如下形态(2 空格缩进、模板字面量
(template literal)、字面量内是真正的多行正文、字面量内不添加额外
空白、`};` 之后有换行):

```js
export default {
  en: `...raw text chunk k for English...`,
  ru: `...`,
  zh: `...`,
};
```

某语言单元的完整正文,是该语言第 1..N 块按顺序的**拼接**,块与块
之间**没有分隔符**。

**转义规则(机械操作,严格按此顺序)。**要把原始文本 `t` 嵌入模板
字面量:

1. 把每个 `\` 替换为 `\\`;
2. 把每个反引号替换为 `` \` ``;
3. 把每个 `${` 替换为 `\${`;

然后把结果用反引号包裹。反斜杠必须**最先**替换,否则会被双重转义。
**切勿手工重新键入内容——请用脚本完成这一变换。**

**拆分规则(精确数字)。**令 `L` 为该单元三种语言正文行数的最大值。

- 若 `L <= 120`,则 `N = 1`(单个 `body-1.js`)。
- 若 `L > 120`,则 `N = ceil(L / 100)`。

每种语言**独立**拆成 N 块,只允许在空行边界处切割(空行——绝不在
行中间),并选取距比例目标偏移 `i*L/N`(`i = 1..N-1`)最近的空行作为
N-1 个切割点;如果距离相等,则选择较早的空行边界。若某语言的内部空行不足以提供 N-1 个切割点,则把
**整个单元**的 N 降为(可用切割点数 + 1),而不是失败。各语言之间
分块语义对齐**不是**目标——这只是文件大小的卫生措施。

## 正文文件(对逐字节精确性至关重要)

每个语言的单元正文,是 `body-1.js` .. `body-N.js` 字符串值按顺序的
拼接,**块之间不插入任何分隔符**。生成器在单元之间也不插入任何
内容,因此空行分隔位于单元**最后一块的末尾**:

- 除最后一个单元外,每个单元都恰好以一行空行结尾,即最后一块的
  字符串以 `"\n\n"` 结束。
- **manifest 顺序中的最后一个单元**以单个末尾换行结束、不带末尾
  空行(`"\n"`),作为其最后一块的最后几个字节。
- frontmatter 正文以第一个节标题之前的那一行空行结尾。

当单元被拆为多块时,这些末尾字节就放在最后一块的末尾——更早的
块除了拆分产生的空白外,不带有自己的特殊末尾空白。

弄错这一点,是让 `--check` 失败的头号方式。

## `manifest.js`

按真实文档顺序排列的 103 个文件夹名的显式**有序**数组。它以
`["frontmatter", "named-abstract", "sec-1", ...]` 开头,以
`[..., "named-appendix-d"]` 结尾。它**绝不按字母序排序**:
`"sec-10.7"` 必须排在 `"sec-2"` 之后,命名节也处于它们在文档中的
真实位置。独立的 lock `scripts/locks/section-inventory.0.7.lock.json`
保存相同的有序列表;有意新增或删除章节时,两个文件 MUST 同时更新。
仅修改 manifest 会被 lock 检查拒绝。

## 生成器如何构建文件

`scripts/build_spec.mjs` 按顺序遍历 manifest。对每个单元,它以
严格的 UTF-8 读取 `manifest.js`/`meta.js`,并对 `export default ` 之后的
payload 执行 `JSON.parse`,然后**按顺序**静态扫描并解码 `body-1.js` ..
`body-N.js`(`content/` 下的代码从不被执行),然后:

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

`--check` 会验证 inventory lock,在内存中重新生成全部六个文件,并与
已提交的文件逐字节比较:三个规范文件与三个 content README。成功时:
退出码 0 且**完全静默**。出现分歧时:退出码 1,并给出诊断
信息,指出第一个不同字节所在的单元、语言和行。它不写任何文件。

`node --test scripts/test_build_spec.mjs` 运行构建器的对抗性测试套件
(负面路径):它向验证器提供故意损坏的内容树,断言本 README 中记载的每一条
closed-world 不变量都会被拒绝。

推荐工作流:编辑单元文件 -> 运行 `node scripts/build_spec.mjs` ->
核对三个 `.md` 文件的 `git diff` 是否与你的意图完全一致 -> 运行
`scripts/check_translation_parity.py` -> 把单元改动与重新生成的
`.md` 文件**一起**提交。

## 如何新增一节

示例(虚构):新增顶层风格的节 `## 9.9 Widget Frobnication` 与子节
`### 9.9.1 Widget Modes`,分隔符只用空格。

步骤:

1. 创建各单元的文件夹、`meta.js`(含 `"bodyParts": 1`)与
   `body-1.js`(注意上面的末尾空行规则)。
2. 把两个文件夹名按正确的文档位置插入 `manifest.js` 与 inventory
   lock 的 `units` 数组(位于紧邻 9.9 之前的单元之后)。
3. 运行 `node scripts/build_spec.mjs`,检查 `git diff`,运行对等性
   检查,然后把单元与重新生成的 `.md` 文件一起提交。

`sec-9.9/meta.js`:

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

`sec-9.9/body-1.js`(虚构占位内容),并标出末尾换行规则适用的位置:

```js
// sec-9.9/body-1.js  (last unit in manifest order? then en must end "\n", else "\n\n")
export default {
  en: `Frobnicate the widget.

(body of 9.9)
`,
  ru: `...`,
  zh: `...`,
};
```

下一个单元标题之前的末尾空行,是该单元最后一块(此处 `body-1.js`,
因为 `"bodyParts": 1`)的最后几个字节:上面 `en` 字符串以 `"\n\n"`
结尾(恰好一行空行),除非 9.9 是 manifest 顺序中的最后一个单元——
那它以单个 `"\n"` 结尾。多块单元中更早的块不携带这类末尾字节。

## 历史 / 引导

这套布局由一次性的机械迁移创建,记录在
`scripts/archive/extract_content_units.py` 中:它按行范围逐字节切分
当时的三个 `.md` 文件成单元(未重新键入任何文本),并验证了重建
结果逐字节一致。后来该脚本被扩展为直接生成当前的 `body-*.js` 模式
——每个单元有带 `bodyParts` 的 `meta.js` 加 `body-1..N`。该脚本
仅作为出处留档,不是常规工具:它拒绝覆盖已存在的 `content/`,且
没有覆盖标志。从零重建意味着先手动删除 `content/`,作为单独的、
有意的动作。**日常**工作流是反方向:编辑单元,然后由
`build_spec.mjs` 重新生成 `.md` 文件。

## 范围之外

CI 已在 `.github/workflows` 中于每次 push/PR 时运行
`node scripts/build_spec.mjs --check` 与
`node --test scripts/test_build_spec.mjs`。
