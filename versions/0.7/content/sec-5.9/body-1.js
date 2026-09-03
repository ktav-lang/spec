export default {
  en: `
A **writer-conforming** implementation MUST emit a *canonical* Ktav
serialisation of any **representable** Value — § 5.9.0 defines which
Values are representable, subsuming the narrow set of String values
that § 5.9.7 excludes. The canonical form is byte-deterministic: for
any given representable Value, every writer-conforming
implementation MUST produce the same byte sequence. A
writer-conforming implementation MUST reject a non-representable
Value with an error, rather than serialise it — this requirement
applies uniformly to every non-representability rule of § 5.9.0,
not only to § 5.9.7's String exclusions: permitting an
implementation-chosen or lossy encoding for the same
non-representable Value would itself violate the byte-determinism
guarantee just stated.

`,
  ru: `
**Реализация-эмиттер** (writer-conforming) MUST производить
*каноническую* Ktav-сериализацию любого **представимого**
(representable) Value — § 5.9.0 определяет, какие Values
представимы, поглощая узкое множество значений String, исключаемых
§ 5.9.7. Каноническая форма является байт-детерминированной: для
любого данного представимого Value каждая реализация-эмиттер MUST
производить одну и ту же байтовую последовательность. Реализация-
эмиттер MUST отклонять непредставимое Value с ошибкой, а не
сериализовать его — это требование применяется единообразно к
каждому правилу непредставимости § 5.9.0, а не только к
String-исключениям § 5.9.7: разрешить эмиттеру произвольную/lossy
кодировку для одного и того же непредставимого Value значило бы
нарушить только что заявленную гарантию байт-детерминизма.

`,
  zh: `
**writer-conforming** 实现 MUST 对任何**可表示**(representable)
Value 输出*规范* Ktav 序列化 —— § 5.9.0 定义了哪些 Value 可表示,
涵盖 § 5.9.7 排除的那一小类 String 值。规范形式是字节确定性的:
对任何给定的可表示 Value,所有 writer-conforming 实现 MUST 产生
相同的字节序列。writer-conforming 实现 MUST 以错误拒绝不可表示的
Value,而不是将其序列化 —— 该要求统一适用于 § 5.9.0 的每一条
不可表示规则,而不仅是 § 5.9.7 的 String 排除:若允许为同一个
不可表示 Value 产生任意/lossy 编码,则会违反刚刚声明的字节确定性
保证。

`,
};
