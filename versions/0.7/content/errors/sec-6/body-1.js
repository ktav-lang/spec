export default {
  en: `
A conforming parser MUST detect and report each of the error
categories below for inputs that exhibit the relevant defect. Source-
content parse errors MUST carry, at minimum, a 1-based source line
number and a half-open byte-offset Span \`[start, end)\` covering the
offending region. This location requirement does not apply to \`Io\`
errors (§ 6.8); their location MAY be absent or implementation-defined.

`,
  ru: `
Соответствующий парсер MUST обнаруживать и сообщать каждую категорию
ошибок ниже для входных данных, проявляющих соответствующий дефект.
Ошибки разбора исходного текста MUST нести как минимум 1-based номер
строки и полуинтервальный байтовый Span \`[start, end)\`, покрывающий
ошибочный фрагмент. Это требование к позиции НЕ применяется к ошибкам
\`Io\` (§ 6.8): их позиция MAY отсутствовать или определяться реализацией.

`,
  zh: `
合规解析器 MUST 检测并报告以下每个错误类别。由源文本解析引起的错误 MUST 至少
携带 1-based 源行号与覆盖错误片段的半开字节偏移 Span \`[start, end)\`。
该位置要求不适用于 \`Io\` 错误(§ 6.8);其位置 MAY 缺失或由实现定义。

`,
};
