>>>>> lang=en
  Choose a qualifying candidate with the fewest digits in `D`. For
  IEEE 754 binary64, this is the shortest decimal that round-trips to
  the same binary64 under roundTiesToEven. If several candidates have
  that minimum digit count, choose the one whose exact decimal value is
  nearest to V; if the distance ties, prefer an even final digit of
  `D`; if still tied, choose the smaller pair `(D, k)`, comparing
  `D` bytewise first and then `k` as a signed integer. This selection
  is normative and deterministic. A Ryu / Grisu / Steele-White-class
  algorithm MAY be used to find it.

  Zero is handled separately from this candidate rule: positive zero
  emits as `0.0` and negative zero as `-0.0`. Unlike Integer `-0`,
  which normalises to `0`, Float preserves the sign of zero.

  For a non-zero V, after choosing `(s, D, k)`, let `n` be the number
  of digits in `D` and `abs` the absolute numeric value of V. If
  `0 < abs < 1e-2` or `abs >= 1e7`, use scientific form; otherwise
  use decimal form.

>>>>> lang=ru
  Выбирается подходящий кандидат с наименьшим числом цифр в `D`. Для
  IEEE 754 binary64 это кратчайшая десятичная запись, дающая round-trip
  в тот же binary64 при roundTiesToEven. Если минимальное число цифр
  имеют несколько кандидатов, выбирается кандидат, чьё точное десятичное
  значение ближе к V; при равенстве расстояний предпочтительна чётная
  последняя цифра `D`; если равенство сохраняется, выбирается меньшая
  пара `(D, k)` — сначала D сравнивается побайтно, затем k как знаковое
  целое. Этот выбор нормативен и детерминирован. Для поиска MAY
  использоваться алгоритм класса Ryu / Grisu / Steele-White.

  Ноль обрабатывается отдельно от правила кандидата: положительный ноль
  выводится как `0.0`, отрицательный — как `-0.0`. В отличие от
  Integer `-0`, нормализуемого к `0`, Float сохраняет знак нуля.

  Для ненулевого V после выбора `(s, D, k)` пусть `n` — число цифр
  в D, а `abs` — абсолютное числовое значение V. Если
  `0 < abs < 1e-2` или `abs >= 1e7`, используется научная форма;
  иначе используется десятичная форма.

>>>>> lang=zh
  选择 D 中数字数目最少的合格候选。对于 IEEE 754 binary64,这是在
  roundTiesToEven 下能 round-trip 到同一 binary64 的最短十进制。若有
  多个候选拥有该最小数字数,选择精确十进制值最接近 V 的候选;若距离
  相同,优先选择 D 末位为偶数的候选;若仍相同,选择较小的 `(D, k)`
  对,先按字节比较 D,再把 k 作为有符号整数比较。该选择是规范且确定的。
  MAY 使用 Ryu / Grisu / Steele-White 类算法寻找候选。

  零独立于候选规则处理:正零输出为 `0.0`,负零输出为 `-0.0`。与
  归一化为 `0` 的 Integer `-0` 不同,Float 保留零的符号。

  对非零 V,选定 `(s, D, k)` 后,令 `n` 为 D 的数字数,`abs` 为 V
  的绝对数值。若 `0 < abs < 1e-2` 或 `abs >= 1e7`,使用科学形式;
  否则使用十进制形式。

