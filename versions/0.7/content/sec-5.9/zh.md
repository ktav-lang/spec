
**writer-conforming** 实现 MUST 对任何**可表示**(representable)
Value 输出*规范* Ktav 序列化 —— § 5.9.0 定义了哪些 Value 可表示,
涵盖 § 5.9.7 排除的那一小类 String 值。规范形式是字节确定性的:
对任何给定的可表示 Value,所有 writer-conforming 实现 MUST 产生
相同的字节序列。writer-conforming 实现 MUST 以错误拒绝不可表示的
Value,而不是将其序列化 —— 该要求统一适用于 § 5.9.0 的每一条
不可表示规则,而不仅是 § 5.9.7 的 String 排除:若允许为同一个
不可表示 Value 产生任意/lossy 编码,则会违反刚刚声明的字节确定性
保证。

