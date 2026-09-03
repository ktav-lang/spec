export default {
  en: `
- **Integer:** base-10 decimal. Leading \`+\` is dropped. \`-0\` and
  \`+0\` emit as \`0\`. No underscores. No leading zeros (other than
  the literal \`0\`). The minus sign is preserved for negative
  values.
- **Float:** the chosen textual form matches one of the two
  alternatives of § 3.6:
  - \`sign? digits "." digits ("e" sign? digits)?\`
  - \`sign? digits "e" sign? digits\`

  Lowercase \`e\` only. Underscores stripped. The leading \`+\` on the
  mantissa is dropped. The leading \`+\` on the exponent is dropped
  (a positive exponent carries no sign).

  First compute the shortest decimal expansion that uniquely identifies
  the Value, using a Ryu / Grisu / Steele-White-class algorithm. For an
  IEEE 754 binary64 implementation, this is the shortest decimal that
  round-trips to the same binary64. Then choose its notation using this
  deterministic policy, where \`abs\` is the absolute numeric value:

  - if \`0 < abs < 1e-2\` or \`abs >= 1e7\`, use the exponent
    alternative;
  - otherwise, use the \`digits "." digits\` alternative.

  The threshold condition is never satisfied by \`abs == 0\`, which
  therefore always uses the decimal alternative: the canonical form
  of positive zero is \`0.0\` and of negative zero is \`-0.0\` —
  decimal, never scientific, with the sign preserved. Unlike an
  Integer's \`-0\`, which normalises to \`0\` (see the Integer bullet
  of § 5), a Float keeps the IEEE 754 sign distinction between
  \`0.0\` and \`-0.0\`.

  The thresholds are exact: \`0.01\` and \`9999999.0\` use decimal form,
  while \`0.001\`, \`0.0015\`, \`-0.001\`, and \`10000000.0\` use exponent
  form. Scientific output uses lowercase \`e\`, omits a positive exponent
  sign, and strips a trailing \`.0\` from the mantissa. Thus the examples
  are \`0.01\`, \`1e-3\`, \`1.5e-3\`, \`-1e-3\`, \`9999999.0\`, and \`1e7\`.

  Two writer-conforming implementations using the same Float
  representation (binary64) MUST produce identical output for the
  same Value. The test fixtures \`*.canonical.ktav\` assume binary64
  semantics; implementations using arbitrary-precision decimal MAY
  produce different output only where their Value domain differs.

`,
  ru: `
- **Integer:** десятичная по основанию 10. Ведущий \`+\`
  отбрасывается. \`-0\` и \`+0\` выводятся как \`0\`. Никаких
  подчёркиваний. Никаких ведущих нулей (кроме литерала \`0\`).
  Знак минус сохраняется для отрицательных значений.
- **Float:** выбранная текстовая форма соответствует одной из
  двух альтернатив § 3.6:
  - \`sign? digits "." digits ("e" sign? digits)?\`
  - \`sign? digits "e" sign? digits\`

  Только строчная \`e\`. Подчёркивания удалены. Ведущий \`+\` на
  мантиссе и экспоненте отбрасывается.

  Сначала вычисляется кратчайшее десятичное разложение, однозначно
  идентифицирующее Value, алгоритмом класса Ryu / Grisu / Steele-White.
  Для IEEE 754 binary64 это кратчайшая десятичная запись, дающая
  round-trip в тот же binary64. Затем форма записи выбирается по
  следующей детерминированной политике, где \`abs\` — абсолютное значение:

  - если \`0 < abs < 1e-2\` или \`abs >= 1e7\`, используется форма с экспонентой;
  - иначе используется форма \`digits "." digits\`.

  Условие порога никогда не выполняется при \`abs == 0\`, поэтому
  ноль всегда использует десятичную форму: каноническая форма
  положительного нуля — \`0.0\`, отрицательного — \`-0.0\` — десятичная,
  никогда научная, со сохранением знака. В отличие от \`-0\` у
  Integer, который нормализуется к \`0\` (см. пункт Integer в § 5),
  Float сохраняет различие знаков IEEE 754 между \`0.0\` и \`-0.0\`.

  Границы точные: \`0.01\` и \`9999999.0\` используют десятичную форму,
  а \`0.001\`, \`0.0015\`, \`-0.001\` и \`10000000.0\` — форму с экспонентой.
  Научная форма использует строчную \`e\`, не содержит знак у положительной
  экспоненты и удаляет завершающий \`.0\` у мантиссы. Поэтому результаты:
  \`0.01\`, \`1e-3\`, \`1.5e-3\`, \`-1e-3\`, \`9999999.0\` и \`1e7\`.

  Две writer-conforming реализации, использующие одинаковое
  представление Float (binary64), MUST производить идентичный
  вывод. Фикстуры \`*.canonical.ktav\` предполагают семантику
  binary64. Реализации, использующие decimal произвольной
  точности, MAY давать иной вывод только там, где их домен
  Value отличается.

`,
  zh: `
- **Integer**:基 10 十进制。前导 \`+\` 舍弃。\`-0\` 与 \`+0\` 输出
  为 \`0\`。无下划线。无前导零(\`0\` 字面除外)。负值保留减号。
- **Float**:选取的文本形式匹配 § 3.6 的两个候选之一:
  - \`sign? digits "." digits ("e" sign? digits)?\`
  - \`sign? digits "e" sign? digits\`

  仅小写 \`e\`。下划线去除。尾数前导 \`+\` 舍弃。指数前导 \`+\` 舍弃
  (正指数无符号)。

  首先使用 Ryu / Grisu / Steele-White 类算法计算能唯一确定 Value
  的最短十进制展开。对于 IEEE 754 binary64,这是能 round-trip 到同一
  binary64 的最短十进制。然后按以下确定性策略选择表示形式,其中
  \`abs\` 是数值的绝对值:

  - 若 \`0 < abs < 1e-2\` 或 \`abs >= 1e7\`,使用指数形式;
  - 否则使用 \`digits "." digits\` 形式。

  阈值条件永不被 \`abs == 0\` 满足,因此零恒用十进制形式:正零的
  规范形式为 \`0.0\`,负零为 \`-0.0\` —— 十进制,绝非科学形式,符号
  保留。与 Integer 的 \`-0\` 归一化为 \`0\` 不同(见 § 5 的 Integer
  条目),Float 保留 IEEE 754 在 \`0.0\` 与 \`-0.0\` 之间的符号区分。

  边界是精确的:\`0.01\` 与 \`9999999.0\` 使用十进制形式,而 \`0.001\`、
  \`0.0015\`、\`-0.001\` 与 \`10000000.0\` 使用指数形式。科学形式使用小写
  \`e\`,省略正指数的加号,并去掉尾数末尾的 \`.0\`;因此输出为 \`0.01\`、
  \`1e-3\`、\`1.5e-3\`、\`-1e-3\`、\`9999999.0\` 与 \`1e7\`。

  使用相同 Float 表示(binary64)的两个 writer-conforming 实现
  对同一 Value MUST 产生相同输出。fixture \`*.canonical.ktav\`
  假定 binary64 语义。使用任意精度 decimal 的实现 MAY 产生
  不同输出,但仅限于其 Value 域有所不同之处。

`,
};
