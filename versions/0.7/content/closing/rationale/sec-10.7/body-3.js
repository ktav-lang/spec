export default {
  en: `The canonical writer (§ 5.9.10) prefers quoted form the moment a
STRUCTURAL escape (or an edge-whitespace hazard) would otherwise be
needed, or the key's first segment begins with \`##\` (a routing rule
with no escape trade-off at all — see § 5.9.10 rule (d)), rather
than leaving bare-with-escape as an equally valid canonical choice
for the escape-driven cases: a determinism requirement (§ 5.9)
means the writer has no discretion either way, so the rule may as
well pick the more readable of the two — which was the entire
motivation for the feature. An escape quoting cannot remove — a
literal backslash, LF, CR, a control byte, or DEL — does not switch
the form, since paying for two delimiter characters would buy
nothing there. The one fixed delimiter (\`"\`) keeps the
rule content-independent: nothing here weighs which of the three
quote characters would need fewer escapes for a given key, since
self-escaping makes that comparison unnecessary for correctness and
the format already favours simple, uniform rules over marginally
shorter output (§ 10.4).

`,
  ru: `Канонический писатель (§ 5.9.10) предпочитает квотированную форму
в тот момент, когда иначе потребовалось бы СТРУКТУРНОЕ экранирование
(или опасность краевого пробела), либо когда первый сегмент ключа
начинается с \`##\` (правило маршрутизации без какого-либо компромисса
по экранированию — см. § 5.9.10, пункт (d)), а не оставляет
голую-форму-с-экранированием равноценным каноническим выбором для
случаев, вызванных экранированием: требование детерминизма (§ 5.9)
означает, что у писателя нет свободы
выбора ни в одну, ни в другую сторону, так что правило вполне может
выбрать более читаемый из двух вариантов — что и было всей мотивацией
этой функции. Экранирование, которое квотирование не может убрать —
литеральный обратный слэш, LF, CR, управляющий байт или DEL — не
переключает форму, поскольку платить за два символа разделителя
здесь ничего бы не дало. Единственный фиксированный разделитель (\`"\`)
сохраняет правило независимым от содержимого: здесь ничто не взвешивает,
какому из трёх символов кавычек потребовалось бы меньше экранирований
для данного ключа, поскольку самоэкранирование делает это сравнение
ненужным для корректности, а формат уже предпочитает простые,
единообразные правила незначительно более короткому выводу (§ 10.4).

`,
  zh: `规范 writer(§ 5.9.10)一旦另需 STRUCTURAL escape(或边缘空白
隐患),或键的首段以 \`##\` 开头(一条路由规则,完全不涉及
escape 上的权衡 —— 见 § 5.9.10 规则 (d)),就会优先选用
quoted 形式,而不是在 escape 驱动的情形下把
bare-with-escape 留作同样有效的规范选择:确定性要求(§ 5.9)
意味着 writer 在两个方向上都没有自由裁量权,所以这条规则不妨
选择两者中更易读的一个 —— 这正是该特性的全部动机所在。加引号
无法去除的 escape —— 字面反斜杠、LF、CR、控制字节或 DEL —— 不会
切换形式,因为为两个分隔符字符付出代价在这里毫无收益。唯一固定
的分隔符(\`"\`)使规则与内容无关:这里不权衡三种引号字符中哪一种
对给定的键需要更少的 escape,因为自我 escape 使这种比较对正确性
而言变得没有必要,而且该格式本就更看重简单、统一的规则,而非
略微更短的输出(§ 10.4)。

`,
};
