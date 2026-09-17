>>>>> lang=en
   Detection is deliberately two-phase. Phase 1 (this rule) is a
   purely lexical, shape-only test: the prefix before the separator
   is NOT required to be a grammatically valid `<key>` (§ 4) at
   detection time, so a first line such as `a,b: 1` still selects
   an Object root. Because phase 1 reuses § 4's separator-scanning
   rule verbatim rather than a separate implementation, it inherits
   that rule's quote-awareness for free — a quoted-segment's
   content stays opaque to the scan even on this UNDECIDED first
   line, with no separate logic to keep in sync. Phase 2 is uniform
   validation: once the Object
   context exists, § 5.3 / § 5.3.1 validate the candidate's raw key
   prefix exactly as they validate every other pair line inside an
   established Object (§ 5.1 rule 8) — the same line then yields
   `InvalidKey` (§ 6.4), `EmptyKey` (§ 6.5), or `BadEscapeSequence`
   (§ 6.13) as appropriate. A glued plain-`:` line (e.g. `a,b:1`,
   no whitespace after the separator) is not a pair candidate and
   falls through to rule 7 (a bare-scalar array item); a glued `::`
   line is a pair candidate, and the glued form surfaces in
   phase 2 as `MissingSeparatorSpace` (§ 6.10).
7. Otherwise, if the first content line trimmed is recognised as an
   **array-item line** under § 5.4 other than rules 4 / 5 above
   (a bare scalar, a raw-marker item `:: …`, a multi-line string
   opener `(` / `((`, an empty-compound shortcut `{}` / `[]` /
   `()` / `(())`, or a closed inline compound that did not match
   rules 2 / 3) → root is an **Array** with this line as its first
   item.
8. Otherwise (a bare close `}` / `]` on the first content line, or
   otherwise unclassifiable) → `UnbalancedBracket` error (§ 6.1).

>>>>> lang=ru
   Детекция нарочно двухфазная. Фаза 1 (это правило) — чисто
   лексический тест на форму: префикс перед разделителем НЕ
   обязан быть грамматически валидным `<key>` (§ 4) в момент
   детекции, поэтому первая строка вида `a,b: 1` всё равно
   выбирает корень Object. Фаза 2 — единообразная валидация:
   после установления контекста Object § 5.3 / § 5.3.1 проверяют
   сырой префикс ключа кандидата в точности так же, как любую
   другую pair line внутри уже установленного Object (§ 5.1
   правило 8), — та же строка затем даёт `InvalidKey` (§ 6.4),
   `EmptyKey` (§ 6.5) или `BadEscapeSequence` (§ 6.13), в
   зависимости от случая. Склеенная строка с обычным `:`
   (например `a,b:1`, без пробела после разделителя) кандидатом
   в pair не является и проваливается в правило 7 (голый
   скалярный элемент массива); склеенная строка с `::` кандидатом
   является, а склейка проявляется в фазе 2 как
   `MissingSeparatorSpace` (§ 6.10).
7. Иначе, если первая содержательная строка после trim распознана
   как **array-item line** по § 5.4 (за исключением правил 4 / 5
   выше) — голый скаляр, raw-маркер `:: …`, многострочный опенер
   `(` / `((`, пустые-составные сокращения `{}` / `[]` / `()` /
   `(())`, или замкнутое inline-составное, не подошедшее под
   правила 2 / 3 — → корень — **Array** с этой строкой как
   первым элементом.
8. Иначе (голый закрывающий `}` / `]` на первой содержательной
   строке или иначе неклассифицируемая строка) — ошибка
   `UnbalancedBracket` (§ 6.1).

>>>>> lang=zh
   判定刻意分两阶段。阶段 1(本规则)是纯词法的形状测试:
   分隔符前的前缀在判定时不必是合法 `<key>`(§ 4),因此首行
   `a,b: 1` 仍选出 Object 根。阶段 2 是统一校验:Object 上下文
   确立后,§ 5.3 / § 5.3.1 对该候选原始键前缀的校验,与既有
   Object 内任何 pair 行(§ 5.1 规则 8)完全一致 —— 同一行随后
   按情形产生 `InvalidKey`(§ 6.4)、`EmptyKey`(§ 6.5)或
   `BadEscapeSequence`(§ 6.13)。粘连的普通 `:` 行(如
   `a,b:1`,分隔符后无空白)不是 pair 候选,落入规则 7(裸标量
   数组项);粘连的 `::` 行是 pair 候选,粘连在阶段 2 表现为
   `MissingSeparatorSpace`(§ 6.10)。
7. 否则,若首条内容行经 trim 后被识别为 **array-item line**
   (§ 5.4,除规则 4 / 5 已处理者外)—— 裸标量、`:: …`、多行字符串
   开启符 `(` / `((`、空复合简写 `{}` / `[]` / `()` / `(())`,或
   未匹配规则 2 / 3 的闭合 inline 复合 —— → 根为 **Array**,此
   行为首项。
8. 否则(裸闭合 `}` / `]` 或不可分类)→ `UnbalancedBracket` 错误
   (§ 6.1)。

