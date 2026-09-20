>>>>> lang=en
- If `L <= @@BODY_LINE_LIMIT@@`, `N = 1` (a single `body-1.md`).
- If `L > @@BODY_LINE_LIMIT@@`, `N = ceil(L / @@BODY_TARGET_LINES@@)`.

The N-1 cut points are chosen **once, for the whole unit**, and applied to
every language. They are chosen as paragraph-boundary INDICES, not character
offsets: boundary `i` is the i-th blank line, and that is the same break in
every translation, so `body-k.md` holds the same fragment in all three
languages. The indices come from the language with the most lines, since the
size rule above is expressed in its lines; ties break on the declared
language order, so the choice is deterministic. Within that language the
N-1 boundaries closest to the proportional targets `i*L/N` are taken, and an
equidistant tie chooses the earlier one. If the unit has fewer interior
blank lines than N-1, N is reduced to (available boundaries + 1) rather than
failing.

Semantic alignment across languages IS the goal, and it is the reason the
cuts are shared. Splitting each language independently — the earlier rule —
put three unrelated slices in one file: Chinese runs about half the length
of English for the same meaning, so its proportional targets landed
elsewhere and its parts drifted away from the other two. Nothing was lost,
because the generator concatenates, but a body file could not be opened and
compared, which is the whole reason the sources are Markdown.

One consequence to expect: editing a translation can change its line count,
move a shared boundary, and leave the OTHER languages' parts disagreeing
with the mandate. The builder refuses the build until the unit is re-cut.
That is the rule working, not a fault.

>>>>> lang=ru
- Если `L <= @@BODY_LINE_LIMIT@@`, то `N = 1` (один `body-1.md`).
- Если `L > @@BODY_LINE_LIMIT@@`, то `N = ceil(L / @@BODY_TARGET_LINES@@)`.

N-1 точек разреза выбираются **один раз, для всего юнита**, и
применяются ко всем языкам. Выбираются они как ИНДЕКСЫ границ абзацев,
а не как символьные смещения: граница `i` — это i-я пустая строка, и это
один и тот же разрыв в каждом переводе, поэтому `body-k.md` держит один
и тот же фрагмент во всех трёх языках. Индексы берутся из языка с
наибольшим числом строк, поскольку правило размера выше выражено в его
строках; при равенстве побеждает объявленный порядок языков, так что
выбор детерминирован. Внутри этого языка берутся N-1 границ, ближайших
к пропорциональным целям `i*L/N`, а при равном расстоянии — более
ранняя. Если у юнита меньше внутренних пустых строк, чем N-1, N
уменьшается до (доступных границ + 1), а не падает с ошибкой.

Семантическое выравнивание между языками ЯВЛЯЕТСЯ целью, и ради него
разрезы и сделаны общими. Независимое разбиение каждого языка — прежнее
правило — клало в один файл три несвязанных куска: китайский при том же
смысле примерно вдвое короче английского, поэтому его пропорциональные
цели попадали в другое место, и его части уходили от двух остальных.
Ничего не терялось, потому что генератор склеивает обратно, но файл
тела нельзя было открыть и сравнить — а ради этого источники и сделаны
Markdown.

Одно следствие, к которому надо быть готовым: правка перевода меняет
число его строк, сдвигает общую границу и оставляет части ДРУГИХ языков
не соответствующими мандату. Сборщик откажется собирать, пока юнит не
перенарежут. Это правило работает, а не ломается.

>>>>> lang=zh
- 若 `L <= @@BODY_LINE_LIMIT@@`,则 `N = 1`(单个 `body-1.md`)。
- 若 `L > @@BODY_LINE_LIMIT@@`,则 `N = ceil(L / @@BODY_TARGET_LINES@@)`。

N-1 个切割点**对整个单元只选一次**,并应用于所有语言。它们被选为段落
边界的**索引**,而不是字符偏移:边界 `i` 是第 i 个空行,而这在每种
翻译中都是同一个断点,因此 `body-k.md` 在三种语言中持有同一个片段。
索引取自行数最多的那个语言,因为上面的大小规则是以它的行数表述的;
若行数相等,则按声明的语言顺序决定,选择因而是确定的。在该语言内部,
取距比例目标 `i*L/N` 最近的 N-1 个边界;距离相等时取较早的那个。若
单元的内部空行少于 N-1 个,则把 N 降为(可用边界数 + 1),而不是失败。

各语言之间的语义对齐**正是**目标,共享切割点就是为此。旧规则让每种
语言独立拆分,结果一个文件里放着三段互不相干的内容:表达同样的意思
时,中文大约只有英文的一半长度,因此它的比例目标落在别处,分块也就
偏离了另外两种语言。由于生成器会重新拼接,内容并未丢失,但正文文件
无法被打开对照——而源文件改用 Markdown 正是为了这一点。

有一个需要预期的后果:修改译文会改变其行数、移动共享边界,并使**其他**
语言的分块不再符合强制规则。在该单元被重新切割之前,构建器会拒绝构建。
这是规则在生效,而不是出了故障。

