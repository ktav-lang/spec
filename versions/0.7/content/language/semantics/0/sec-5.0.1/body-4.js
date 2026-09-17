export default {
  en: `The root kind is **fixed** by the first content line. Subsequent
lines are dispatched per § 5.1 according to the chosen kind:

- Inside a top-level **Array**, every non-blank, non-comment line is
  an array-item line (§ 5.4). A line that looks like a pair (e.g.
  \`host: localhost\`) is just a bare scalar String per § 5.4 rule 9;
  there is no implicit re-classification back to a pair. Use the raw
  marker form to make a colon-bearing scalar unambiguous.
- Inside a top-level **Object**, every line is a pair line (§ 5.3).
  A bare scalar without \`:\` is a \`MissingSeparator\` error.

Note (vs. 0.1.1): rules 4 and 5 differ from earlier versions. In
0.1.1, a lone \`{\` or \`[\` as the first content line opened a single
Object / Array item inside a root-level Array. In 0.5.0+, the lone
opener is the root itself: a single multi-line Object / Array
spanning the document, with no enclosing Array. The JSONL-style
form (multiple top-level inline objects \`{a:1}\` followed by \`{b:2}\`
producing a root Array) is no longer accepted.

`,
  ru: `Тип корня **фиксирован** первой содержательной строкой. Последующие
строки диспетчеризуются по § 5.1 согласно выбранному типу:

- Внутри top-level **Array** каждая непустая строка, не являющаяся
  комментарием, является array-item line (§ 5.4). Строка, выглядящая
  как pair (например \`host: localhost\`), — просто голый скаляр String
  по § 5.4 правило 9; неявной переклассификации обратно в pair не
  происходит. Используйте raw-маркерную форму, чтобы сделать скаляр
  с двоеточием однозначным.
- Внутри top-level **Object** каждая строка — pair-строка (§ 5.3).
  Голый скаляр без \`:\` — ошибка \`MissingSeparator\`.

Замечание (vs. 0.1.1): правила 4 и 5 отличаются от предыдущих
версий. В 0.1.1 одиночный \`{\` или \`[\` на первой содержательной
строке открывал одиночный Object / Array элемент внутри
корневого Array. В 0.5.0 одиночный опенер — сам корень: один
многострочный Object / Array на весь документ, без обёртки Array.
JSONL-стиль (несколько top-level inline-объектов \`{a:1}\` и
\`{b:2}\`, дающие корневой Array) больше не принимается.

`,
  zh: `说明(vs. 0.1.1):规则 4 与 5 与早期版本不同。0.1.1 中,首条内容
行的单独 \`{\` 或 \`[\` 在根级 Array 内打开一个 Object / Array 项;
0.5.0 中单独开启符即为根本身:整篇文档是一个多行 Object / Array,
无外包 Array。JSONL 式形式(多个 top-level inline 对象 \`{a:1}\`
后跟 \`{b:2}\` 产生根 Array)不再被接受。

`,
};
