export default {
  en: `  Choose a qualifying candidate with the fewest digits in \`D\`. For
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

`,
  ru: `  Для каждого ненулевого конечного Float V **нормализованный десятичный
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

`,
  zh: `  零独立于候选规则处理:正零输出为 \`0.0\`,负零输出为 \`-0.0\`。与
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

`,
};
