>>>>> lang=en
## Body files (critical for byte-exactness)

The unit body in each language is the concatenation of `body-1.md` ..
`body-N.md` string values, in order, with **no separator inserted between
chunks**. The generator inserts nothing between units either, so
blank-line separation lives at the END of the **last chunk of the unit**:

- Every unit **except the last unit's** ends with exactly ONE blank line,
  i.e. the last chunk's string ends with `"\n\n"`.
- The **last unit in manifest order** ends with a single final newline and
  no trailing blank line (`"\n"`), as the last bytes of its last chunk.
- The frontmatter body ends with the one blank line before the first
  section heading.

When a unit is split into multiple chunks, those trailing bytes simply live
at the end of the LAST chunk — earlier chunks carry no special trailing
whitespace of their own beyond what the split produced.

Getting this wrong is the #1 way to make `--check` fail.

>>>>> lang=ru
## Файлы тела (критично для точности байт-в-байт)

Тело юнита на каждом языке — конкатенация строковых значений
`body-1.md` .. `body-N.md` по порядку, **без вставленного разделителя
между кусками**. Генератор не вставляет ничего и между юнитами, поэтому
пустая строка-разделитель живёт в КОНЦЕ **последнего куска юнита**:

- Каждый юнит **кроме последнего** заканчивается ровно ОДНОЙ пустой
  строкой, то есть строка последнего куска заканчивается `"\n\n"`.
- **Последний юнит в порядке манифеста** заканчивается одним финальным
  переводом строки без завершающей пустой строки (`"\n"`) — последними
  байтами своего последнего куска.
- Тело frontmatter заканчивается одной пустой строкой перед первым
  заголовком секции.

Когда юнит разбит на несколько кусков, эти завершающие байты просто
живут в конце ПОСЛЕДНЕГО куска — более ранние куски не несут своего
особого завершающего пробела сверх того, что дало разбиение.

Ошибиться здесь — способ №1 уронить `--check`.

>>>>> lang=zh
## 正文文件(对逐字节精确性至关重要)

每个语言的单元正文,是 `body-1.md` .. `body-N.md` 字符串值按顺序的
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

