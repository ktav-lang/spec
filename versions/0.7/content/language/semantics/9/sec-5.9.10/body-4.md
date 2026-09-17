>>>>> lang=en
A canonical writer never actually reaches this recipe for a
`##`-prefixed key's first segment: form-selection rule (d) above
already routes it to quoted form before bare form is even
considered, because no escape within bullets 1-3 changes the raw
first two bytes of the emitted line. `\u0023#a\:b` (escaping
only the leading `#`, per the original bare-form recipe this
replaces) remains a valid, decodable, non-canonical INPUT spelling
for the key `##a:b` — a parser MUST still accept it — but it is
never the canonical OUTPUT: the canonical form of any key whose
content begins with `##` is always quoted, `"##a:b"`, per (d), not
`\u0023#a\:b`.

When quoted form is selected, the writer emits the segment's decoded
content between two `"` characters, escaping only:

>>>>> lang=ru
Канонический writer никогда фактически не доходит до этого
рецепта для первого сегмента ключа с префиксом `##`: правило (d)
выбора формы выше уже направляет его в квотированную форму до
того, как голая форма вообще рассматривается, поскольку ни одно
экранирование в пунктах 1-3 не меняет сырые первые два байта
выводимой строки. `\u0023#a\:b` (с экранированием только
ведущего `#`, по исходному рецепту голой формы, который эта
заметка заменяет) остаётся валидным, декодируемым неканоническим
написанием ВХОДА для ключа `##a:b` — парсер MUST по-прежнему
принимать его, — но это никогда не канонический ВЫВОД:
каноническая форма любого ключа, чьё содержимое начинается с
`##`, всегда квотированная, `"##a:b"`, по правилу (d), а не
`\u0023#a\:b`.

Если выбрана квотированная форма, writer выводит декодированное
содержимое сегмента между двумя символами `"`, экранируя только:

>>>>> lang=zh
规范写入器实际上永远不会对 `##` 前缀键的首段执行这一方案:
上面的选形规则 (d) 已在考虑裸形式之前就将其导向 quoted 形式,
因为第 1-3 条中的任何 escape 都不会改变输出行的原始前两个
字节。`\u0023#a\:b`(仅 escape 开头的 `#`,即本条替代之前
的原裸形式方案)对键 `##a:b` 而言仍是一种有效、可解码的
非规范 INPUT 拼写 —— 解析器 MUST 仍然接受它 —— 但它绝不是
规范 OUTPUT:任何内容以 `##` 开头的键,其规范形式始终是
quoted 形式 `"##a:b"`(依据 (d)),而不是 `\u0023#a\:b`。

若选择 quoted 形式,writer 将段的解码内容输出在两个 `"` 字符
之间,只 escape:

