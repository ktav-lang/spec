>>>>> lang=en
These checks bound the corpus itself — which fixtures exist, how
many, and how their bytes reach the implementation under test — and
are independent of, and do not replace, § 8.1's and § 8.2's
per-fixture acceptance, rejection, and equivalence requirements.

A claim of parser- or writer-conformance (§ 8.4) is supported only
by a corpus run performed by a runner that satisfies this section.
This section defines no separate conformance level for runners: a
runner is not an implementation and makes no claim of its own, so
the requirements above take effect as conditions on the evidence for
an implementation's claim.

>>>>> lang=ru
Эти проверки касаются самого корпуса — какие фикстуры существуют,
сколько их и как их байты попадают к тестируемой реализации — и не
зависят от требований § 8.1 и § 8.2 к приёму, отклонению и
эквивалентности на уровне отдельной фикстуры, а также не заменяют
их.

Заявка на parser- или writer-конформанс (§ 8.4) подтверждается
только прогоном корпуса, выполненным раннером, который удовлетворяет
этому разделу. Этот раздел не определяет отдельного уровня
конформанса для раннеров: раннер не является реализацией и не делает
собственной заявки, поэтому изложенные выше требования действуют как
условия доказательности заявки реализации.

>>>>> lang=zh
这些检查约束的是语料库本身——存在哪些 fixture、有多少个,以及
它们的字节如何到达被测实现——独立于且不能替代 § 8.1 与 § 8.2
中关于逐个 fixture 的接受、拒绝与等价性要求。

对 parser 或 writer 一致性的声明(§ 8.4)仅由满足本节要求的
运行器所执行的语料库运行来支持。本节不为运行器定义单独的一致性
级别:运行器不是实现,自身不作出任何声明,因此上述要求作为实现
声明之证据的条件而生效。

