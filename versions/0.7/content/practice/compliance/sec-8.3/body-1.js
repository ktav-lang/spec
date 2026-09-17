export default {
  en: `
The following identity MUST hold for every **representable** Value V
(§ 5.9.0) producible by a parser-conforming implementation, when
emitted and re-parsed by writer- and parser-conforming
implementations of the same Value domain:

\`\`\`
emit_canonical(parse(emit_canonical(V))) == emit_canonical(V)
\`\`\`

That is: parsing canonical output and re-emitting it produces
byte-identical output. The canonical form is a fixed point of the
parse-emit cycle. A non-representable Value is outside the scope of
this identity: § 5.9's writer-conforming requirement is to reject
such a Value with an error rather than serialise it (§ 5.9.0).

`,
  ru: `
Следующее тождество MUST выполняться для каждого **представимого**
Value V (§ 5.9.0), производимого parser-conforming реализацией, при
выводе и повторном парсинге writer- и parser-conforming
реализациями того же домена Value:

\`\`\`
emit_canonical(parse(emit_canonical(V))) == emit_canonical(V)
\`\`\`

То есть: парсинг канонического вывода и повторный его выпуск
даёт побайтово идентичный вывод. Каноническая форма — это
фиксированная точка цикла parse-emit. Непредставимое Value вне
области действия этого тождества: требование § 5.9 к
writer-conforming реализации — отклонить такое Value с ошибкой, а
не сериализовать его (§ 5.9.0).

`,
  zh: `
下式 MUST 对任何由 parser-conforming 实现产生的**可表示**
(representable)Value V(§ 5.9.0)成立(由同 Value 域的 writer- 和
parser-conforming 实现执行):

\`\`\`
emit_canonical(parse(emit_canonical(V))) == emit_canonical(V)
\`\`\`

即:解析规范输出并再次输出产生字节相同的输出。规范形式是
parse-emit 循环的不动点。不可表示的 Value 不在此不变式的范围内:
§ 5.9 对 writer-conforming 实现的要求是以错误拒绝此类 Value,而
不是将其序列化(§ 5.9.0)。

`,
};
