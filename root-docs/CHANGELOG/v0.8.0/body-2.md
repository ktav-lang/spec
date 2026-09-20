>>>>> lang=en
### Added

- **Appendix E — Migration from 0.7.x.**
- **`versions/0.8/tests/strict-lossy/`** — 13 fixtures covering the
  spellings the lax entry point still canonicalises: plus-signed,
  base-prefixed (hex/octal/binary) and underscored integers; negative
  zero; trailing-zero and exponent floats; the § 5.9.8
  scientific-region boundary; and the same check inside an inline
  object, an inline array, a bare multi-line array item, and a
  top-level inline document. The leading-zero case is deliberately
  NOT here: § 5.2 now keeps it a String, so nothing is lost and there
  is nothing for a strict parse to reject.
- **`versions/0.8/tests/valid/numbers/{integer,float}/leading_zero_is_string`**
  — both sides of the § 5.2 exception in one fixture each: the
  leading-zero forms as Strings, next to the forms that still infer
  numbers, so an implementation cannot over-apply the rule either.

>>>>> lang=ru
### Добавлено

- **Приложение E — Миграция с 0.7.x.**
- **`versions/0.8/tests/strict-lossy/`** — 13 фикстур, покрывающих те
  написания, которые нестрогая точка входа всё ещё канонизирует: целые
  с явным знаком `+`, префиксом основания (hex/octal/binary) и
  подчёркиваниями групп разрядов; отрицательный ноль; float с
  завершающим нулём и экспонентой; граничный случай § 5.9.8 научной
  записи; и ту же проверку внутри inline-object, inline-array, элемента
  многострочного массива и top-level inline-документа. Случая с ведущим
  нулём здесь намеренно НЕТ: § 5.2 теперь оставляет его строкой, так
  что ничего не теряется и строгому разбору нечего отвергать.
- **`versions/0.8/tests/valid/numbers/{integer,float}/leading_zero_is_string`**
  — обе стороны исключения § 5.2, по одной фикстуре на каждую: формы с
  ведущим нулём как String рядом с формами, которые по-прежнему
  выводятся как числа, чтобы реализация не смогла применить правило
  слишком широко.

>>>>> lang=zh
### 新增

- **附录 E —— 从 0.7.x 迁移。**
- **`versions/0.8/tests/strict-lossy/`** —— 13 个 fixture,覆盖宽松入口
  仍会规范化的那些写法:带显式 `+` 号、带进制前缀
  (hex/octal/binary)以及数字分组下划线的整数;负零;带尾随零与
  指数的 float;§ 5.9.8 科学记数法边界情形;以及在 inline object、
  inline array、多行数组的裸元素和顶层 inline 文档中的同一检查。
  前导零的情形刻意不在此处:§ 5.2 现在让它保持为 String,因此没有
  任何信息丢失,严格解析也就无可拒绝。
- **`versions/0.8/tests/valid/numbers/{integer,float}/leading_zero_is_string`**
  —— § 5.2 例外的两侧各用一个 fixture 表达:带前导零的形式作为
  String,紧邻仍被推断为数字的形式,使实现也无法把该规则应用得过宽。

