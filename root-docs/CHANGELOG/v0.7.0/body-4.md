>>>>> lang=en
- **§ 3.3 — whitespace is now a fixed, exhaustively enumerated
  25-code-point set (`MUST`), not an implementation-defined `MAY`.**
  The set is Unicode's `White_Space` property as of Unicode 6.3 (2013),
  frozen by explicit list rather than by reference to "the current
  version of Unicode" — implementations MUST NOT delegate to a host
  language's built-in Unicode-whitespace primitive (verified to disagree
  with this list in both directions across at least two mainstream
  language runtimes). Non-breaking against every shipped 0.6.x Rust
  core, which already recognised the full set; breaking only for an
  implementation that took the old `MAY` at face value and stuck to
  ASCII space/tab.
- **§ 3.1 — leading-BOM handling is now deterministic.** A
  parser-conforming implementation MUST skip exactly one leading
  byte-order mark (U+FEFF) if it is the very first code point of the
  document, before any other byte; the canonical writer (§ 5.9)
  MUST NOT emit a leading byte-order mark. A U+FEFF anywhere else in
  the document is ordinary content — § 3.3 does not classify it as
  whitespace. 0.6.4 was silent on the byte-order mark; an earlier
  draft's non-deterministic `MAY skip` wording is gone.
- **§ 4 — key-segment trimming widens from ASCII-only to the same
  25-code-point set**, resolving a standing contradiction between § 3.3
  (which already permitted Unicode whitespace) and § 4 (which mandated
  ASCII-only specifically for keys). Two keys differing only by a
  non-ASCII whitespace code point at a trimmed edge, previously distinct
  under a literal reading of § 4, now collide as the same key (§ 5.5).
  The Rust reference implementation's actual trimming behaviour does not
  change — it has trimmed the full set since 0.6.0; only the normative
  text catches up to it, so this is breaking only for an implementation
  that followed the old § 4 text literally rather than matching the
  Rust core's actual behaviour.
- **§ 5.6 — the stripped multi-line string form (`( … )`) now strips
  trailing whitespace from each content line**, matching what it already
  did to each line's leading whitespace. Previously `( … )` preserved
  trailing whitespace byte-for-byte, identically to the verbatim form
  `(( … ))` — an editor's "trim trailing whitespace on save" could
  silently mutate string content with no visible signal. `(( … ))` is
  unaffected and remains fully verbatim on both edges. Breaking even
  for the Rust core, which previously preserved trailing whitespace on
  every line of a stripped-form block.
- **§ 5.9.0 (new) — representable Values are now normatively
  defined**, delimiting the domain over which the canonical writer's
  guarantees operate. A bare scalar document root, an Object pair with
  an empty name, a non-finite Float (NaN / ±Infinity), a String bearing
  a `CR` byte or a stripped-form collision, and any compound containing
  a non-representable Value at any depth are not representable, and a
  writer-conforming implementation MUST reject them with an error,
  emitting no partial output. Previously § 5.9 left the programmatic-only
  scalar-root, empty-key, and non-finite-Float cases undefined; for
  parser-produced `CR`-bearing and collision Strings, § 5.9.7 already had
  a permissive but ambiguous rule that allowed arbitrary or lossy output.
  The abstract programmatic Float carrier is now distinct from the
  declared finite parseable/canonical Float domain: it MUST distinguish
  NaN, +Infinity, and -Infinity so the
  three `NonFiniteFloat` fixtures can be supplied and rejected. Those
  sentinels are programmatic-only; `CR`-bearing and collision Strings are
  parser-produced cases covered separately by `parseable-unrepresentable/`.
  The Rust reference core already rejects scalar roots and `CR`-bearing
  Strings; closing the remaining gaps there is tracked separately.
- **A leading quote character in a key now opens a `<quoted-segment>`
  (§ 5.3.3, § 10.7).** A line whose first content — after § 4's
  key-segment trimming — begins with `"`, `'`, or `` ` `` no longer
  necessarily parses the way it did before quoted keys: a key that
  already began AND ended with the same quote character silently
  reads as a shorter key with the delimiters stripped (`"port": 1`
  now names `port`, not `"port"`); a leading quote character with no
  matching closer before end-of-line either falls through to an
  unaffected Array-root String item (root kind not yet decided) or
  raises the new `UnterminatedQuotedKey` (root kind already Object) —
  see § 5.3.3 for the exact, context-dependent rule and the `::`
  raw-marker escape hatch (§ 5.4 rule 1) available for an Array item
  needing an unambiguous leading quote character. No document whose
  keys avoid a leading `"` / `'` / `` ` `` is affected.
- **§ 3.7 / § 5.2 — any recognised escape in an inline scalar now forces
  String before keyword or numeric classification.** A body such as
  `1\.0`, which 0.6.x could decode and then type as Float, is String in
  0.7.0. This applies to every recognised escape, including `\.` / `\:`
  and the three quote escapes `\"` / `\'` / `` \` ``, even when the
  decoded byte has no structural role.
- **§ 5 (Float) / § 5.2 rule 14 — the Float domain now has a
  normative floor and an overflow fallback.** Implementations MUST
  support at least the range and precision of IEEE 754 binary64
  (MAY support a wider representation), and a float literal whose
  parsed value is non-finite in the implementation's Float domain
  (e.g. `1e9999` on binary64) falls through to String exactly as an
  out-of-range Integer does under rule 13 — so a 0.7.0-conformant
  parser MUST NOT ever produce a non-finite Float, making § 5.9.0's
  "no literal grammar of § 3.6 produces a non-finite Float" claim
  actually true. New fixtures `float/positive_overflow_to_string`,
  `float/negative_overflow_to_string`, and
  `float/underflow_to_zero` lock the boundary in; the last
  documents that underflow to `0.0` (finite) is an ordinary Float,
  not a String-fallback case.

>>>>> lang=ru
- **§ 3.3 — пробельные символы теперь фиксированный, исчерпывающе
  перечисленный набор из 25 кодовых точек (`MUST`), а не зависящее от
  реализации `MAY`.** Набор — свойство Unicode `White_Space` по
  состоянию на Unicode 6.3 (2013), зафиксированное явным списком, а не
  ссылкой на «текущую версию Unicode» — реализации MUST NOT
  делегировать встроенному в язык-хозяин примитиву Unicode-пробелов
  (проверено, что как минимум два мейнстрим-языка расходятся с этим
  списком в обе стороны). Не ломающее ни для одного выпущенного
  релиза 0.6.x Rust-ядра, которое уже распознавало полный набор;
  ломающее только для реализации, буквально воспринявшей старый
  `MAY` и оставшейся на ASCII-пробеле/табуляции.
- **§ 3.1 — обработка ведущего маркера порядка байтов теперь
  детерминирована.** Parser-conforming реализация MUST пропускать
  ровно один ведущий маркер порядка байтов (U+FEFF), если он
  является самой первой кодовой точкой документа, перед любым
  другим байтом; канонический писатель (§ 5.9) MUST NOT выводить
  ведущий маркер порядка байтов. Кодовая точка U+FEFF в любом
  другом месте документа — обычное содержимое: § 3.3 не относит её
  к пробельным символам. В 0.6.4 о маркере порядка байтов ничего не
  говорилось; недетерминированная формулировка `MAY skip` из
  черновика устранена.
- **§ 4 — обрезка сегмента ключа расширяется с ASCII-only на тот же
  набор из 25 кодовых точек**, устраняя действовавшее противоречие
  между § 3.3 (уже допускавшим Unicode-пробелы) и § 4 (требовавшим
  ASCII-only именно для ключей). Два ключа, различающиеся только
  не-ASCII пробельной кодовой точкой на обрезаемой границе, ранее
  различные при буквальном прочтении § 4, теперь сталкиваются как
  один и тот же ключ (§ 5.5). Фактическое поведение обрезки в
  эталонной Rust-реализации не меняется — она уже обрезала полный набор
  с версии 0.6.0; только нормативный текст догоняет код, так что это
  ломающее только для реализации, буквально следовавшей старому
  тексту § 4, а не фактическому поведению Rust-ядра.
- **§ 5.6 — stripped-форма многострочной строки (`( … )`) теперь
  обрезает замыкающие пробельные символы из каждой содержательной
  строки**, так же, как она уже поступала с ведущими пробелами каждой
  строки. Ранее `( … )` сохраняла замыкающие пробелы байт-в-байт, точно
  так же, как verbatim-форма `(( … ))` — команда редактора «убрать
  замыкающие пробелы при сохранении» могла незаметно испортить
  содержимое строки без видимого сигнала. `(( … ))` не затронута и
  остаётся полностью verbatim на обеих границах. Ломающее даже для
  Rust-ядра, которое ранее сохраняло замыкающие пробелы на каждой
  строке stripped-блока.
- **§ 5.9.0 (новый) — представимые Values теперь нормативно
  определены**, очерчивая домен, на котором действуют гарантии
  канонического эмиттера. Голый скалярный корень документа, пара
  Object с пустым именем, неконечный Float (NaN / ±Infinity), String
  с байтом `CR` или коллизией stripped-формы и любое составное Value,
  содержащее непредставимое Value на любой глубине, непредставимы, и
  writer-conforming реализация MUST отклонять их с ошибкой, не выпуская
  частичного вывода. Ранее § 5.9 оставлял не определёнными программно
  создаваемые случаи скалярного корня, пустого имени ключа и неконечного
  Float; для порождаемых парсером String с `CR` и коллизиями § 5.9.7 уже
  содержал разрешительное, но неоднозначное правило, допускавшее
  произвольный или lossy вывод. Абстрактный программный Float-носитель
  теперь отделён от заявленного конечного парсируемого/канонического
  домена Float. Носитель MUST различать NaN, +Infinity и -Infinity, чтобы три
  фикстуры `NonFiniteFloat` можно было подать и отклонить. Эти sentinel
  относятся только к программным случаям; String с `CR` и коллизиями
  порождаются парсером и отдельно покрываются
  `parseable-unrepresentable/`.
  Эталонное Rust-ядро уже отклоняет скалярные корни и String с
  `CR`; закрытие оставшихся там пробелов отслеживается отдельно.
- **Ведущий символ кавычки в ключе теперь открывает
  `<quoted-segment>` (§ 5.3.3, § 10.7).** Строка, чьё первое
  содержимое — после обрезки сегмента ключа из § 4 — начинается с
  `"`, `'` или `` ` ``, больше не обязательно парсится так же, как до
  введения quoted keys: ключ, уже начинавшийся И заканчивавшийся тем
  же символом кавычки, теперь молча читается как более короткий ключ
  с отброшенными разделителями (`"port": 1` теперь именует `port`, а
  не `"port"`); ведущий символ кавычки без парного закрывающего до
  конца строки либо проваливается в незатронутый элемент-String
  корневого Array (тип корня ещё не определён), либо порождает новую
  `UnterminatedQuotedKey` (тип корня уже Object) — точное,
  контекстно-зависимое правило и escape-лазейку в виде raw-маркера
  `::` (§ 5.4 правило 1) для элемента Array, которому нужен
  однозначный ведущий символ кавычки, см. в § 5.3.3. Ни один
  документ, чьи ключи избегают ведущего `"` / `'` / `` ` ``, не
  затронут.
- **§ 3.7 / § 5.2 — любой распознанный escape в inline-скаляре теперь
  фиксирует String до классификации ключевого слова или числа.** Тело
  вроде `1\.0`, которое в 0.6.x могло декодироваться и затем
  типизироваться как Float, в 0.7.0 является String. Это относится ко
  всем распознанным escape, включая `\.` / `\:` и три escape кавычек
  `\"` / `\'` / `` \` ``, даже когда декодированный байт не имеет
  структурной роли.
- **§ 5 (Float) / § 5.2 правило 14 — домен Float теперь имеет
  нормативный минимум и откат при переполнении.** Реализации MUST
  поддерживать как минимум диапазон и точность IEEE 754 binary64
  (MAY поддерживать более широкое представление), а float-литерал,
  чьё разобранное значение неконечно в домене Float реализации
  (например, `1e9999` на binary64), проваливается в String — в
  точности как выходящий за диапазон Integer в правиле 13 —
  поэтому 0.7.0-конформный парсер MUST NOT когда-либо порождать
  неконечный Float, что делает истинным утверждение § 5.9.0 о том,
  что «ни одна грамматика литералов § 3.6 не порождает неконечный
  Float». Новые фикстуры `float/positive_overflow_to_string`,
  `float/negative_overflow_to_string` и `float/underflow_to_zero`
  фиксируют границу; последняя документирует, что underflow в
  `0.0` (конечный) — обычный Float, а не случай отката к String.

>>>>> lang=zh
- **§ 3.3 —— 空白现在是固定的、穷举列出的 25 码点集合(`MUST`),
  而非依赖具体实现的 `MAY`。** 该集合是 Unicode 6.3(2013)版本时的
  `White_Space` 属性,以显式列表而非引用「当前版本的 Unicode」的方式
  固定下来 —— 实现 MUST NOT 委托给宿主语言内置的 Unicode 空白判定
  原语(已验证至少两种主流语言运行时在两个方向上均与此列表存在分歧)。
  相对每一个已发布的 0.6.x Rust 核心版本均非破坏性,因为它已经识别
  完整集合;仅对字面理解旧 `MAY` 并停留在 ASCII 空格/制表符的实现是
  破坏性的。
- **§ 3.1 —— 前导字节顺序标记的处理现在是确定性的。** 若字节顺序
  标记(U+FEFF)是文档的第一个码点、位于任何其他字节之前,
  parser-conforming 实现 MUST 跳过恰好一个这样的前导字节顺序标记;
  规范写入器(§ 5.9)MUST NOT 输出前导字节顺序标记。文档中任何其他
  位置的 U+FEFF 码点都是普通内容 —— § 3.3 未将其归类为空白。
  0.6.4 对字节顺序标记没有任何规定;早期草案中非确定性的
  `MAY skip` 措辞已移除。
- **§ 4 —— 键段修剪从仅 ASCII 扩展到同一 25 码点集合**,解决了
  § 3.3(此前已允许 Unicode 空白)与 § 4(此前专门要求键使用仅 ASCII)
  之间原本存在的矛盾。仅在被修剪边界处以非 ASCII 空白码点相区别的
  两个键,此前在字面理解 § 4 时是不同的键,现在会碰撞为同一个键
  (§ 5.5)。Rust 参考实现的实际修剪行为并未改变 —— 自 0.6.0
  起它就已经修剪完整集合;改变的只是规范文本追上了代码,因此这仅对
  字面遵循旧 § 4 文本、而非匹配 Rust 核心实际行为的实现是破坏性的。
- **§ 5.6 —— 多行字符串 stripped 形式(`( … )`)现在会逐行去除尾部
  空白**,这与它此前已对每行前导空白所做的处理一致。此前 `( … )` 会
  逐字节保留尾部空白,与 verbatim 形式 `(( … ))` 完全一致 —— 编辑器的
  「保存时去除尾部空白」功能可能因此在毫无提示的情况下悄悄改变字符串
  内容。`(( … ))` 不受影响,两侧边界仍完全 verbatim。即使对 Rust 核心
  也是破坏性的 —— 它此前在 stripped 块的每一行都保留尾部空白。
- **§ 5.9.0(新增)—— 可表示的 Value 现在被规范性定义**,划定了
  规范 writer 保证所作用的域。裸标量文档根、名为空的 Object 对、
  非有限 Float(NaN / ±Infinity)、含 `CR` 字节或 stripped 形式碰撞
  的 String,以及任意深度包含不可表示 Value 的任何复合值均不可表示,
  writer-conforming 实现 MUST 以错误拒绝它们,不输出任何部分内容。
  此前 § 5.9 未定义的仅是只能通过程序构造的标量根、空键名和非有限
  Float 情形;对于解析器产生的含 `CR` 或发生 collision 的 String,
  § 5.9.7 已有规定,但该规定过于宽松且含糊,允许任意或有损输出。
  现在抽象程序化 Float 载体已与声明的有限可解析/规范 Float 域区分开来。
  该载体 MUST 区分 NaN、+Infinity 与 -Infinity,以便三个
  `NonFiniteFloat` fixture 可以被提供并拒绝。这些 sentinel 仅属于
  程序化情形;含 `CR` 或 collision 的 String 由解析器产生,另由
  `parseable-unrepresentable/` 覆盖。Rust 参考核心已拒绝标量根与含
  `CR` 的 String;弥补其余缺口另行跟踪。
- **键中的前导引号字符现在会开启 `<quoted-segment>`
  (§ 5.3.3、§ 10.7)。** 某行的首个内容 —— 经 § 4 的键段修剪后 ——
  以 `"`、`'` 或 `` ` `` 开头时,不再必然按引入 quoted keys 之前的
  方式解析:一个原本以同一引号字符开头且结尾的键,现在会被静默
  读作去掉分隔符的更短的键(`"port": 1` 现在命名为 `port`,而非
  `"port"`);行末前没有匹配闭合符的前导引号字符,要么落入不受
  影响的 Array 根 String 项(根类型尚未确定),要么触发新的
  `UnterminatedQuotedKey`(根类型已是 Object)—— 具体的、依赖
  上下文的规则,以及为需要无歧义前导引号字符的 Array 项提供的
  `::` raw 标记逃生舱(§ 5.4 规则 1),见 § 5.3.3。任何键不以 `"` /
  `'` / `` ` `` 开头的文档均不受影响。
- **§ 3.7 / § 5.2 —— inline 标量中的任何已识别 escape 现在会在关键字
  或数字分类之前强制为 String。** 像 `1\.0` 这样的 body 在 0.6.x
  中可以先解码再定型为 Float,在 0.7.0 中则是 String。该规则适用于
  每一个已识别的 escape,包括 `\.` / `\:` 以及三个引号 escape（三者）
  `\"` / `\'` / `` \` ``,即使解码出的字节不具有结构性作用。
- **§ 5(Float)/ § 5.2 规则 14 —— Float 域现在有规范性下限与
  溢出回退。** 实现 MUST 至少支持 IEEE 754 binary64 的范围与
  精度(MAY 支持更宽表示),且在实现 Float 域内解析值非有限的
  浮点字面量(如 binary64 上的 `1e9999`)回退为 String —— 与
  规则 13 中超出范围的 Integer 完全一致 —— 因此 0.7.0 兼容解析器
  MUST NOT 永远产生非有限 Float,这使 § 5.9.0「§ 3.6 的任何
  字面量语法都不产生非有限 Float」的断言真正成立。新 fixture
  `float/positive_overflow_to_string`、`float/negative_overflow_to_string`
  与 `float/underflow_to_zero` 将边界锁定;最后一个 fixture 记录
  下溢到 `0.0`(有限)是普通 Float,而非回退为 String 的情形。

