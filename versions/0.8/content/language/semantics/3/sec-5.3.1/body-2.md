>>>>> lang=en
A segment beginning with `##` is none of these — it is not a key
validation failure; it is never parsed as a key at all. § 5.1
rule 2 dispatches any line whose trimmed form begins with `##` as
a comment (§ 3.4) before any key parsing begins, so such a line
can never reach this section. The collision is a *writer*
round-trip hazard, not a parser-side error: the canonical writer
MUST emit a `##`-prefixed key's first segment in quoted form
(§ 5.9.10) precisely so that the emitted line starts with `"`,
not `#`, and still parses as the intended pair on re-read.

>>>>> lang=ru
Сегмент, начинающийся с `##`, — не то и не другое: это не ошибка
валидации ключа; он вообще не разбирается как ключ. § 5.1
правило 2 направляет любую строку, чья обрезанная форма
начинается с `##`, в комментарий (§ 3.4) до начала какого-либо
разбора ключа, поэтому такая строка никогда не достигает этого
раздела. Коллизия — это *писательская* проблема round-trip, а не
парсерная ошибка: канонический писатель MUST выводить первый
сегмент ключа с префиксом `##` в квотированной форме (§ 5.9.10) —
именно для того, чтобы выводимая строка начиналась с `"`, а не с
`#`, и при повторном чтении по-прежнему разбиралась как задуманная
пара.

>>>>> lang=zh
以 `##` 起始的段不在此列 —— 它不是键校验失败;它根本不会被解析为
键:§ 5.1 规则 2 在任何键解析开始之前,即把 trim 后以 `##` 起始的
行分发为注释(§ 3.4),因此此类行永远到不了本节。该冲突是*写入器*
往返(round-trip)隐患,而非解析器侧错误:规范写入器 MUST 将
`##` 前缀键的首段以 quoted 形式输出(§ 5.9.10),正是为了输出行
以 `"` 而非 `#` 起始,在重读时仍能按意图解析为 pair。

