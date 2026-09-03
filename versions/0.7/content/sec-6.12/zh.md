
闭合 inline 复合值内部不归入 `UnterminatedInlineCompound` 的结构
缺陷,是 `MalformedInlineCompound` 错误。覆盖情况:

- 开启符紧后的前导逗号(`{,a: 1}`、`[,1, 2]`)。
- 两个或更多连续逗号(`{a: 1,, b: 2}`、`[1,, 2]`)。
- 空 inline 数组项(`[a,, b]`);§ 5.8 关于闭合符前单个尾部逗号
  的例外仍适用。
- 其他不引发 `UnterminatedInlineCompound` 的结构缺陷(如 inline
  对象内缺失对分隔符:`{a 1, b: 2}`)。

对的空值(`{a:}`、`{a::}`)**不**是缺陷;按 § 5.8.2 为空 String。

