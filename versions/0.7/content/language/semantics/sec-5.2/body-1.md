>>>>> lang=en

Given a **scalar body** — the trimmed text obtained from a pair-line
body after a plain `:` separator, or the trimmed text of an inline
scalar after escape processing (§ 3.7), or the trimmed text of an
array-item line that uses no marker — the parser classifies it as
follows. Rules are applied in order; the first matching rule wins.
Bodies after `::` are **not** dispatched through § 5.2; they are
handled per § 5.3 / § 5.4 / § 5.8 as raw Strings. Rules 1–4 (the
multi-line Object/Array/string openers) never apply to an inline
scalar body either: § 5.8.5 already dispatches an inline value's
leading `{`/`[` to nested-compound parsing before § 5.2 is ever
reached, and a lone inline `(` token or `((` token is an ordinary
String containing one ASCII byte (`"("`) or two ASCII bytes
(`"(("`), respectively, not a multi-line opener, since an inline
compound cannot continue onto a later line.

>>>>> lang=ru

Дано **скалярное тело** — обрезанный текст, полученный из тела
pair-line после `:`-разделителя, либо обрезанный текст inline-скаляра
после обработки escape (§ 3.7), либо обрезанный текст array-item-line
без маркера. Парсер классифицирует его так. Правила применяются по
порядку; побеждает первое совпавшее. Тела после `::` НЕ
диспетчеризуются через § 5.2; они обрабатываются по § 5.3 / § 5.4 /
§ 5.8 как сырые Strings. Правила 1–4 (открыватели многострочных
Object/Array/строки) также никогда не применяются к телу
inline-скаляра: § 5.8.5 уже диспетчеризует ведущий `{`/`[`
inline-значения во вложенный разбор составного до того, как вообще
будет достигнут § 5.2, а одиночный inline-токен `(` или `((` —
обычная String, содержащая соответственно один ASCII-байт
(`"("`) или два ASCII-байта (`"(("`), а не многострочный опенер,
поскольку inline-составное не может продолжаться на следующей строке.

>>>>> lang=zh

给定**标量体** —— 经 trim 后的文本,来自 pair-line 在 `:` 之后,
或来自 inline 标量在 escape 处理(§ 3.7)之后,或来自无标记的
array-item line。解析器按顺序分类;首个匹配规则胜出。`::` 之后的体
**不**经 § 5.2;按 § 5.3 / § 5.4 / § 5.8 当作原始 String 处理。规则
1–4(多行 Object/Array/字符串开启符)同样从不适用于 inline 标量体:
§ 5.8.5 已在到达 § 5.2 之前,将 inline 值开头的 `{`/`[` 分发给嵌套
复合值解析;而 inline 位置上单独出现的 `(` 标记或 `((` 标记是
普通 String,分别包含一个 ASCII 字节(`"("`)或两个 ASCII 字节
(`"(("`),而非多行开启符,因为 inline 复合值无法延续到下一行。

