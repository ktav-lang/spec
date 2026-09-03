
该格式在输入上刻意宽容 —— 注释、inline 复合值、多种基数的数字字面量、下划线、
混合的 escape 风格 —— 但**输出上严格**。为每个**可表示** Value 定义了唯一的规范
序列化(§ 5.9)。

这种分离让人以最自然的形式书写 Ktav(紧凑 inline、显式多行、注释、混合基数),而
机器交换确定性的字节序列。字节确定性输出也使 Ktav 适合作为生成配置的目标:任何
两个 writer-conforming 实现对同一 Value 产生相同字节,因此生成文件之上的 diff
保持稳定。

合规语料双向测试:输入多样性经 `name.ktav` fixture(读取侧),输出确定性经
`name.canonical.ktav` fixture(写入侧),以及与 `name.json` oracle 的等价性
(Value 模型)。

