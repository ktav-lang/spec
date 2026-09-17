export default {
  en: `  In scientific form, the adjusted exponent is \`E = k + n - 1\`.
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

  Two writer-conforming implementations declaring the same Value domain,
  the same Float representation, and the same decimal-conversion and
  rounding semantics MUST produce identical output for the same Value.
  The test fixtures \`*.canonical.ktav\` assume binary64 semantics;
  implementations declaring a different domain or conversion semantics
  MAY produce different output only where those declarations yield a
  different Value or candidate.

`,
  ru: `  В научной форме скорректированная экспонента \`E = k + n - 1\`.
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

  Две writer-conforming реализации, заявляющие одинаковый домен Value,
  одинаковое представление Float и одинаковую семантику decimal-преобразования
  и округления, MUST производить идентичный вывод. Фикстуры
  \`*.canonical.ktav\` предполагают семантику binary64. Реализации,
  использующие иной домен или иную семантику, MAY давать иной вывод только
  там, где их заявленные домен или семантика дают иной Value или кандидат.

`,
  zh: `  声明相同 Value 域、相同 Float 表示以及相同十进制转换和舍入语义的
  两个 writer-conforming 实现 MUST 产生相同输出。fixture
  \`*.canonical.ktav\` 假定 binary64 语义。声明不同域或不同转换语义的
  实现 MAY 产生不同输出,但仅限于这些声明导致不同 Value 或候选的地方。

`,
};
