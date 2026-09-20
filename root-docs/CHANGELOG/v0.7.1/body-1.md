>>>>> lang=en
## [0.7.1] — 2026-09-16

Editorial. No change to what a conforming parser or writer does: every
0.7.0 document parses to the same Value, and every canonical rendering
is unchanged byte for byte. Implementations pinned to 0.7.0 remain
conformant to the format; what changes is how a conformance run is
verified.

### Added

- **§ 8.5 — conformance runner contract**, and
  `versions/0.7/tests/manifest.json`: a machine-readable inventory of
  the corpus naming the closed set of category directories, the exact
  fixture count for each, and every fixture whose primary input must
  reach the implementation as raw bytes rather than decoded text.

  This adds no obligation. § 8.1 already requires a parser-conforming
  implementation to accept *every* fixture under `valid/`, and § 8.2
  the writer equivalent — § 8.5 only makes that "every" checkable.
  It exists because several independent runners were found reporting
  success while executing a truncated corpus, a previous version's
  corpus, or a fixture whose bytes had been altered by a lossy text
  decode before the implementation ever saw them. That is the reason
  this ships as a PATCH: the requirement is not new, only its
  verification is.

### Changed

- **§ 8.4** — a claim of parser- or writer-conformance is supported
  only by a corpus run performed by a runner satisfying § 8.5. § 8.5
  introduces no separate conformance level for runners: a runner is
  not an implementation and makes no claim of its own, so its
  requirements take effect as conditions on the evidence for an
  implementation's claim.

### Fixed

- **Appendix A** — the 0.7.0 entry was still headed "unreleased" after
  0.7.0 shipped; it now carries the release date.

>>>>> lang=ru
## [0.7.1] — 2026-09-16

Редакторский выпуск. Поведение конформного парсера и writer'а не
меняется: каждый документ 0.7.0 разбирается в то же значение, а каждая
каноническая запись остаётся побайтово прежней. Реализации, запиненные
на 0.7.0, остаются конформными формату; меняется то, как проверяется
прогон корпуса.

### Добавлено

- **§ 8.5 — контракт раннера конформанс-тестов** и
  `versions/0.7/tests/manifest.json`: машиночитаемый реестр корпуса,
  называющий замкнутый набор директорий категорий, точное число
  фикстур в каждой и каждую фикстуру, чей первичный ввод должен
  дойти до реализации сырыми байтами, а не декодированным текстом.

  Нового обязательства это не вводит. § 8.1 уже требует, чтобы
  парсер-конформная реализация принимала *каждую* фикстуру из
  `valid/`, а § 8.2 — writer-эквивалент; § 8.5 лишь делает это
  «каждую» проверяемым. Раздел появился потому, что несколько
  независимых раннеров были уличены в сообщении об успехе при
  усечённом корпусе, корпусе предыдущей версии или фикстуре, чьи
  байты были изменены лоссивым текстовым декодированием ещё до того,
  как реализация их увидела. Именно поэтому это PATCH: требование не
  новое — новой является только его проверка.

### Изменено

- **§ 8.4** — заявка на parser- или writer-конформанс подтверждается
  только прогоном корпуса раннером, удовлетворяющим § 8.5. Отдельного
  уровня конформанса для раннеров § 8.5 не вводит: раннер не является
  реализацией и не делает собственной заявки, поэтому его требования
  действуют как условия доказательности заявки реализации.

### Исправлено

- **Приложение A** — запись о 0.7.0 оставалась озаглавленной «не
  выпущено» уже после выхода 0.7.0; теперь она несёт дату выпуска.

>>>>> lang=zh
## [0.7.1] —— 2026-09-16

编辑性发布。一致性 parser 与 writer 的行为不变:每个 0.7.0 文档解析为
相同的 Value,每个规范化输出逐字节不变。固定在 0.7.0 的实现对该格式
仍然一致;改变的是如何验证一次语料库运行。

### 新增

- **§ 8.5 —— conformance 测试运行器契约**,以及
  `versions/0.7/tests/manifest.json`:语料库的机器可读清单,列明封闭
  的类别目录集合、每个类别的精确 fixture 数量,以及每个其主输入必须以
  原始字节而非解码文本到达实现的 fixture。

  这并未引入新的义务。§ 8.1 已要求 parser 一致性实现接受 `valid/` 下
  的*每一个* fixture,§ 8.2 为 writer 的对应要求——§ 8.5 只是让这个
  "每一个"变得可核查。该节之所以存在,是因为已发现多个独立运行器在
  执行被截断的语料库、上一版本的语料库,或其字节在实现看到之前已被
  有损文本解码改变的 fixture 时,仍报告成功。这也正是它作为 PATCH
  发布的理由:要求并非新增,新增的只是对它的核查。

### 变更

- **§ 8.4** —— 对 parser 或 writer 一致性的声明,仅由满足 § 8.5 的
  运行器所执行的语料库运行来支持。§ 8.5 不为运行器引入单独的一致性
  级别:运行器不是实现,自身不作出任何声明,因此其要求作为实现声明
  之证据的条件而生效。

### 修复

- **附录 A** —— 0.7.0 条目在 0.7.0 发布后仍标注为"未发布";现已改为
  发布日期。

