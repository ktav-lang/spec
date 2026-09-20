>>>>> lang=en
```
.
├── README.md              this file
├── versions.ktav          machine-readable index of released/stable versions
├── CHANGELOG.md           summary across versions
├── CONTRIBUTING.md        how to propose changes
├── LICENSE-MIT            MIT License
├── LICENSE-APACHE         Apache License 2.0
├── scripts/
│   ├── validate_corpus.py                 structural validation of the conformance corpus
│   ├── test_validate_corpus.py            unit tests for validate_corpus.py
│   ├── check_translation_parity.py        EN/RU/ZH translation-parity checker
│   ├── test_check_translation_parity.py   unit tests for check_translation_parity.py
│   ├── build_spec.mjs                     (0.7+) generates spec.md/.ru.md/.zh.md from content/
│   ├── test_build_spec.mjs                (0.7+) adversarial unit tests for build_spec.mjs
│   ├── archive/                           (0.7+) archived one-time content-unit bootstrap
│   │   └── extract_content_units.py         see content/README.md; refuses to overwrite content/
│   └── locks/                             versioned corpus, boundary, and section-inventory lock files
│       ├── corpus-inventory.0.8.lock.json  (0.8 corpus paths + SHA-256)
│       ├── boundary-fixtures.0.8.lock.json (0.8 boundary leaves: fixture, path, class)
│       ├── section-inventory.0.8.lock.json (0.8 ordered sections + structural metadata)
│       ├── corpus-inventory.0.7.lock.json  (0.7 corpus paths + SHA-256; 0.7 still in the tree)
│       ├── boundary-fixtures.0.7.lock.json (0.7 boundary leaves: fixture, path, class)
│       └── section-inventory.0.7.lock.json (0.7 ordered sections + structural metadata)
├── .github/workflows/     CI: content/ byte-identity check (0.7+), corpus validation,
│                          translation-parity check, and all three unit test suites
└── versions/
    └── <version>/
        ├── spec.md        the specification document
        ├── spec.ru.md     Russian translation of the spec
        ├── spec.zh.md     Chinese translation of the spec
        ├── content/       (0.7+) per-section source of truth — see content/README.md;
        │                  spec.md/.ru.md/.zh.md are generated from this, never hand-edited
        └── tests/         language-agnostic conformance suite
            ├── valid/
            ├── invalid/
            ├── unrepresentable/   (0.7+)
            ├── parseable-unrepresentable/ (0.7+; pairs, no canonical output)
            └── boundary-fixtures.json   (0.7+) leaf-level numeric-
                        domain exemptions, not a fixture category
```

>>>>> lang=ru
```
.
├── README.md              this file
├── versions.ktav          machine-readable index of released/stable versions
├── CHANGELOG.md           summary across versions
├── CONTRIBUTING.md        how to propose changes
├── LICENSE-MIT            MIT License
├── LICENSE-APACHE         Apache License 2.0
├── scripts/
│   ├── validate_corpus.py                 структурная валидация корпуса соответствия
│   ├── test_validate_corpus.py            модульные тесты для validate_corpus.py
│   ├── check_translation_parity.py        проверка паритета переводов EN/RU/ZH
│   ├── test_check_translation_parity.py   модульные тесты для check_translation_parity.py
│   ├── build_spec.mjs                     (0.7+) генерирует spec.md/.ru.md/.zh.md из content/
│   ├── test_build_spec.mjs                (0.7+) модульные тесты для build_spec.mjs (adversarial/негативные сценарии)
│   ├── archive/                           (0.7+) архивированный одноразовый бутстрап юнитов контента
│   │   └── extract_content_units.py         см. content/README.md; отказывается перезаписывать content/
│   └── locks/                             versioned lock-файлы корпуса, boundary и inventory секций
│       ├── corpus-inventory.0.8.lock.json  (0.8: пути корпуса + SHA-256)
│       ├── boundary-fixtures.0.8.lock.json (0.8: boundary-листья — fixture, path, class)
│       ├── section-inventory.0.8.lock.json (0.8: порядок секций + структурные поля)
│       ├── corpus-inventory.0.7.lock.json  (0.7: пути корпуса + SHA-256; 0.7 всё ещё в дереве)
│       ├── boundary-fixtures.0.7.lock.json (0.7: boundary-листья — fixture, path, class)
│       └── section-inventory.0.7.lock.json (0.7: порядок секций + структурные поля)
├── .github/workflows/     CI: проверка байт-идентичности content/ (0.7+), валидация корпуса,
│                          проверка паритета переводов и все три набора модульных тестов
└── versions/
    └── <version>/
        ├── spec.md        the specification document
        ├── spec.ru.md     Russian translation of the spec
        ├── spec.zh.md     Chinese translation of the spec
        ├── content/       (0.7+) источник истины по секциям — см. content/README.md;
        │                  spec.md/.ru.md/.zh.md генерируются из него, вручную не редактируются
        └── tests/         language-agnostic conformance suite
            ├── valid/
            ├── invalid/
            ├── unrepresentable/   (0.7+)
            ├── parseable-unrepresentable/ (0.7+; пары без canonical output)
            └── boundary-fixtures.json   (0.7+) leaf-level numeric-
                        domain exemptions, not a fixture category
```

>>>>> lang=zh
```
.
├── README.md              this file
├── versions.ktav          machine-readable index of released/stable versions
├── CHANGELOG.md           summary across versions
├── CONTRIBUTING.md        how to propose changes
├── LICENSE-MIT            MIT License
├── LICENSE-APACHE         Apache License 2.0
├── scripts/
│   ├── validate_corpus.py                 一致性语料库的结构校验
│   ├── test_validate_corpus.py            validate_corpus.py 的单元测试
│   ├── check_translation_parity.py        EN/RU/ZH 翻译对等性检查工具
│   ├── test_check_translation_parity.py   check_translation_parity.py 的单元测试
│   ├── build_spec.mjs                     (0.7+) 从 content/ 生成 spec.md/.ru.md/.zh.md
│   ├── test_build_spec.mjs                (0.7+) build_spec.mjs 的对抗性单元测试(负面路径)
│   ├── archive/                           (0.7+) 已归档的一次性内容单元引导脚本
│   │   └── extract_content_units.py         见 content/README.md;拒绝覆盖已存在的 content/
│   └── locks/                             语料库、boundary 与 section inventory 的 versioned 锁文件
│       ├── corpus-inventory.0.8.lock.json  (0.8: 语料库路径 + SHA-256)
│       ├── boundary-fixtures.0.8.lock.json (0.8: 边界叶节点 — fixture、path、class)
│       ├── section-inventory.0.8.lock.json (0.8: 有序节列表 + 结构元数据)
│       ├── corpus-inventory.0.7.lock.json  (0.7: 语料库路径 + SHA-256;0.7 仍在工作树中)
│       ├── boundary-fixtures.0.7.lock.json (0.7: 边界叶节点 — fixture、path、class)
│       └── section-inventory.0.7.lock.json (0.7: 有序节列表 + 结构元数据)
├── .github/workflows/     CI:content/ 逐字节一致性检查(0.7 起)、语料库校验、
│                          翻译对等性检查,以及全部三套单元测试
└── versions/
    └── <version>/
        ├── spec.md        the specification document
        ├── spec.ru.md     Russian translation of the spec
        ├── spec.zh.md     Chinese translation of the spec
        ├── content/       (0.7+) 逐节来源——见 content/README.md;
        │                  spec.md/.ru.md/.zh.md 由 content/ 生成,切勿手动编辑
        └── tests/         language-agnostic conformance suite
            ├── valid/
            ├── invalid/
            ├── unrepresentable/   (0.7+)
            ├── parseable-unrepresentable/ (0.7+; pair,无 canonical output)
            └── boundary-fixtures.json   (0.7+) leaf-level numeric-
                        domain exemptions, not a fixture category
```

