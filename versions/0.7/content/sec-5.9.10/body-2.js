export default {
  en: `A canonical writer never actually reaches this recipe for a
\`##\`-prefixed key's first segment: form-selection rule (d) above
already routes it to quoted form before bare form is even
considered, because no escape within bullets 1-3 changes the raw
first two bytes of the emitted line. \\u0023#a\\:b (escaping
only the leading \`#\`, per the original bare-form recipe this
replaces) remains a valid, decodable, non-canonical INPUT spelling
for the key \`##a:b\` -- a parser MUST still accept it -- but it is
never the canonical OUTPUT: the canonical form of any key whose
content begins with \`##\` is always quoted, \`"##a:b"\`, per (d), not
\\u0023#a\\:b.

When quoted form is selected, the writer emits the segment's decoded
content between two \`"\` characters, escaping only:

- a raw \`"\` in the content, as \`\\"\` — the only byte structural
  inside a quoted segment, since \`"\` is the fixed delimiter;
- \`\\\` (backslash), as \`\\\\\` — backslash is always the escape lead,
  in both forms;
- LF / CR, as \`\\n\` / \`\\r\` — a key MUST remain single-line;
- any other control byte below \`0x20\` that is not a § 3.3
  whitespace member, or DEL, as \`\\uXXXX\` — quoting relaxes which
  STRUCTURAL bytes need escaping, not the format's separate
  prohibition on raw invisible, non-whitespace bytes in a key
  (§ 5.3.3). A control byte that IS a § 3.3 whitespace member (tab,
  VT, FF) is excluded from this bullet for the same reason it is
  excluded from bare form's analogous bullet above: § 4's
  \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\` already admit it raw, so
  it needs no \`\\uXXXX\` escape here, whether it occurs at an edge or
  in the interior of the segment (see the edge-whitespace point
  below, which is not limited to non-control whitespace).

\`.\`, \`:\`, \`,\`, \`{\`, \`}\`, \`[\`, \`]\`, \`(\`, \`)\`, \`'\`, and \`\` \` \`\` need no
escaping in quoted form, and neither does edge whitespace: a
\`<quoted-segment>\`'s content is never trimmed on re-parse (§ 5.3.3),
so bare form's bullet above — escaping edge whitespace to survive
re-parse trimming — has nothing to guard against here. A leading
\`##\` likewise needs no escaping of its own in quoted form: the line
begins with \`"\`, not \`#\`, so § 5.1 rule 2's comment hazard never
arises for a quoted key in the first place.

This ensures that the canonical output round-trips in either form:
unescaped dots in a canonical bare key are path separators only,
structural bytes never appear raw outside a quoted segment's
delimiters, no edge whitespace is lost to re-parse trimming, and a
quoted segment's own delimiter never appears raw inside it. A key
segment containing a literal \`.\` or \`:\` — a structural byte needing
escape in bare form — is therefore always emitted quoted instead,
per the form-selection rule above; a key segment containing only a
literal \`\\\`, LF, CR, a control byte, or DEL is NOT — bare form
escapes those identically and quoting would not remove the escape.

Examples: the key \`a.b\` (a literal dot) is emitted as \`"a.b"\` (not
\`a\\.b\` — quoting is preferred once any STRUCTURAL escape would
otherwise be needed); the key \`a:b\` is emitted as \`"a:b"\`; the key
\`hello\` (no escape needed, does not begin with a quote character) is
emitted bare, unchanged; the key \`path\\to\` (a literal backslash, no
structural byte) is emitted bare as \`path\\\\to\`, unchanged from
before this addition — quoting it (\`"path\\\\to"\`) would need the
identical \`\\\\\` escape for no benefit; the key \`"port"\` (six
characters: a leading and a trailing \`"\`) is emitted as \`"\\"port\\""\`
(quoted is forced by the leading \`"\` alone, even though the interior
needs only the one escape for the delimiter's own two occurrences);
the key U+FEFF followed by \`host\` (five code points), when it is the
root Object's first-serialized key, is emitted as \`"\` immediately
followed by a raw U+FEFF and then \`host"\` (quoted by rule (c) above;
the U+FEFF itself is emitted raw, needing no escape, since quoting
alone already moves it off byte offset 0) —
but the identical five-code-point key at any OTHER pair position
(not the document's first-serialized key) is emitted bare and
unchanged, since only the root's first-serialized key's first
segment can ever land at byte offset 0 (§ 5.9.12).

`,
  ru: `Канонический writer никогда фактически не доходит до этого
рецепта для первого сегмента ключа с префиксом \`##\`: правило (d)
выбора формы выше уже направляет его в квотированную форму до
того, как голая форма вообще рассматривается, поскольку ни одно
экранирование в пунктах 1-3 не меняет сырые первые два байта
выводимой строки. \\u0023#a\\:b (с экранированием только
ведущего \`#\`, по исходному рецепту голой формы, который эта
заметка заменяет) остаётся валидным, декодируемым неканоническим
написанием ВХОДА для ключа \`##a:b\` — парсер MUST по-прежнему
принимать его, — но это никогда не канонический ВЫВОД:
каноническая форма любого ключа, чьё содержимое начинается с
\`##\`, всегда квотированная, \`"##a:b"\`, по правилу (d), а не
\\u0023#a\\:b.

Если выбрана квотированная форма, writer выводит декодированное
содержимое сегмента между двумя символами \`"\`, экранируя только:

- сырой \`"\` в содержимом — как \`\\"\` — единственный структурный
  байт внутри квотированного сегмента, поскольку \`"\` — фиксированный
  разделитель;
- \`\\\` (обратный слэш) — как \`\\\\\` — обратный слэш всегда является
  escape-лидом в обеих формах;
- LF / CR — как \`\\n\` / \`\\r\` — ключ MUST оставаться однострочным;
- любой другой управляющий байт ниже \`0x20\`, не являющийся
  элементом множества § 3.3, или DEL — как \`\\uXXXX\` — квотирование
  ослабляет требования к экранированию только для СТРУКТУРНЫХ
  байтов, а не отдельный запрет формата на сырые невидимые,
  непробельные байты в ключе (§ 5.3.3). Управляющий байт, ЯВЛЯЮЩИЙСЯ
  элементом множества § 3.3 (таб, VT, FF), исключается из этого
  пункта по той же причине, по которой он исключён из аналогичного
  пункта голой формы выше: \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\`
  § 4 уже допускают его сырым, так что здесь он не нуждается в
  экранировании \`\\uXXXX\`, независимо от того, встречается ли он на
  границе или внутри сегмента (см. пункт о краевом пробеле ниже,
  который не ограничен неуправляющим пробелом).

\`.\`, \`:\`, \`,\`, \`{\`, \`}\`, \`[\`, \`]\`, \`(\`, \`)\`, \`'\` и \`\` \` \`\` не
нуждаются в экранировании в квотированной форме, как и краевой
пробел: содержимое \`<quoted-segment>\` никогда не обрезается при
повторном парсинге (§ 5.3.3), так что пункт голой формы выше —
экранировать краевой пробел, чтобы пережить обрезку при повторном
парсинге — здесь не от чего защищать. Ведущий \`##\` точно так же не
нуждается в собственном экранировании в квотированной форме: строка
начинается с \`"\`, а не с \`#\`, так что опасность комментария по
правилу 2 § 5.1 для квотированного ключа вообще не возникает.

Это гарантирует round-trip канонического вывода в любой из форм:
неэкранированные точки в каноническом голом ключе являются только
разделителями пути, структурные байты никогда не появляются
буквально вне разделителей квотированного сегмента, ни один краевой
пробел не теряется из-за обрезки при повторном парсинге, и
собственный разделитель квотированного сегмента никогда не
появляется в нём буквально. Сегмент ключа, содержащий литеральные
\`.\` или \`:\` — структурный байт, требующий экранирования в голой
форме, — поэтому всегда выводится квотированным вместо этого, по
правилу выбора формы выше; сегмент ключа, содержащий только
литеральный \`\\\`, LF, CR, управляющий байт или DEL, — нет: голая
форма экранирует их идентично, и квотирование не убрало бы
экранирование.

Примеры: ключ \`a.b\` (литеральная точка) выводится как \`"a.b"\` (не
\`a\\.b\` — квотирование предпочитается, как только иначе
потребовалось бы хоть одно СТРУКТУРНОЕ экранирование); ключ \`a:b\`
выводится как \`"a:b"\`; ключ \`hello\` (экранирование не нужно, не
начинается с символа кавычки) выводится голым, без изменений; ключ
\`path\\to\` (литеральный обратный слэш, нет структурного байта)
выводится голым как \`path\\\\to\`, без изменений по сравнению с
периодом до этого добавления — квотирование его (\`"path\\\\to"\`)
потребовало бы того же экранирования \`\\\\\` без всякой пользы; ключ
\`"port"\` (шесть символов: ведущая и завершающая \`"\`) выводится как
\`"\\"port\\""\` (квотирование вынуждено уже одной ведущей \`"\`, хотя
внутренняя часть нуждается лишь в одном экранировании для двух
вхождений самого разделителя); ключ U+FEFF, за которым следует
\`host\` (пять кодовых точек), когда это первый сериализуемый ключ
корневого Object, выводится как \`"\`, сразу за которой следует сырой
U+FEFF, а затем \`host"\` (квотирован по правилу (c) выше; сам U+FEFF
выводится сырым, не нуждаясь в экранировании, поскольку одно лишь
квотирование уже убирает его с байтового смещения 0) — но тот же
самый пятикодоточечный ключ на ЛЮБОЙ ДРУГОЙ позиции пары (не первый
сериализуемый ключ документа) выводится голым и без изменений,
поскольку только первый сегмент первого сериализуемого ключа корня
вообще может оказаться на байтовом смещении 0 (§ 5.9.12).

`,
  zh: `规范写入器实际上永远不会对 \`##\` 前缀键的首段执行这一方案:
上面的选形规则 (d) 已在考虑裸形式之前就将其导向 quoted 形式,
因为第 1-3 条中的任何 escape 都不会改变输出行的原始前两个
字节。\\u0023#a\\:b(仅 escape 开头的 \`#\`,即本条替代之前
的原裸形式方案)对键 \`##a:b\` 而言仍是一种有效、可解码的
非规范 INPUT 拼写 —— 解析器 MUST 仍然接受它 —— 但它绝不是
规范 OUTPUT:任何内容以 \`##\` 开头的键,其规范形式始终是
quoted 形式 \`"##a:b"\`(依据 (d)),而不是 \\u0023#a\\:b。

若选择 quoted 形式,writer 将段的解码内容输出在两个 \`"\` 字符
之间,只 escape:

- 内容中的裸 \`"\` —— 作为 \`\\"\` —— quoted 段内部唯一的结构性
  字节,因为 \`"\` 是固定分隔符;
- \`\\\`(反斜杠)—— 作为 \`\\\\\` —— 反斜杠在两种形式中始终是
  escape 前导;
- LF / CR —— 作为 \`\\n\` / \`\\r\` —— 键 MUST 保持单行;
- 任何其他不属于 § 3.3 空白成员的 0x20 以下控制字节,或 DEL
  —— 作为 \`\\uXXXX\` —— 加引号只放宽了对 STRUCTURAL 字节的
  escape 要求,并不放宽格式另一条「键中不允许裸不可见、非空白
  字节」的规则。属于 § 3.3 空白成员的控制字节(制表符、VT、
  FF)不在本条之列,原因与它不在上面裸形式对应条目之列相同:
  § 4 的 \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\` 已经允许它以
  裸形式出现,因此这里无需 \`\\uXXXX\` escape,不论它出现在段的
  边界还是内部(见下面关于边缘空白的说明,该说明并不限于非
  控制的空白)。

\`.\`、\`:\`、\`,\`、\`{\`、\`}\`、\`[\`、\`]\`、\`(\`、\`)\`、\`'\` 与 \`\` \` \`\` 在
quoted 形式中都无需 escape,边缘空白也是如此:\`<quoted-segment>\`
的内容在重解析时从不被修剪(§ 5.3.3),所以上面裸形式那一条
——为在重解析的修剪中幸存而 escape 边缘空白——在这里没有什么
需要防范的。开头的 \`##\` 在 quoted 形式中同样无需自身 escape:
该行以 \`"\` 开头,而非 \`#\`,因此 § 5.1 规则 2 的注释风险对
quoted 键根本不会出现。

这确保规范输出无论采用哪种形式都能 round-trip:规范裸键中未
escape 的点仅为路径分隔符,结构性字节永远不会在 quoted 段的
分隔符之外以字面形式出现,不会因重解析时的修剪而丢失任何边缘
空白,quoted 段自身的分隔符也绝不会在其内部以字面形式出现。
含有字面 \`.\` 或 \`:\` 的键段——裸形式下需要 escape 的结构性字节
——因此按上面的形式选择规则总是改为以 quoted 形式输出;只含
字面 \`\\\`、LF、CR、控制字节或 DEL 的键段则不会:裸形式对它们的
escape 方式完全相同,加引号并不能省去该 escape。

例:键 \`a.b\`(字面点)输出为 \`"a.b"\`(而非 \`a\\.b\`——一旦另需
至少一个 STRUCTURAL escape,就优先选用加引号);键 \`a:b\` 输出
为 \`"a:b"\`;键 \`hello\`(无需 escape,不以引号字符开头)按裸
形式原样输出;键 \`path\\to\`(字面反斜杠,无结构性字节)按裸
形式输出为 \`path\\\\to\`,与本次新增之前相比没有变化——为它加引号
(\`"path\\\\to"\`)仍需相同的 \`\\\\\` escape,却毫无益处;键 \`"port"\`
(六个字符:开头与结尾各一个 \`"\`)输出为 \`"\\"port\\""\`(仅凭
开头的 \`"\` 就已强制加引号,尽管内部只需为分隔符自身的两次出现
各 escape 一次);键 U+FEFF 后跟 \`host\`(五个码点),当它是根
Object 首个序列化键时,输出为 \`"\`,紧接着是裸的 U+FEFF,然后是
\`host"\`(由上面的规则 (c) 强制加引号;U+FEFF 本身按裸字节输出,
无需 escape,因为仅加引号这一步就已经把它移出字节偏移 0)——
但同样这五码点的键出现在任何其他 pair 位置(不是文档首个序列化
键)时,则按裸形式原样输出,因为只有根的首个序列化键的第一段
才可能落在字节偏移 0(§ 5.9.12)。

`,
};
