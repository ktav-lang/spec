>>>>> lang=en
1. **Locality.** A line's meaning must not depend on a declaration
   elsewhere in the file, or in another file.
2. **One sentence.** The new rule must be statable in one sentence
   of the specification. If it takes a paragraph, it's probably
   actually two rules.
3. **No whitespace sensitivity** (other than line breaks). Ktav is
   line-based; column alignment never carries meaning.
4. **No magic types.** Unmarked text matching the §5.2 numeric-literal
   rules and falling within the implementation's numeric domain classifies
   as Integer or Float, including noncanonical accepted spellings; consumers
   own domain and schema semantics (via serde, schema, or code), and other
   text remains String.
5. **Explicit over clever.** `::` is verbose on purpose — the rare
   case where you need a literal should be the one that costs
   extra characters, not the common case.

A proposal that sacrifices any of these needs a correspondingly
large justification.

## Versioning, concretely

```
x . y . z
│   │   └── PATCH — editorial; parsers unaffected
│   └────── MINOR — additive; old docs still valid
└────────── MAJOR — breaking
```

- `versions/<x>.<y>/` is the source of truth for that version.
- `CHANGELOG.md` at the repo root tracks history across all versions.
- `versions.ktav` is the machine-readable index.
- Each release is marked with a git tag carrying the **full**
  `MAJOR.MINOR.PATCH`: `v0.1.0`, `v0.1.1`, `v0.2.0`, … The directory
  name (`versions/0.1/`) drops the PATCH component by convention — a
  PATCH bump updates the directory in place, not next to it — but the
  version string everywhere else stays three-part.

>>>>> lang=ru
1. **Локальность.** Смысл строки не должен зависеть от объявления в
   другом месте файла или в другом файле.
2. **Одно предложение.** Новое правило должно формулироваться одним
   предложением спецификации. Если требуется абзац — это, скорее
   всего, два правила.
3. **Нечувствительность к пробелам** (кроме переносов строк). Ktav
   строчно-ориентирован; выравнивание по колонкам никогда не несёт
   смысла.
4. **Никаких магических типов.** Непомеченный текст, соответствующий
   правилам числовых литералов § 5.2 и попадающий в числовой домен
   реализации, классифицируется как Integer или Float, включая принятые
   неканонические записи; семантика домена и схемы принадлежит потребителю
   (через serde, схему или код), а остальной текст остаётся String.
5. **Явное предпочтительнее хитрого.** `::` многословен намеренно —
   редкий случай, когда нужен литерал, должен быть и тем, что стоит
   лишних символов, а не повседневным случаем.

Предложение, жертвующее любым из этих принципов, требует
соразмерно большого обоснования.

## Версионирование, конкретно

```
x . y . z
│   │   └── PATCH — editorial; parsers unaffected
│   └────── MINOR — additive; old docs still valid
└────────── MAJOR — breaking
```

- `versions/<x>.<y>/` — источник истины для данной версии.
- `CHANGELOG.md` в корне репозитория отслеживает историю по всем версиям.
- `versions.ktav` — машиночитаемый индекс.
- Каждый релиз помечается git-тегом с **полной**
  `MAJOR.MINOR.PATCH`: `v0.1.0`, `v0.1.1`, `v0.2.0`, … Имя директории
  (`versions/0.1/`) опускает PATCH по соглашению — PATCH-бамп
  обновляет ту же директорию, а не создаёт соседнюю, — но везде в
  остальных местах version string остаётся трёхсоставной.

>>>>> lang=zh
1. **局部性。** 一行的语义不得依赖于文件别处或其它文件里的声明。
2. **一句话可表述。** 新规则必须能用规范里的一个句子陈述完。
   如果要写一整段，它多半其实是两条规则。
3. **对空白不敏感**（换行除外）。Ktav 是以行为单位的；列对齐
   永远不承担语义。
4. **拒绝类型魔法。** 未标记文本只要符合 § 5.2 的数值字面量规则并
   落在实现的数值域内，就分类为 Integer 或 Float，包括被接受的非规范
   拼写；域语义与 Schema 语义由消费方负责（通过 serde、Schema 或代码），
   其它文本保持为 String。
5. **显式优于机巧。** `::` 刻意冗长——那种需要字面形式的罕见场景
   才应当付出额外字符，而不是让常见场景付出代价。

若提案牺牲了其中任何一条，就需要与之相称的重大理由。

## 版本管理，具体来说

```
x . y . z
│   │   └── PATCH — editorial; parsers unaffected
│   └────── MINOR — additive; old docs still valid
└────────── MAJOR — breaking
```

- `versions/<x>.<y>/` 是该版本的权威来源。
- 仓库根目录的 `CHANGELOG.md` 贯穿记录全部版本的历史。
- `versions.ktav` 是机器可读索引。
- 每次发布都打 git 标签，采用**完整**的 `MAJOR.MINOR.PATCH`：
  `v0.1.0`、`v0.1.1`、`v0.2.0` ……目录名(`versions/0.1/`)按约定
  省略 PATCH 分量——PATCH 递进是就地更新同一目录，而非新建相邻目
  录——但其它所有地方的版本字符串仍保持三段式。

