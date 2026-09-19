>>>>> lang=en
- a raw `"` in the content, as `\"` — the only byte structural
  inside a quoted segment, since `"` is the fixed delimiter;
- `\` (backslash), as `\\` — backslash is always the escape lead,
  in both forms;
- LF / CR, as `\n` / `\r` — a key MUST remain single-line;
- any other control byte below `0x20` that is not a § 3.3
  whitespace member, or DEL, as `\uXXXX` — quoting relaxes which
  STRUCTURAL bytes need escaping, not the format's separate
  prohibition on raw invisible, non-whitespace bytes in a key
  (§ 5.3.3). A control byte that IS a § 3.3 whitespace member (tab,
  VT, FF) is excluded from this bullet for the same reason it is
  excluded from bare form's analogous bullet above: § 4's
  `<dq-char>` / `<sq-char>` / `<bt-char>` already admit it raw, so
  it needs no `\uXXXX` escape here, whether it occurs at an edge or
  in the interior of the segment (see the edge-whitespace point
  below, which is not limited to non-control whitespace).

`.`, `:`, `,`, `{`, `}`, `[`, `]`, `(`, `)`, `'`, and `` ` `` need no
escaping in quoted form, and neither does edge whitespace: a
`<quoted-segment>`'s content is never trimmed on re-parse (§ 5.3.3),
so bare form's bullet above — escaping edge whitespace to survive
re-parse trimming — has nothing to guard against here. A leading
`##` likewise needs no escaping of its own in quoted form: the line
begins with `"`, not `#`, so § 5.1 rule 2's comment hazard never
arises for a quoted key in the first place.

This ensures that the canonical output round-trips in either form:
unescaped dots in a canonical bare key are path separators only,
structural bytes never appear raw outside a quoted segment's
delimiters, no edge whitespace is lost to re-parse trimming, and a
quoted segment's own delimiter never appears raw inside it. A key
segment containing a literal `.` or `:` — a structural byte needing
escape in bare form — is therefore always emitted quoted instead,
per the form-selection rule above; a key segment containing only a
literal `\`, LF, CR, a control byte, or DEL is NOT — bare form
escapes those identically and quoting would not remove the escape.

>>>>> lang=ru
- сырой `"` в содержимом — как `\"` — единственный структурный
  байт внутри квотированного сегмента, поскольку `"` — фиксированный
  разделитель;
- `\` (обратный слэш) — как `\\` — обратный слэш всегда является
  escape-лидом в обеих формах;
- LF / CR — как `\n` / `\r` — ключ MUST оставаться однострочным;
- любой другой управляющий байт ниже `0x20`, не являющийся
  элементом множества § 3.3, или DEL — как `\uXXXX` — квотирование
  ослабляет требования к экранированию только для СТРУКТУРНЫХ
  байтов, а не отдельный запрет формата на сырые невидимые,
  непробельные байты в ключе (§ 5.3.3). Управляющий байт, ЯВЛЯЮЩИЙСЯ
  элементом множества § 3.3 (таб, VT, FF), исключается из этого
  пункта по той же причине, по которой он исключён из аналогичного
  пункта голой формы выше: `<dq-char>` / `<sq-char>` / `<bt-char>`
  § 4 уже допускают его сырым, так что здесь он не нуждается в
  экранировании `\uXXXX`, независимо от того, встречается ли он на
  границе или внутри сегмента (см. пункт о краевом пробеле ниже,
  который не ограничивается только неуправляющими пробельными символами).

`.`, `:`, `,`, `{`, `}`, `[`, `]`, `(`, `)`, `'` и `` ` `` не
нуждаются в экранировании в квотированной форме, как и краевой
пробел: содержимое `<quoted-segment>` никогда не обрезается при
повторном парсинге (§ 5.3.3), так что пункт голой формы выше —
экранировать краевой пробел, чтобы пережить обрезку при повторном
парсинге — здесь не от чего защищать. Ведущий `##` точно так же не
нуждается в собственном экранировании в квотированной форме: строка
начинается с `"`, а не с `#`, так что опасность комментария по
правилу 2 § 5.1 для квотированного ключа вообще не возникает.

Это гарантирует round-trip канонического вывода в любой из форм:
неэкранированные точки в каноническом голом ключе являются только
разделителями пути, структурные байты никогда не появляются
буквально вне разделителей квотированного сегмента, ни один краевой
пробел не теряется из-за обрезки при повторном парсинге, и
собственный разделитель квотированного сегмента никогда не
появляется в нём буквально. Сегмент ключа, содержащий литеральные
`.` или `:` — структурный байт, требующий экранирования в голой
форме, — поэтому всегда выводится квотированным вместо этого, по
правилу выбора формы выше; сегмент ключа, содержащий только
литеральный `\`, LF, CR, управляющий байт или DEL, — нет: голая
форма экранирует их идентично, и квотирование не убрало бы
экранирование.

>>>>> lang=zh
- 内容中的裸 `"` —— 作为 `\"` —— quoted 段内部唯一的结构性
  字节,因为 `"` 是固定分隔符;
- `\`(反斜杠)—— 作为 `\\` —— 反斜杠在两种形式中始终是
  escape 前导;
- LF / CR —— 作为 `\n` / `\r` —— 键 MUST 保持单行;
- 任何其他不属于 § 3.3 空白成员的 `0x20` 以下控制字节,或 DEL
  —— 作为 `\uXXXX` —— 加引号只放宽了对 STRUCTURAL 字节的
  escape 要求,并不放宽格式另一条「键中不允许裸不可见、非空白
  字节」的规则(§ 5.3.3)。属于 § 3.3 空白成员的控制字节(制表符、
  VT、FF)不在本条之列,原因与它不在上面裸形式对应条目之列相同:
  § 4 的 `<dq-char>` / `<sq-char>` / `<bt-char>` 已经允许它以
  裸形式出现,因此这里无需 `\uXXXX` escape,不论它出现在段的
  边界还是内部(见下面关于边缘空白的说明,该说明并不限于非
  控制的空白)。

`.`、`:`、`,`、`{`、`}`、`[`、`]`、`(`、`)`、`'` 与 `` ` `` 在
quoted 形式中都无需 escape,边缘空白也是如此:`<quoted-segment>`
的内容在重解析时从不被修剪(§ 5.3.3),所以上面裸形式那一条
——为在重解析的修剪中幸存而 escape 边缘空白——在这里没有什么
需要防范的。开头的 `##` 在 quoted 形式中同样无需自身 escape:
该行以 `"` 开头,而非 `#`,因此 § 5.1 规则 2 的注释风险对
quoted 键根本不会出现。

这确保规范输出无论采用哪种形式都能 round-trip:规范裸键中未
escape 的点仅为路径分隔符,结构性字节永远不会在 quoted 段的
分隔符之外以字面形式出现,不会因重解析时的修剪而丢失任何边缘
空白,quoted 段自身的分隔符也绝不会在其内部以字面形式出现。
含有字面 `.` 或 `:` 的键段——裸形式下需要 escape 的结构性字节
——因此按上面的形式选择规则总是改为以 quoted 形式输出;只含
字面 `\`、LF、CR、控制字节或 DEL 的键段则不会:裸形式对它们的
escape 方式完全相同,加引号并不能省去该 escape。

