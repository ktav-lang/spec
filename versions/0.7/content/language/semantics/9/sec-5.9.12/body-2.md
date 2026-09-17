>>>>> lang=en
- **Root Object, first-serialized key.** If the root is a non-empty
  Object and the first segment of its first-serialized key's decoded
  content begins with U+FEFF, § 5.9.10's form-selection rule forces
  quoted form for that segment (rule (c)). The segment is then
  written `"…"`, so byte offset 0 of the document is `"` (`0x22`),
  never the raw encoding of U+FEFF; the U+FEFF itself appears later
  in the byte stream, as ordinary quoted content, and needs no
  escape of its own (§ 5.3.3 permits U+FEFF raw inside a
  `<quoted-segment>` — it is neither a control byte nor DEL).
- **Root Array, first item.** If the root is a non-empty Array and
  its first item is a String whose canonical form would otherwise be
  the bare, one-line form of § 5.9.7 with content beginning with
  U+FEFF, the writer MUST instead use the raw-marker form
  (`:: <body>`, § 5.9.6) for that one item, even though § 5.9.7's
  ordinary bare-form conditions are otherwise satisfied. The
  raw-marker's own two bytes (`::`) occupy byte offset 0, so the
  item's content — including the leading U+FEFF, carried through
  unescaped since the raw-marker form applies no escape processing
  (§ 5.4 rule 1: "literal String, no type inference") — begins only
  after `:: `, never at byte offset 0.

Both cases are narrow, form-selection overrides: they change which
of two already-normative forms the writer must pick for the one
position (the root's first-serialized key, or its first item) whose
content the format ever places at byte offset 0. They do not add a
new non-representability case to § 5.9.0 — a key or first-item
String beginning with U+FEFF remains representable — and they do
not apply to any other key or item position, since no other
position's content can ever reach byte offset 0 of the document.

>>>>> lang=ru
- **Корневой Object, первый сериализуемый ключ.** Если корень —
  непустой Object, а первый сегмент его первого сериализуемого ключа
  начинается декодированным содержимым с U+FEFF, правило выбора формы
  § 5.9.10 вынуждает квотированную форму для этого сегмента
  (правило (c)). Сегмент тогда выводится как `"…"`, так что байтовое
  смещение 0 документа — это `"` (`0x22`), никогда не сырая кодировка
  U+FEFF; сам U+FEFF появляется позже в потоке байтов, как обычное
  квотированное содержимое, и не нуждается в собственном
  экранировании (§ 5.3.3 разрешает U+FEFF сырым внутри
  `<quoted-segment>` — это не управляющий байт и не DEL).
- **Корневой Array, первый элемент.** Если корень — непустой Array,
  а его первый элемент — String, чья каноническая форма иначе была
  бы голой однострочной формой § 5.9.7 с содержимым, начинающимся с
  U+FEFF, writer MUST вместо этого использовать форму raw-маркера
  (`:: <body>`, § 5.9.6) для этого одного элемента, даже если в
  остальном обычные условия голой формы § 5.9.7 выполнены. Два байта
  самого raw-маркера (`::`) занимают байтовое смещение 0, так что
  содержимое элемента — включая ведущий U+FEFF, перенесённый без
  экранирования, поскольку форма raw-маркера не применяет обработку
  escape (§ 5.4 правило 1: «литеральная String, без вывода типа») —
  начинается только после `:: `, никогда на байтовом смещении 0.

Оба случая — узкие переопределения выбора формы: они меняют, какую
из двух уже нормативных форм должен выбрать writer для единственной
позиции (первого сериализуемого ключа корня или его первого
элемента), чьё содержимое формат вообще когда-либо размещает на
байтовом смещении 0. Они не добавляют новый случай непредставимости
к § 5.9.0 — ключ или первый элемент String, начинающийся с U+FEFF,
остаётся представимым — и не применяются ни к какой другой позиции
ключа или элемента, поскольку содержимое никакой другой позиции
никогда не может достичь байтового смещения 0 документа.

>>>>> lang=zh
- **根 Object,首个序列化键。** 若根是非空 Object,且其首个
  序列化键的第一段解码内容以 U+FEFF 开头,§ 5.9.10 的形式选择
  规则会为该段强制使用 quoted 形式(规则 (c))。该段随后被写为
  `"…"`,因此文档的字节偏移 0 是 `"`(`0x22`),绝不是 U+FEFF 的
  原始编码;U+FEFF 本身出现在字节流的后面,作为普通的 quoted
  内容,且无需自身的 escape(§ 5.3.3 允许 U+FEFF 以裸字节形式
  出现在 `<quoted-segment>` 内部 —— 它既非控制字节,也不是 DEL)。
- **根 Array,首项。** 若根是非空 Array,且其首项是一个
  String,其规范形式原本会是 § 5.9.7 的裸单行形式,内容以
  U+FEFF 开头,writer MUST 改为对这一个元素使用 raw-marker
  形式(`:: <body>`,§ 5.9.6),即便 § 5.9.7 裸形式的其余条件都
  已满足。raw-marker 自身的两个字节(`::`)占据字节偏移 0,因此
  该项的内容 —— 包括未经 escape 原样携带的前导 U+FEFF,因为
  raw-marker 形式不做任何 escape 处理(§ 5.4 规则 1:「字面
  String,不做类型推断」)—— 只在 `:: ` 之后才开始,绝不在字节
  偏移 0。

这两种情形都是狭窄的、针对形式选择的例外:它们只改变 writer
必须为唯一会落在字节偏移 0 的位置(根的首个序列化键,或其首项)
在两种既有规范形式之间做出的选择。它们并未给 § 5.9.0 增加新的
不可表示情形 —— 以 U+FEFF 开头的键或首项 String 仍然是可表示的
—— 也不适用于任何其他键或项的位置,因为其他任何位置的内容都
绝不可能到达文档的字节偏移 0。

