export default {
  en: `
- **Empty Object root:** the canonical form is the empty file
  (zero bytes). No \`{}\` is emitted. (Parses back per § 5.0.1
  rule 1 — no content lines.)
- **Empty Array root:** the canonical form is the single line
  \`[]\` followed by an \`LF\`. (Parses back per § 5.0.1 rule 3 —
  closed inline array \`[ ]\` on the first content line.)
- **Object root with pairs:** each pair occupies its own line at
  indent level 0; no opening or closing brace at the root.
- **Array root with items:** each item occupies its own line at
  indent level 0; no opening or closing bracket at the root
  **unless** the first item, rendered on its own line(s) at
  indent 0, would itself be detected by § 5.0.1 as establishing a
  different root. This happens in two shapes:
  - the first item is a non-empty Object / Array, whose own
    canonical rendering opens with a lone \`{\` or \`[\` on its own
    line (§ 5.9.6) — matching § 5.0.1 rule 4 or rule 5; or
  - the first item is an **empty** Object / Array, whose canonical
    rendering is the single closed-inline line \`{}\` or \`[]\`
    (§ 5.9.6) — matching § 5.0.1 rule 2 or rule 3.
  In either case the writer wraps the root in explicit brackets:
  \`[\` on its own line at indent 0, each item at indent + 1
  (4 spaces), and \`]\` on its own line at indent 0. This forces the
  parse to take § 5.0.1 rule 5 (lone \`[\` → multi-line Array root)
  with the original first item — compound or empty-compound alike —
  nested one level in.

The choice between an Object root and an Array root is determined
by the Value's kind, and parses back per § 5.0.1.

Note: an Object pair line cannot be mistaken for a closed-inline or
lone-opener root line (it always has a \`:\` separator); only Array
roots whose first item is itself a compound (empty or not) require
the wrap. A separate hazard — an Array root's first item whose bare
rendering would itself be recognised as a pair line (§ 5.0.1 rule 6)
— is resolved not by this wrap but by forcing the raw-marker form
for that one item instead (§ 5.9.6).

`,
  ru: `
- **Пустой Object корень:** каноническая форма — пустой файл
  (ноль байтов). Никакие \`{}\` не выводятся. (Парсится обратно по
  § 5.0.1 правило 1 — нет содержательных строк.)
- **Пустой Array корень:** каноническая форма — одна строка
  \`[]\` с завершающим \`LF\`. (Парсится обратно по § 5.0.1
  правило 3 — замкнутый inline-массив на первой содержательной
  строке.)
- **Object корень с парами:** каждая пара на своей строке на
  уровне отступа 0; никаких открывающих или закрывающих фигурных
  скобок в корне.
- **Array корень с элементами:** каждый элемент на своей строке
  на уровне отступа 0; никаких открывающих или закрывающих
  квадратных скобок в корне, **если** первый элемент, отрисованный
  на своей строке (строках) с отступом 0, сам не был бы распознан
  по § 5.0.1 как устанавливающий другой корень. Это происходит в
  двух формах:
  - первый элемент — непустой Object / Array, чья собственная
    каноническая форма открывается одиночным \`{\` или \`[\` на своей
    строке (§ 5.9.6) — совпадает с правилом 4 или правилом 5
    § 5.0.1; либо
  - первый элемент — **пустой** Object / Array, чья каноническая
    форма — одна замкнутая inline-строка \`{}\` или \`[]\` (§ 5.9.6) —
    совпадает с правилом 2 или правилом 3 § 5.0.1.
  В обоих случаях writer оборачивает корень в явные скобки: \`[\`
  на своей строке отступа 0, каждый элемент на отступе + 1
  (4 пробела), и \`]\` на своей строке отступа 0. Это заставляет
  парсер применить правило 5 § 5.0.1 (одиночный \`[\` → многострочный
  Array-корень) с исходным первым элементом — составным или
  пустым-составным одинаково — вложенным на один уровень внутрь.

Выбор между Object-корнем и Array-корнем определяется видом Value и
парсится обратно по § 5.0.1.

Замечание: pair-строка Object не может быть спутана с
одиночным открывающим брейсом (у неё всегда есть \`:\`
разделитель); только Array-корни, чей первый элемент — составное
значение (Object или Array, пустое или нет), требуют обёртки.
Отдельная угроза — первый элемент
Array-корня, чья голая форма сама была бы распознана как
pair-строка (§ 5.0.1 правило 6) — решается не этой обёрткой, а
принудительной raw-маркерной формой именно для этого элемента
(§ 5.9.6).

`,
  zh: `
- **空 Object 根:** 规范形式为空文件(零字节)。不输出 \`{}\`。
  (按 § 5.0.1 规则 1 反向解析 —— 无内容行。)
- **空 Array 根:** 规范形式为单行 \`[]\` 后接 \`LF\`。(按
  § 5.0.1 规则 3 反向解析 —— 首条内容行的闭合 inline 数组。)
- **有对的 Object 根:** 每对在自己的行上,缩进级 0;根处无大
  括号。
- **有项的 Array 根:** 每项在自己的行上,缩进级 0;根处无方括号
  —— **除非**首项按缩进 0 渲染在自己的行(或多行)上时,本身会被
  § 5.0.1 识别为建立了不同的根。这有两种形状:
  - 首项是非空的 Object / Array,其自身的规范渲染以单独的 \`{\`
    或 \`[\` 开始于自己的行(§ 5.9.6)—— 匹配 § 5.0.1 规则 4 或
    规则 5;或
  - 首项是**空的** Object / Array,其规范渲染是单行闭合 inline
    形式 \`{}\` 或 \`[]\`(§ 5.9.6)—— 匹配 § 5.0.1 规则 2 或规则 3。
  两种情形下,writer 都用显式括号包裹根:\`[\` 在缩进 0 的自身行,
  各项在缩进 + 1(4 空格),\`]\` 在缩进 0 的自身行。这迫使解析
  按 § 5.0.1 规则 5(单独的 \`[\` → 多行 Array 根)进行,原始首项
  —— 无论是复合值还是空复合值 —— 都向内嵌套一层。

Object 根与 Array 根之间的选择由 Value 的 kind 决定,并按 § 5.0.1
反向解析。

说明:Object 对行不会被误识为单独的开启符(总有 \`:\` 分隔符);
仅当首项本身是复合值(Object 或 Array,空或非空)时,Array 根才
需要包裹。另一种风险 ——
Array 根的第一项,若其裸形式本身会被识别为 pair line(§ 5.0.1
规则 6)—— 并非通过此包裹解决,而是对该项强制使用原始标记形式
(§ 5.9.6)。

`,
};
