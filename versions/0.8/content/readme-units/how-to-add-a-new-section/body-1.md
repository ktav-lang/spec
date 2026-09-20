>>>>> lang=en
## How to add a new section

Example (fictional): adding top-level-style section `## 9.9 Widget Frobnication`
with subsection `### 9.9.1 Widget Modes`, using space-only separators.

Steps:

1. Create the folders, `meta.js` (with `"bodyParts": 1`), and `body-1.md`
   per unit (mind the trailing-blank-line rule above).
2. Insert both folder names into `manifest.js` and the lock's `units` array at
   the correct document positions (after the unit preceding section 9.9).
3. Run `node scripts/build_spec.mjs`, check the `git diff`, run the parity
   checker, then commit units + regenerated `.md` files together.

`sec-9.9/meta.js`:

>>>>> lang=ru
## Как добавить новую секцию

Пример (вымышленный): добавляем секцию в стиле верхнего уровня
`## 9.9 Widget Frobnication` с подсекцией `### 9.9.1 Widget Modes` с
разделителями только из пробела.

Шаги:

1. Создайте папки, `meta.js` (с `"bodyParts": 1`) и `body-1.md` на
   каждый юнит (помните правило завершающей пустой строки выше).
2. Вставьте оба имени папок в `manifest.js` и массив `units` inventory lock
   на правильные позиции документа (после юнита, предшествующего секции 9.9).
3. Запустите `node scripts/build_spec.mjs`, посмотрите `git diff`,
   прогоните проверку паритета, затем коммитьте юниты и регенерированные
   файлы `.md` вместе.

`sec-9.9/meta.js`:

>>>>> lang=zh
## 如何新增一节

示例(虚构):新增顶层风格的节 `## 9.9 Widget Frobnication` 与子节
`### 9.9.1 Widget Modes`,分隔符只用空格。

步骤:

1. 创建各单元的文件夹、`meta.js`(含 `"bodyParts": 1`)与
   `body-1.md`(注意上面的末尾空行规则)。
2. 把两个文件夹名按正确的文档位置插入 `manifest.js` 与 inventory
   lock 的 `units` 数组(位于紧邻 9.9 之前的单元之后)。
3. 运行 `node scripts/build_spec.mjs`,检查 `git diff`,运行对等性
   检查,然后把单元与重新生成的 `.md` 文件一起提交。

`sec-9.9/meta.js`:

