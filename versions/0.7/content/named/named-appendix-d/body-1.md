>>>>> lang=en

The Rust reference implementation already trimmed the full
25-code-point set at key-segment edges in every 0.6.x release. For Rust,
and for implementations whose 0.6.x behaviour already matched that
trim, the § 3.3 / § 4 clarification is non-breaking: apart from documents
that rely on any of the five breaking forms below, and apart from the
implementation-dependent numeric migration hazard described below,
previously round-tripping documents retain their meaning under 0.7.0.

An implementation that followed the old § 3.3 / § 4 wording literally and
trimmed only its specified ASCII whitespace has an additional
**document-behaviour** change. A document that relies on one of the other
members of the 25-code-point set at structural, blank-line, comment, or
root-dispatch positions; around separators; at scalar or key edges; or on
content lines in a stripped `(…)` block can parse differently or produce a
different value or error under 0.7.0. Such documents require migration review
across all of those sites, not merely an implementation-code update.

Five breaking changes apply to every implementation, Rust included.
The value/key-edge trimming clarification above remains separately
scoped: it changes documents only for implementations that did not
already implement the 0.6.x Rust-compatible trim.

There is also an implementation-dependent numeric migration hazard. The
0.7.0 minimum Float domain requires binary64 range and precision and
`roundTiesToEven`. An implementation that was conforming under 0.6.x with
a narrower domain, such as binary32, may therefore parse an old literal
differently when it adopts 0.7.0; for example, binary32 cannot represent
`16777217.0` exactly and rounds it to `16777216.0`. This is not a sixth
universal breaking change: it applies only to a previously conforming
narrower-domain implementation, not to one that already used binary64 or
wider semantics.

>>>>> lang=ru

Эталонная Rust-реализация уже обрезала полный набор из 25 кодовых точек
на границах сегмента ключа в каждом релизе 0.6.x. Для Rust и реализаций,
чьё поведение 0.6.x уже совпадало с такой обрезкой, уточнение § 3.3 / § 4
не является ломающим: кроме документов, зависящих от одной из пяти
ломающих форм ниже, и кроме зависящей от реализации числовой опасности
миграции, описанной ниже, ранее проходившие round-trip документы сохраняют
смысл в 0.7.0.

У реализации, буквально следовавшей старой формулировке § 3.3 / § 4 и
обрезавшей только указанные там ASCII-пробелы, есть дополнительное изменение
**поведения документов**. Документ, который использует один из остальных
элементов набора из 25 кодовых точек в структурной позиции, на пустой строке,
при распознавании комментария или корня, вокруг разделителей, на границе
скаляра или ключа либо в строках stripped-блока `(…)`, в 0.7.0 может
разобраться иначе или породить другое значение/ошибку. Такие документы
требуют проверки миграции по всем этим местам, а не просто обновления кода.

Пять ломающих изменений касаются каждой реализации, включая Rust.
Уточнение trimming на границах значения/ключа, описанное выше, остаётся
отдельно ограниченным: оно меняет документы только у реализаций, которые
не имели уже совместимой с Rust 0.6.x обрезки.

Есть также зависящая от реализации числовая опасность миграции. Минимальный
домен Float в 0.7.0 требует диапазон и точность binary64 и
`roundTiesToEven`. Поэтому реализация, которая в 0.6.x соответствовала
спеке с более узким доменом, например binary32, при переходе на 0.7.0 может
разбирать старый литерал иначе: binary32 не может точно представить
`16777217.0` и округляет его до `16777216.0`. Это не шестое универсальное
ломающее изменение: оно относится только к ранее соответствовавшей более
узкой реализации, а не к реализации, уже использовавшей binary64 или более
широкую семантику.

>>>>> lang=zh

Rust 参考实现在每个 0.6.x 版本中就已在键段边缘修剪完整的 25 码点
集合。对 Rust 以及 0.6.x 行为已匹配这种修剪的实现而言,§ 3.3 / § 4
澄清不是破坏性变更:除依赖下面五种破坏性形式之一的文档以及受下述
实现相关数值迁移风险影响的文档外,原先能 round-trip 的文档在 0.7.0
中保持其含义。

字面遵循旧 § 3.3 / § 4 措辞、仅修剪其中指定 ASCII 空白的实现还有
额外的**文档行为**变更。若文档在结构位置、空行、注释或根 dispatch
处,在分隔符周围,在标量或键的边缘,或在 stripped `(…)` 块的内容行中
使用 25 码点集合的其它成员,它在 0.7.0 中可能产生不同的解析、值或
错误。这类文档需要对上述所有位置进行迁移审查,并非仅仅更新实现代码。

有五项破坏性变更适用于包括 Rust 在内的每一个实现。
上文所述的值/键边界 trim 澄清另有范围:只有尚未具备与 Rust 0.6.x
兼容的 trim 的实现,其文档行为才会因此改变。

此外还有一种取决于实现的数值迁移风险。0.7.0 的 Float 最低域要求
binary64 的范围与精度以及 `roundTiesToEven`。因此,在 0.6.x 中以
更窄域(例如 binary32)符合规范的实现迁移到 0.7.0 时,旧字面量可能被
解析为不同的值;例如 binary32 无法精确表示 `16777217.0`,会将其舍入
为 `16777216.0`。这不是第六项普遍破坏性变更:它只适用于此前符合规范
的更窄域实现,不适用于已经使用 binary64 或更宽语义的实现。

