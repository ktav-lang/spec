export default {
  en: `A canonical writer emits ordinary Unicode content as UTF-8 directly;
it is under no obligation to represent any code point as \`\\uXXXX\`
instead. In canonical output this discretion is exercised nowhere
except within a key segment (§ 5.9.10): a non-empty scalar's body is
never escaped in canonical form at all (§ 5.9.4, § 5.9.7), and
§ 5.9.10's own key-escaping algorithm has no discretion of its
own — every code point it requires escaped uses the named form when
one exists and \`\\uXXXX\` otherwise, never a writer's choice between
the two. The SHOULD/MAY language below therefore describes a writer
producing hand-authored, non-canonical Ktav text, not the canonical
algorithm. Where such a writer chooses to escape a byte that also
has a named escape in the table above, it SHOULD prefer the named
form (\`\\.\` over the \`\\uXXXX\` form of the same code point, for
consistency with the other twelve named forms) and use \`\\uXXXX\` only
for code points with no named escape. When \`\\uXXXX\` is emitted, the four hex
digits MUST be uppercase (\`0-9A-F\`) — parsing is case-insensitive
(§ 3.7.1 above), but two writer-conforming implementations emitting
the same code point MUST produce byte-identical output (§ 5.9's
determinism requirement).

`,
  ru: `\`\\uXXXX\` распознаётся только там, где вообще распознаются
escape-последовательности: в inline-скалярных значениях и ключах.
Он **не** обрабатывается внутри многострочных скалярных значений,
содержимого многострочных строк (\`(…)\` / \`((…))\`, § 5.6) или
комментариев — в этих контекстах шесть байтов \`\\\`, \`u\` и четыре
следующих символа являются буквальным содержимым, точно так же, как
и любая другая нераспознанная в этих контекстах escape-форма
(см. выше «Escape-последовательности НЕ обрабатываются в»).

Канонический writer выводит обычное Unicode-содержимое напрямую как
UTF-8; он не обязан представлять какую-либо кодовую точку как
\`\\uXXXX\`. В каноническом выводе эта свобода выбора используется
нигде, кроме как внутри сегмента ключа (§ 5.9.10): тело непустого
скаляра в канонической форме вообще никогда не экранируется
(§ 5.9.4, § 5.9.7), а собственный алгоритм экранирования ключа из
§ 5.9.10 не имеет никакой свободы выбора — каждая кодовая точка,
которую он требует экранировать, использует именованную форму, если
она существует, и \`\\uXXXX\` в противном случае, но никогда не выбор
writer'а между ними. Поэтому формулировки SHOULD/MAY ниже описывают
writer, производящий написанный вручную, неканонический текст Ktav,
а не канонический алгоритм. Там, где writer решает экранировать
байт, у которого также есть именованный escape из таблицы выше, он
SHOULD предпочесть
именованную форму (\`\\.\` вместо формы \`\\uXXXX\` той же кодовой
точки, для согласованности с остальными двенадцатью именованными
формами) и
использовать \`\\uXXXX\` только для кодовых точек без именованного
escape. Когда writer всё же выводит \`\\uXXXX\`, четыре hex-цифры
MUST быть в верхнем регистре (\`0-9A-F\`) — парсинг регистронезависим
(§ 3.7.1 выше), но два writer-conforming реализации, выводящие
одну и ту же кодовую точку, MUST давать побайтово идентичный
результат (требование детерминизма § 5.9).

`,
  zh: `规范 writer 直接以 UTF-8 输出普通 Unicode 内容;它没有义务将任何
码点表示为 \`\\uXXXX\`。在规范输出中,这种自由裁量权仅在键段
(§ 5.9.10)内被行使:非空标量的体在规范形式下从不被转义
(§ 5.9.4、§ 5.9.7),而 § 5.9.10 自身的键转义算法没有任何自由
裁量权 —— 它要求转义的每个码点,若存在命名形式则使用命名形式,
否则使用 \`\\uXXXX\`,从不由 writer 在二者之间选择。因此下文的
SHOULD/MAY 措辞描述的是产生手写、非规范 Ktav 文本的 writer,而非
规范算法。当 writer 选择转义一个在上表中也有命名形式的
字节时,SHOULD 优先使用命名形式(\`\\.\` 优于点的 \`\\uXXXX\` 形式,与
其余十二个命名形式保持一致),仅对没有命名形式的码点使用 \`\\uXXXX\`。当
writer 确实输出 \`\\uXXXX\` 时,四位十六进制数字 MUST 为大写
(\`0-9A-F\`)—— 解析不区分大小写(见上文 § 3.7.1),但两个
writer-conforming 实现输出同一码点时 MUST 产生字节相同的结果
(§ 5.9 的确定性要求)。

`,
};
