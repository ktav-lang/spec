export default {
  en: `The choice between an Object root and an Array root is determined
by the Value's kind, and parses back per § 5.0.1.

Note: an Object pair line cannot be mistaken for a closed-inline or
lone-opener root line (it always has a \`:\` separator); only Array
roots whose first item is itself a compound (empty or not) require
the wrap. A separate hazard — an Array root's first item whose bare
rendering would itself be recognised as a pair line (§ 5.0.1 rule 6)
— is resolved not by this wrap but by forcing the raw-marker form
for that one item instead (§ 5.9.6).

`,
  ru: `Выбор между Object-корнем и Array-корнем определяется видом Value и
парсится обратно по § 5.0.1.

Замечание: pair-строка Object не может быть спутана с
одиночным открывающим брейсом (у неё всегда есть \`:\`
разделитель); только Array-корни, чей первый элемент — составное
значение (Object или Array, пустое или нет), требуют обёртки.
Отдельная угроза — первый элемент
Array-корня, чья голая форма сама была бы распознана как
pair-строка (§ 5.0.1 правило 6) — решается не этой обёрткой, а
принудительной raw-маркерной формой именно для этого элемента
(§ 5.9.6).

`,
  zh: `说明:Object 对行不会被误识为单独的开启符(总有 \`:\` 分隔符);
仅当首项本身是复合值(Object 或 Array,空或非空)时,Array 根才
需要包裹。另一种风险 ——
Array 根的第一项,若其裸形式本身会被识别为 pair line(§ 5.0.1
规则 6)—— 并非通过此包裹解决,而是对该项强制使用原始标记形式
(§ 5.9.6)。

`,
};
