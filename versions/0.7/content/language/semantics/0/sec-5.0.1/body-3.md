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
根类型由首条内容行**固定**。随后的各行根据所选类型按 § 5.1 分发:

- 在 top-level **Array** 内,每一条非空白、非注释行都是
  array-item line(§ 5.4)。看似 pair 的行(如 `host: localhost`)
  按 § 5.4 规则 9 只是裸标量 String;不存在隐式重新归类回 pair 的
  机制。请使用原始标记形式,使含冒号的标量无歧义。
- 在 top-level **Object** 内,每一行都是 pair 行(§ 5.3)。
  不含 `:` 的裸标量是 `MissingSeparator` 错误。

