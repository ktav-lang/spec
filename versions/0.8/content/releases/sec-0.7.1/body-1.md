>>>>> lang=en

Editorial. No change to what a conforming parser or writer does: every
0.7.0 document parses to the same Value, and every canonical rendering
is unchanged byte for byte.

- **§ 8.5 — new.** Specifies how a conformance run is verified, and
  adds `versions/0.7/tests/manifest.json`: a machine-readable inventory
  of the corpus naming the closed set of category directories, the exact
  fixture count for each, and every fixture whose primary input must be
  handed to the implementation as raw bytes rather than decoded text.
  This adds no obligation. § 8.1 already requires a parser-conforming
  implementation to accept *every* fixture under `valid/`, and § 8.2
  the writer equivalent; § 8.5 only makes that "every" checkable, after
  several independent runners were found reporting success while
  executing a truncated corpus, the wrong version's corpus, or a
  fixture whose bytes had been altered by a lossy text decode before
  the implementation ever saw them.
- **§ 8.4 — clarified.** A claim of parser- or writer-conformance is
  supported only by a corpus run performed by a runner satisfying
  § 8.5. § 8.5 introduces no separate conformance level for runners: a
  runner is not an implementation and makes no claim of its own, so its
  requirements take effect as conditions on the evidence for an
  implementation's claim.
- **Appendix A — corrected.** The 0.7.0 entry was still headed
  "unreleased" after 0.7.0 shipped; it now carries the release date.

>>>>> lang=ru

Редакторский выпуск. Поведение конформного парсера и writer'а не
меняется: каждый документ 0.7.0 разбирается в то же значение, а каждая
каноническая запись остаётся побайтово прежней.

- **§ 8.5 — новый.** Определяет, как проверяется прогон корпуса, и
  добавляет `versions/0.7/tests/manifest.json` — машиночитаемый реестр
  корпуса, называющий замкнутый набор директорий категорий, точное
  число фикстур в каждой и каждую фикстуру, чей первичный ввод должен
  передаваться реализации сырыми байтами, а не декодированным текстом.
  Нового обязательства это не вводит. § 8.1 уже требует, чтобы
  парсер-конформная реализация принимала *каждую* фикстуру из
  `valid/`, а § 8.2 — writer-эквивалент; § 8.5 лишь делает это
  «каждую» проверяемым, после того как несколько независимых раннеров
  были уличены в сообщении об успехе при усечённом корпусе, корпусе не
  той версии или фикстуре, чьи байты были изменены лоссивым текстовым
  декодированием ещё до того, как реализация их увидела.
- **§ 8.4 — уточнён.** Заявка на parser- или writer-конформанс
  подтверждается только прогоном корпуса раннером, удовлетворяющим
  § 8.5. Отдельного уровня конформанса для раннеров § 8.5 не вводит:
  раннер не является реализацией и не делает собственной заявки,
  поэтому его требования действуют как условия доказательности заявки
  реализации.
- **Приложение A — исправлено.** Запись о 0.7.0 оставалась
  озаглавленной «не выпущено» уже после выхода 0.7.0; теперь она несёт
  дату выпуска.

>>>>> lang=zh

编辑性发布。一致性 parser 与 writer 的行为不变:每个 0.7.0 文档解析
为相同的 Value,每个规范化输出逐字节不变。

- **§ 8.5 —— 新增。** 规定如何验证一次语料库运行,并新增
  `versions/0.7/tests/manifest.json`:语料库的机器可读清单,列明封闭
  的类别目录集合、每个类别的精确 fixture 数量,以及每个其主输入必须
  以原始字节而非解码文本交给实现的 fixture。这并未引入新的义务。
  § 8.1 已要求 parser 一致性实现接受 `valid/` 下的*每一个* fixture,
  § 8.2 为 writer 的对应要求;§ 8.5 只是让这个"每一个"变得可核查
  ——此前已发现多个独立运行器在执行被截断的语料库、错误版本的语料库,
  或其字节在实现看到之前已被有损文本解码改变的 fixture 时,仍报告成功。
- **§ 8.4 —— 澄清。** 对 parser 或 writer 一致性的声明,仅由满足
  § 8.5 的运行器所执行的语料库运行来支持。§ 8.5 不为运行器引入单独的
  一致性级别:运行器不是实现,自身不作出任何声明,因此其要求作为实现
  声明之证据的条件而生效。
- **附录 A —— 更正。** 0.7.0 条目在 0.7.0 发布后仍标注为"未发布";
  现已改为发布日期。

