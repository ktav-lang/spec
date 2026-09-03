export default {
  en: `
Inside a stripped block, a content line whose trimmed text is
exactly \`)\` would be indistinguishable from the closer; the writer
MUST switch to verbatim form when such a line is required. The
analogous rule applies to \`))\` inside a verbatim block.

Parser behaviour is symmetric: if a content line inside a stripped
block trims to exactly \`)\`, the parser MUST close the block at
that line. The same applies to a line that trims to exactly \`))\`
inside a verbatim block. The writer-side rule above MUST therefore
be observed by any emitter: producing such content requires
switching the multi-line string to the other form, since the
parser has no way to distinguish a lone-\`)\` content line from the
stripped-form closer.

`,
  ru: `
Внутри stripped-блока строка, обрезанное содержимое которой в точности
\`)\`, неотличима от закрытия; писатель MUST переключиться на verbatim,
когда такая строка нужна. Аналогично для \`))\` внутри verbatim.

Поведение парсера симметрично: если содержательная строка внутри
stripped-блока обрезается ровно до \`)\`, парсер MUST закрыть блок на
этой строке. То же действует для строки, обрезающейся ровно до \`))\`
внутри verbatim. Поэтому правило для писателя выше MUST соблюдаться
любым эмиттером: чтобы воспроизвести такое содержимое, многострочную
строку необходимо переключить на противоположную форму.

`,
  zh: `
stripped 块内,若某内容行 trim 后恰为 \`)\`,该行将与关闭符无法区分;
写入端 MUST 在需要写出这样的内容行时切换到 verbatim 形式。类似的
规则适用于 verbatim 块内 trim 后恰为 \`))\` 的内容行 —— 此时写入端
切换到 stripped 形式。

解析器行为对称:若 stripped 块内某内容行 trim 后恰为 \`)\`,解析器
MUST 在该行关闭块;若 verbatim 块内某内容行 trim 后恰为 \`))\`,
亦同。写入端因此 MUST 遵守上述规则 —— 若要表达此类内容,
多行字符串必须切换为另一种形式。

`,
};
