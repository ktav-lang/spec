>>>>> lang=en

0.6.0's key-escaping design (§ 3.7, § 4) made every key representable,
but a key needing several structural bytes escaped — `service\:
abc`, `a\.b\.c\:d` — reads worse exactly where escaping is needed
most: the backslashes sit inline with nothing marking where the key
starts or ends. Quoted keys (§ 5.3.3) are sugar over the same escape
mechanism, not a replacement for it: any quoted key already had a
bare, escaped spelling that produces the identical Value (§ 5.5); a
document using no quote characters at all parses exactly as before.

>>>>> lang=ru

Дизайн экранирования ключей 0.6.0 (§ 3.7, § 4) сделал представимым
любой ключ, но ключ, которому нужно экранировать несколько
структурных байтов — `service\: abc`, `a\.b\.c\:d` — читается хуже
именно там, где экранирование нужнее всего: обратные слэши стоят
внутри строки, никак не отмечая, где ключ начинается или
заканчивается. Квотированные ключи (§ 5.3.3) — это синтаксический
сахар поверх того же самого механизма экранирования, а не его замена:
у любого квотированного ключа уже было голое экранированное
написание, порождающее идентичное Value (§ 5.5); документ, не
использующий вовсе никаких символов кавычек, разбирается в точности
как раньше.

>>>>> lang=zh

0.6.0 的键 escape 设计(§ 3.7、§ 4)让每个键都变得可表示,但一个
需要 escape 好几个结构性字节的键 —— `service\: abc`、
`a\.b\.c\:d` —— 恰恰在最需要 escape 的地方可读性最差:反斜杠
夹在行内,没有任何标记指出键从哪里开始、到哪里结束。带引号的键
(§ 5.3.3)是同一 escape 机制之上的语法糖,而不是替代品:任何
带引号的键早就有一个能产生相同 Value 的裸转义写法(§ 5.5);完全
不使用任何引号字符的文档,解析结果与之前完全一样。

