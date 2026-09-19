>>>>> lang=en

This is a document-behaviour non-event: no valid document changes its
Value or its acceptance under the lax entry point (`parse`/`loads`)
between 0.7.x and 0.8.0. The only change is to what a parser-conforming
implementation must additionally expose and verify.

§ 8.1 now requires a strict parsing entry point (`parse_strict` /
`loads_strict`) that rejects a lossy scalar — one whose lexical form
differs from the canonical form of the number § 5's rules 13–14 infer
from it, such as a leading zero (`01234`), an explicit `+` sign
(`+79991234567`), a base-prefixed literal (`0x1A2B`, `0o755`,
`0b1010`), digit-group underscores (`1_000_000`), or a non-canonical
float spelling (`1.10`, `5e3`) — with `LossyScalar`, naming the exact
lexical form and the canonical form it would otherwise silently become.
The lax entry point is unaffected: it continues to accept the same
scalar and canonicalise it, exactly as before.

Two migration paths, depending on what an implementation already has:

- An implementation whose strict/canonical-validation entry point
  delegates scalar classification to the same code path its lax parser
  uses (true of the Rust reference implementation and every binding
  built directly on it) already satisfies this requirement. No code
  change is needed; only the version declaration moves to 0.8.0.
- An implementation with no strict entry point at all, or with one
  that does not independently re-derive the canonical form for every
  numeric literal shape above, must add or correct it before claiming
  § 8.1 conformance under 0.8.0. `versions/0.8/tests/strict-lossy/`
  is the corpus that makes this checkable: each fixture's oracle gives
  both the lax `parse` result (`lax_value`) and the exact strict
  rejection (`body`, `canonical`) to match against.
>>>>> lang=ru

Это не-событие для поведения документов: ни один валидный документ не
меняет своё Value или принятие через нестрогую точку входа
(`parse`/`loads`) между 0.7.x и 0.8.0. Меняется только то, что
parser-конформная реализация обязана дополнительно предоставлять и
проверять.

§ 8.1 теперь требует строгую точку входа для парсинга (`parse_strict`
/ `loads_strict`), отвергающую lossy-скаляр — такой, чья лексическая
форма отличается от канонической формы числа, выводимой правилами
13–14 § 5, например ведущий ноль (`01234`), явный знак `+`
(`+79991234567`), литерал с префиксом основания (`0x1A2B`, `0o755`,
`0b1010`), подчёркивания групп разрядов (`1_000_000`) или
неканоническое написание float (`1.10`, `5e3`) — с `LossyScalar`,
называющим точную лексическую форму и каноническую форму, в которую
она иначе молча превратилась бы. Нестрогая точка входа не затронута:
она продолжает принимать тот же скаляр и канонизировать его точно так
же, как раньше.

Два пути миграции в зависимости от того, что у реализации уже есть:

- Реализация, чья строгая/canonical-валидирующая точка входа
  делегирует классификацию скаляров тому же пути кода, что и её
  нестрогий парсер (верно для эталонной Rust-реализации и каждого
  биндинга, построенного непосредственно на ней), уже удовлетворяет
  этому требованию. Изменение кода не нужно; меняется только
  объявление версии на 0.8.0.
- Реализация без строгой точки входа вообще, или с такой, которая не
  выводит независимо каноническую форму для каждой из перечисленных
  выше форм числового литерала, должна добавить или исправить её
  прежде, чем заявлять § 8.1-конформанс под 0.8.0.
  `versions/0.8/tests/strict-lossy/` — это корпус, который делает это
  проверяемым: оракул каждой фикстуры даёт и результат нестрогого
  `parse` (`lax_value`), и точный строгий отказ (`body`, `canonical`)
  для сверки.
>>>>> lang=zh

这对文档行为而言是一次「无事件」变更:在 0.7.x 与 0.8.0 之间,没有
任何合法文档在宽松入口(`parse`/`loads`)下改变其 Value 或被接受的
结果。唯一的变化是 parser 一致性实现现在还必须额外提供并验证什么。

§ 8.1 现在要求严格解析入口(`parse_strict` / `loads_strict`),用于
拒绝 lossy 标量——即其词法形式不同于 § 5 规则 13–14 从中推断出的
数字规范形式的标量,例如前导零(`01234`)、显式 `+` 号
(`+79991234567`)、带进制前缀的字面量(`0x1A2B`、`0o755`、
`0b1010`)、数字分组下划线(`1_000_000`),或非规范的 float 拼写
(`1.10`、`5e3`)——并以 `LossyScalar` 指明其精确词法形式以及它
本会被悄悄变成的规范形式。宽松入口不受影响:它继续接受同一标量并
将其规范化,与之前完全相同。

根据实现现有情况,有两条迁移路径:

- 若某实现的严格/规范校验入口与其宽松 parser 共用同一套标量分类
  代码路径(Rust 参考实现及直接构建于其上的每个绑定均是如此),则
  已经满足该要求。无需修改代码;只需将版本声明移至 0.8.0。
- 若某实现完全没有严格入口,或其严格入口未针对上述每一种数字字面量
  形式独立重新推导规范形式,则必须在声明 0.8.0 下的 § 8.1 一致性
  之前添加或修正它。`versions/0.8/tests/strict-lossy/` 就是使之可
  检验的语料:每个 fixture 的 oracle 同时给出宽松 `parse` 的结果
  (`lax_value`)与精确的严格拒绝(`body`、`canonical`)以供核对。
