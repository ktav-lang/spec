export default {
  en: `
Integer literals that exceed the implementation's supported integer
range (which MUST be at least i64; see § 5.2 rule 13) MUST fall
back to String per § 5.2 rule 13 — they MUST NOT silently wrap or
raise an exception at parse time. The consumer of the Value is
responsible for choosing how to handle the textual form.

`,
  ru: `
Integer-литералы, превышающие поддерживаемый реализацией диапазон
(MUST быть не меньше i64; см. § 5.2 правило 13), MUST проваливаться
в String по § 5.2 правило 13 — они MUST NOT молча переполняться
(wrap) или вызывать исключение во время разбора. Ответственность за
выбор способа обработки текстовой формы лежит на потребителе Value.

`,
  zh: `
超过实现所支持整数范围(MUST 至少为 i64;见 § 5.2 规则 13)的
整数 MUST 按 § 5.2 规则 13 回退为 String —— MUST NOT 在解析时
静默环绕(wrap)或抛出异常。如何处理该文本形式由该 Value 的
消费者自行决定。

`,
};
