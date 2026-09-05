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

  For each non-zero finite Float V, define a **normalised decimal
  candidate** as a tuple \`(s, D, k)\`: \`s\` is \`+1\` or \`-1\` and
  matches V's sign; \`D\` is a non-empty sequence of ASCII decimal
  digits whose first and last digits are non-zero; and \`k\` is an
  integer decimal exponent. Its exact decimal value is
  \`s × integer(D) × 10^k\`. A candidate qualifies when parsing that
  exact value with the implementation's declared Float domain and its
  required rounding rule produces exactly V.

  Choose a qualifying candidate with the fewest digits in \`D\`. For
  IEEE 754 binary64, this is the shortest decimal that round-trips to
  the same binary64 under roundTiesToEven. If several candidates have
  that minimum digit count, choose the one whose exact decimal value is
  nearest to V; if the distance ties, prefer an even final digit of
  \`D\`; if still tied, choose the smaller pair \`(D, k)\`, comparing
  \`D\` bytewise first and then \`k\` as a signed integer. This selection
  is normative and deterministic. A Ryu / Grisu / Steele-White-class
  algorithm MAY be used to find it.

  Zero is handled separately from this candidate rule: positive zero
  emits as \`0.0\` and negative zero as \`-0.0\`. Unlike Integer \`-0\`,
  which normalises to \`0\`, Float preserves the sign of zero.

  For a non-zero V, after choosing \`(s, D, k)\`, let \`n\` be the number
  of digits in \`D\` and \`abs\` the absolute numeric value of V. If
  \`0 < abs < 1e-2\` or \`abs >= 1e7\`, use scientific form; otherwise
  use decimal form.

  In scientific form, the adjusted exponent is \`E = k + n - 1\`.
  Emit the first digit of \`D\`, followed by \`.\` and the remaining
  digits only when \`n > 1\`, then lowercase \`e\` and E in base 10.
  E has a minus sign only when negative, no plus sign, and no leading
  zeroes. Prefix \`-\` when \`s = -1\`. This gives exactly one digit
  before any decimal point and no redundant mantissa or exponent zeroes.

  In decimal form, let \`p = n + k\` and place the point as follows:
  if \`p <= 0\`, emit \`0.\`, then \`-p\` zeroes, then D; if
  \`0 < p < n\`, insert \`.\` after the first p digits of D; if
  \`p >= n\`, emit D, then \`p - n\` zeroes, then \`.0\`. Prefix \`-\`
  when \`s = -1\`. Thus every decimal-form Float contains a point,
  including a whole-valued Float.

  The thresholds are exact. The corresponding canonical examples are
  \`0.01\`, \`1e-3\`, \`1.5e-3\`, \`-1e-3\`, \`9999999.0\`, \`1e7\`, and
  \`120000000.0\` → \`1.2e8\`.

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

  Для каждого ненулевого конечного Float V **нормализованный десятичный
  кандидат** — это кортеж \`(s, D, k)\`: \`s\` равно \`+1\` или \`-1\` и
  совпадает со знаком V; \`D\` — непустая последовательность десятичных
  ASCII-цифр, первая и последняя цифры которой ненулевые; \`k\` — целая
  десятичная экспонента. Его точное десятичное значение равно
  \`s × integer(D) × 10^k\`. Кандидат подходит, если разбор этого точного
  значения в заявленном домене Float реализации с обязательным для него
  правилом округления даёт ровно V.

  Выбирается подходящий кандидат с наименьшим числом цифр в \`D\`. Для
  IEEE 754 binary64 это кратчайшая десятичная запись, дающая round-trip
  в тот же binary64 при roundTiesToEven. Если минимальное число цифр
  имеют несколько кандидатов, выбирается кандидат, чьё точное десятичное
  значение ближе к V; при равенстве расстояний предпочтительна чётная
  последняя цифра \`D\`; если равенство сохраняется, выбирается меньшая
  пара \`(D, k)\` — сначала D сравнивается побайтно, затем k как знаковое
  целое. Этот выбор нормативен и детерминирован. Для поиска MAY
  использоваться алгоритм класса Ryu / Grisu / Steele-White.

  Ноль обрабатывается отдельно от правила кандидата: положительный ноль
  выводится как \`0.0\`, отрицательный — как \`-0.0\`. В отличие от
  Integer \`-0\`, нормализуемого к \`0\`, Float сохраняет знак нуля.

  Для ненулевого V после выбора \`(s, D, k)\` пусть \`n\` — число цифр
  в D, а \`abs\` — абсолютное числовое значение V. Если
  \`0 < abs < 1e-2\` или \`abs >= 1e7\`, используется научная форма;
  иначе используется десятичная форма.

  В научной форме скорректированная экспонента \`E = k + n - 1\`.
  Выводится первая цифра D, затем только при \`n > 1\` — \`.\` и остальные
  цифры, затем строчная \`e\` и E по основанию 10. У E знак минус есть
  только при отрицательном значении; знак плюс и ведущие нули отсутствуют.
  При \`s = -1\` добавляется префикс \`-\`. Поэтому перед десятичной точкой
  ровно одна цифра, а лишних нулей мантиссы или экспоненты нет.

  В десятичной форме пусть \`p = n + k\`; точка ставится так: при
  \`p <= 0\` выводится \`0.\`, затем \`-p\` нулей и D; при
  \`0 < p < n\` точка вставляется после первых p цифр D; при \`p >= n\`
  выводится D, затем \`p - n\` нулей и \`.0\`. При \`s = -1\` добавляется
  префикс \`-\`. Поэтому каждое Float в десятичной форме содержит точку,
  включая Float с целым значением.

  Границы точные. Соответствующие канонические примеры: \`0.01\`, \`1e-3\`,
  \`1.5e-3\`, \`-1e-3\`, \`9999999.0\`, \`1e7\` и
  \`120000000.0\` → \`1.2e8\`.

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

  对每个非零有限 Float V,一个**规范化十进制候选**是元组
  \`(s, D, k)\`:\`s\` 为 \`+1\` 或 \`-1\` 且与 V 的符号相同;\`D\` 是
  非空 ASCII 十进制数字序列,首位与末位数字均非零;\`k\` 是整数十进制
  指数。其精确十进制值为 \`s × integer(D) × 10^k\`。若用实现声明的
  Float 域及该域必需的舍入规则解析此精确值后恰好得到 V,候选即合格。

  选择 D 中数字数目最少的合格候选。对于 IEEE 754 binary64,这是在
  roundTiesToEven 下能 round-trip 到同一 binary64 的最短十进制。若有
  多个候选拥有该最小数字数,选择精确十进制值最接近 V 的候选;若距离
  相同,优先选择 D 末位为偶数的候选;若仍相同,选择较小的 \`(D, k)\`
  对,先按字节比较 D,再把 k 作为有符号整数比较。该选择是规范且确定的。
  MAY 使用 Ryu / Grisu / Steele-White 类算法寻找候选。

  零独立于候选规则处理:正零输出为 \`0.0\`,负零输出为 \`-0.0\`。与
  归一化为 \`0\` 的 Integer \`-0\` 不同,Float 保留零的符号。

  对非零 V,选定 \`(s, D, k)\` 后,令 \`n\` 为 D 的数字数,\`abs\` 为 V
  的绝对数值。若 \`0 < abs < 1e-2\` 或 \`abs >= 1e7\`,使用科学形式;
  否则使用十进制形式。

  科学形式的调整后指数为 \`E = k + n - 1\`。先输出 D 的首位;仅当
  \`n > 1\` 时再输出 \`.\` 和其余数字;然后输出小写 \`e\` 与基-10 的 E。
  E 仅在为负时带减号,不带加号且无前导零。若 \`s = -1\`,添加前缀
  \`-\`。因此小数点前恰好一位数字,尾数与指数均无多余零。

  十进制形式令 \`p = n + k\`,并按如下规则放置小数点:若 \`p <= 0\`,
  输出 \`0.\`,再输出 \`-p\` 个零和 D;若 \`0 < p < n\`,在 D 的前 p
  位后插入 \`.\`;若 \`p >= n\`,输出 D、\`p - n\` 个零及 \`.0\`。若
  \`s = -1\`,添加前缀 \`-\`。因此每个十进制形式的 Float 都含小数点,
  包括值为整数的 Float。

  阈值是精确的。对应规范示例为 \`0.01\`、\`1e-3\`、\`1.5e-3\`、
  \`-1e-3\`、\`9999999.0\`、\`1e7\`,以及
  \`120000000.0\` → \`1.2e8\`。

  使用相同 Float 表示(binary64)的两个 writer-conforming 实现
  对同一 Value MUST 产生相同输出。fixture \`*.canonical.ktav\`
  假定 binary64 语义。使用任意精度 decimal 的实现 MAY 产生
  不同输出,但仅限于其 Value 域有所不同之处。

`,
};
