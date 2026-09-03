
Ktav 文档是以 UTF-8 编码的 Unicode 码点序列。实现 MUST 以
`InvalidUtf8` 错误(§ 6.15)拒绝非 UTF-8 文档。若字节顺序标记
(U+FEFF)是文档的第一个码点、位于任何其他字节之前,parser-conforming
实现 MUST 跳过恰好一个这样的前导字节顺序标记;规范写入器(§ 5.9)
MUST NOT 输出前导字节顺序标记。文档中任何其他位置的 U+FEFF
码点都是普通内容 —— § 3.3 未将其归类为空白。

