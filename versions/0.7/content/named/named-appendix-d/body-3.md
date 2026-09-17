>>>>> lang=en
4. **A recognised escape in an inline scalar now forces String before
   keyword or numeric classification (§ 3.7, § 5.2).** In 0.6.x, a
   body such as `1\.0` could decode and then classify as Float; in
   0.7.0 it is String. This applies to every recognised escape, including
   `\.`, `\:`, and the three quote escapes `\"`, `\'`, and
   `` \` ``, even when the decoded byte has no structural role.
5. **A float literal that is non-finite in the declared Float domain now
   falls back to String (§ 5.2 rule 14).** In 0.6.x, a literal such as
   `1e9999` could become a non-finite Float on a binary64 backend; in
   0.7.0 it is String. Finite underflow to signed zero remains Float.

Additionally, `\uXXXX` is a new, purely additive escape (§ 3.7.1) —
no existing document's meaning changes because of it.
>>>>> lang=ru
4. **Распознанный escape в inline-скаляре теперь фиксирует String до
   классификации ключевого слова или числа (§ 3.7, § 5.2).** В 0.6.x
   тело вроде `1\.0` могло декодироваться, а затем классифицироваться
   как Float; в 0.7.0 это String. Правило относится к каждому
   распознанному escape, включая `\.`, `\:` и три escape кавычек
   `\"`, `\'` и `` \` ``, даже когда декодированный байт
   не имеет структурной роли.
5. **Float-литерал, неконечный в заявленном домене Float, теперь
   проваливается в String (§ 5.2, правило 14).** В 0.6.x литерал вроде
   `1e9999` на binary64-бэкенде мог стать неконечным Float; в 0.7.0
   это String. Конечный underflow в знаковый ноль по-прежнему остаётся
   Float.

Кроме того, `\uXXXX` — новая, чисто аддитивная escape-последовательность
(§ 3.7.1) — смысл ни одного существующего документа из-за неё не
меняется.
>>>>> lang=zh
4. **inline 标量中的已识别 escape 现在会在关键字或数字分类之前强制
   为 String(§ 3.7、§ 5.2)。** 在 0.6.x 中,像 `1\.0` 这样的体可以先
   解码再分类为 Float;在 0.7.0 中它是 String。该规则适用于每个已
   识别的 escape,包括 `\.`、`\:` 以及三个引号 escape
   `\"`、`\'` 与 `` \` ``,即使解码出的字节不具有结构性作用。
5. **在声明 Float 域中非有限的浮点字面量现在回退为 String
   (§ 5.2 规则 14)。** 在 0.6.x 中,binary64 后端上的 `1e9999` 之类
   字面量可能成为非有限 Float;在 0.7.0 中它是 String。下溢到有限的
   带符号零仍然是 Float。

此外,`\uXXXX` 是一个纯新增的 escape(§ 3.7.1)—— 不会因此改变任何
现有文档的含义。
