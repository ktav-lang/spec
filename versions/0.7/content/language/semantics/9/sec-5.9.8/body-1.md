>>>>> lang=en

- **Integer:** base-10 decimal. Leading `+` is dropped. `-0` and
  `+0` emit as `0`. No underscores. No leading zeros (other than
  the literal `0`). The minus sign is preserved for negative
  values.
- **Float:** the declared Float domain includes the decimal-conversion
  and rounding semantics used by parsing and writing, and its conversion
  policy MUST be deterministic. Every non-zero finite Float admitted to
  the Ktav Value model MUST have at least one finite decimal candidate
  `(s, D, k)` that round-trips exactly under those semantics. Positive
  and negative zero are admitted separately by the zero rule below. A
  host representation's non-zero finite value without such a candidate
  (for example exact-rational `1/3`) is outside the declared Ktav Float domain,
  rather than an additional writer error case. For the minimum binary64 domain, the
  declared rounding semantics MUST be IEEE 754 `roundTiesToEven`. The chosen textual form matches one of the two
  alternatives of § 3.6:
  - `sign? digits "." digits ("e" sign? digits)?`
  - `sign? digits "e" sign? digits`

  For each non-zero finite Float V, define a **normalised decimal
  candidate** as a tuple `(s, D, k)`: `s` is `+1` or `-1` and
  matches V's sign; `D` is a non-empty sequence of ASCII decimal
  digits whose first and last digits are non-zero; and `k` is an
  integer decimal exponent. Its exact decimal value is
  `s × integer(D) × 10^k`. A candidate qualifies when parsing that
  exact value with the implementation's declared Float domain and its
  required rounding rule produces exactly V.

>>>>> lang=ru

- **Integer:** десятичная по основанию 10. Ведущий `+`
  отбрасывается. `-0` и `+0` выводятся как `0`. Никаких
  подчёркиваний. Никаких ведущих нулей (кроме литерала `0`).
  Знак минус сохраняется для отрицательных значений.
- **Float:** заявленный домен Float включает семантику decimal-преобразования и
  округления, используемую при разборе и выводе, а политика преобразования
  MUST быть детерминированной. Каждый ненулевой конечный Float, допускаемый
  в модель Ktav Value, MUST иметь хотя бы один конечный десятичный кандидат
  `(s, D, k)`, точно проходящий round-trip с этой семантикой. Положительный
  и отрицательный ноль допускаются отдельно по правилу нуля ниже. Ненулевое
  конечное значение хост-представления без такого кандидата (например, точная
  рациональ `1/3`) находится вне заявленного домена Ktav Float, а не
  образует дополнительного случая ошибки writer. Для минимального домена
  binary64 заявленная семантика округления MUST быть IEEE 754
  `roundTiesToEven`. Выбранная текстовая форма соответствует одной из
  двух альтернатив § 3.6:
  - `sign? digits "." digits ("e" sign? digits)?`
  - `sign? digits "e" sign? digits`

  Для каждого ненулевого конечного Float V **нормализованный десятичный
  кандидат** — это кортеж `(s, D, k)`: `s` равно `+1` или `-1` и
  совпадает со знаком V; `D` — непустая последовательность десятичных
  ASCII-цифр, первая и последняя цифры которой ненулевые; `k` — целая
  десятичная экспонента. Его точное десятичное значение равно
  `s × integer(D) × 10^k`. Кандидат подходит, если разбор этого точного
  значения в заявленном домене Float реализации с обязательным для него
  правилом округления даёт ровно V.

>>>>> lang=zh

- **Integer**:基 10 十进制。前导 `+` 舍弃。`-0` 与 `+0` 输出
  为 `0`。无下划线。无前导零(`0` 字面除外)。负值保留减号。
- **Float**:声明的 Float 域包括解析和写入所用的十进制转换与舍入
  语义,其转换策略 MUST 是确定性的。每个被接纳进 Ktav Value 模型的
  非零有限 Float MUST 至少有一个按该语义精确 round-trip 的有限十进制
  候选 `(s, D, k)`。正零与负零按下面的零规则单独接纳。主机表示中
  没有这种候选的非零有限值(例如精确有理数 `1/3`)属于声明的 Ktav
  Float 域之外,而不是额外的 writer 错误情形。对最小 binary64 域,
  声明的舍入语义 MUST 是 IEEE 754 `roundTiesToEven`。选取的文本
  形式匹配 § 3.6 的两个候选之一:
  - `sign? digits "." digits ("e" sign? digits)?`
  - `sign? digits "e" sign? digits`

  对每个非零有限 Float V,定义**规范化十进制候选**为元组
  `(s, D, k)`: `s` 为 `+1` 或 `-1` 且与 V 的符号相同; `D` 是
  非空 ASCII 十进制数字序列,首位与末位数字均非零; `k` 是整数十进制
  指数。其精确十进制值为 `s × integer(D) × 10^k`。若用实现声明的
  Float 域及其必需的舍入规则解析此精确值后恰好得到 V,候选即合格。

