>>>>> lang=en
### `body-<k>.md`

Each `body-<k>.md` is Markdown carrying one block per language, each
introduced by its own separator line:

```text
 >>>>> lang=en
 ...raw text chunk k for English...
 >>>>> lang=ru
 ...
 >>>>> lang=zh
 ...
```

The example above is indented by one space on purpose: a separator is
recognised only at the very start of a line, so an indented one is
ordinary content. That is also the escape hatch if a body ever has to
quote a separator literally.

A block runs from the line after its separator to the line before the next
separator, or to end of file for the last one. The block therefore keeps
its own trailing newline, and a chunk ending in a blank line keeps that
blank line.

>>>>> lang=ru
### `body-<k>.md`

Каждый `body-<k>.md` — это Markdown, несущий по одному блоку на язык;
каждый блок вводится собственной строкой-разделителем:

```text
 >>>>> lang=en
 ...raw text chunk k for English...
 >>>>> lang=ru
 ...
 >>>>> lang=zh
 ...
```

Пример выше намеренно сдвинут на один пробел: разделитель распознаётся
только в самом начале строки, поэтому сдвинутый — обычное содержимое.
Это же и запасной выход, если телу когда-нибудь понадобится процитировать
разделитель буквально.

Блок идёт со строки после своего разделителя до строки перед следующим
разделителем, а последний — до конца файла. Поэтому блок сохраняет
собственный завершающий перевод строки, а кусок, кончающийся пустой
строкой, сохраняет и её.

>>>>> lang=zh
### `body-<k>.md`

每个 `body-<k>.md` 都是 Markdown,每种语言一个块,每个块由自己的
分隔行引入:

```text
 >>>>> lang=en
 ...raw text chunk k for English...
 >>>>> lang=ru
 ...
 >>>>> lang=zh
 ...
```

上面的示例特意缩进了一个空格:分隔行只有位于行首才会被识别,缩进后
就是普通内容。如果正文确实需要逐字引用一个分隔行,这也正是其退路。

一个块从其分隔行的下一行开始,到下一个分隔行的前一行结束;最后一个
块则到文件末尾。因此块保留自己的结尾换行,以空行结尾的块也保留那个
空行。

