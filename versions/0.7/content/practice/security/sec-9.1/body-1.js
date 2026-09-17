export default {
  en: `
A maliciously crafted document can request unbounded resources:

- Deeply nested compounds (\`{a: {a: {a: …}}}\`) can cause
  stack overflow in recursive parsers.
- Extremely long scalar bodies can cause unbounded memory growth.
- Pathological multi-line strings or inline compounds can cause
  quadratic-time parsing in naive implementations.

Implementations SHOULD impose configurable limits on:

- Maximum nesting depth (both multi-line and inline compounds).
- Maximum input length and maximum scalar length.
- Maximum total Value count.

No specific limits are mandated; implementations choose values
appropriate to their target environment.

`,
  ru: `
Вредоносно сконструированный документ может запросить неограниченные
ресурсы:

- Глубоко вложенные составные значения (\`{a: {a: {a: …}}}\`) могут
  вызвать переполнение стека в рекурсивных парсерах.
- Чрезмерно длинные тела скаляров могут вызвать неограниченный рост
  памяти.
- Патологические многострочные строки или inline-составные значения
  могут вызвать парсинг за квадратичное время в наивных реализациях.

Реализации SHOULD навязывать конфигурируемые лимиты на:

- Максимальную глубину вложенности (как многострочных, так и
  inline-составных).
- Максимальную длину ввода и максимальную длину скаляра.
- Максимальное общее число Value.

Конкретные лимиты не предписаны; реализации выбирают значения,
подходящие для их целевой среды.

`,
  zh: `
恶意构造的文档可能请求不受限的资源:

- 深度嵌套的复合值(\`{a: {a: {a: …}}}\`)可能导致递归解析器栈溢出。
- 极长的标量体可能导致无上限的内存增长。
- 病态的多行字符串或 inline 复合值在朴素实现中可能导致二次方时间
  的解析。

实现 SHOULD 设可配置上限:

- 最大嵌套深度(多行与 inline 复合值均适用)。
- 最大输入长度与最大标量长度。
- 最大 Value 总数。

具体上限未指定;实现根据其目标环境自行选择合适的值。

`,
};
