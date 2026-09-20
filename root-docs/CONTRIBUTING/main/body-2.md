>>>>> lang=en
Backward-compatible extensions. A new keyword, a new primitive form,
a new multi-line-string variant — something old parsers would reject
but whose absence doesn't break existing documents.

Open an issue first. The issue must answer, in order:

1. **What does this let users do that they currently can't?** Show a
   real config, not a synthetic example.
2. **What's the cost?** Every rule added is a rule every implementer
   has to get right, and a rule every reader has to know.
3. **Can the same thing be expressed within the existing grammar?**
   If yes, that's usually the better answer.

Additions ship as a new `versions/<x>.(y+1)/` directory with its own
spec and tests. The previous version stays frozen — implementations
continue to pin to whichever version they support.

### 3. Breaking — `MAJOR` bump

A change in grammar or semantics that makes some previously-valid
document invalid, or changes its meaning. These are rare. Same
process as additive, plus a migration note that describes what
changes and why.

Breaking changes land in a new `versions/(x+1).0/` directory.
Previous majors remain published forever — implementations targeting
them are not obsoleted.

>>>>> lang=ru
Обратно совместимые расширения. Новое ключевое слово, новая
примитивная форма, новый вариант многострочной строки — то, что
старые парсеры отвергли бы, но отсутствие чего не ломает существующие
документы.

Сначала откройте issue. В issue нужно ответить, по порядку:

1. **Что это позволяет пользователям делать, чего они сейчас не могут?**
   Покажите реальный конфиг, не синтетический пример.
2. **Какова цена?** Каждое добавленное правило — это правило, которое
   должен верно реализовать каждый реализатор, и правило, которое
   должен знать каждый читатель.
3. **Можно ли выразить то же самое в существующей грамматике?** Если
   да — обычно это и есть правильный ответ.

Дополнения выходят как новая директория `versions/<x>.(y+1)/` с
собственной спецификацией и тестами. Предыдущая версия остаётся
замороженной — реализации продолжают закрепляться за той версией,
которую поддерживают.

### 3. Ломающие — bump `MAJOR`

Изменение грамматики или семантики, делающее некоторые
ранее-валидные документы невалидными или меняющее их смысл. Они
редки. Процесс тот же, что для аддитивных, плюс migration note,
описывающая, что меняется и почему.

Ломающие изменения приземляются в новой директории
`versions/(x+1).0/`. Предыдущие мажорные версии остаются
опубликованными навсегда — реализации, ориентированные на них, не
устаревают.

>>>>> lang=zh
向后兼容的扩展：一个新关键字、一种新的原始形式、一种新的多行字符串
变体——旧解析器会拒绝它，但缺失它不会破坏既有文档。

请先开 issue。该 issue 必须按顺序回答：

1. **它让用户能做哪些现在做不到的事？** 请出示真实的配置，而非
   合成示例。
2. **代价是什么？** 每新增一条规则，都是每个实现者都必须做对的
   规则，也是每个读者都必须知道的规则。
3. **能否用现有语法表达同一件事？** 如果能，那通常才是更好的答案。

新增以新目录 `versions/<x>.(y+1)/` 发布，附带自身的规范与测试。
上一版本保持冻结——实现继续锁定到它们所支持的版本。

### 3. 破坏性——`MAJOR` 递进

会让此前有效的文档变得无效、或改变其语义的语法/语义变更。这类改动
很罕见。流程与新增性一致，另加一份迁移说明，描述改了什么、为何而改。

破坏性变更落到新目录 `versions/(x+1).0/`。旧的主要版本将永久保留
发布——面向它们的实现不会被作废。

