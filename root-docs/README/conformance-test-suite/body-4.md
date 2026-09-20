>>>>> lang=en
```sh
python scripts/validate_corpus.py versions/0.8/tests \
  --require-unrepresentable --require-boundary \
  --boundary-manifest-lock scripts/locks/boundary-fixtures.0.8.lock.json \
  --corpus-inventory-lock scripts/locks/corpus-inventory.0.8.lock.json
```

Each lock rejects additions, deletions, content drift, and unknown
top-level entries; it supplements rather than replaces semantic and schema
validation.

Passing every test in every category present in that version's suite
is a necessary release gate, but not by itself sufficient proof of
conformance: `boundary-fixtures.json` (0.7+) tells the shared corpus
to skip an exact byte/Value check on specific leaves for an
implementation whose numeric domain is wider than the minimum along
that leaf's axis — spec § 8.1 / § 8.2 define what such an
implementation's correctness there actually depends on (§ 5, § 5.9),
and the shared corpus does not verify it. An implementation that
declares a wider numeric domain MUST additionally verify its own
behaviour against § 5 / § 5.9 for the domain it claims, beyond what
this language-agnostic suite checks. Consume the
directory as a git submodule (or copy it).

>>>>> lang=ru
```sh
python scripts/validate_corpus.py versions/0.8/tests \
  --require-unrepresentable --require-boundary \
  --boundary-manifest-lock scripts/locks/boundary-fixtures.0.8.lock.json \
  --corpus-inventory-lock scripts/locks/corpus-inventory.0.8.lock.json
```

Каждый lock отвергает добавления, удаления, изменение содержимого и
неизвестные верхнеуровневые элементы; он дополняет, а не заменяет
semantic/schema checks.

Прохождение каждого теста из каждой категории, присутствующей в
наборе этой версии, — необходимое условие выпуска (release gate), но
само по себе недостаточное доказательство соответствия:
`boundary-fixtures.json` (0.7+) велит общему корпусу пропустить
точную побайтовую проверку Value на конкретных листах для реализации,
числовой домен которой шире минимума вдоль оси этого листа — спека
§ 8.1 / § 8.2 определяет, от чего на самом деле зависит корректность
такой реализации там (§ 5, § 5.9), и общий корпус это не проверяет.
Реализация, объявляющая более широкий числовой домен, MUST
дополнительно сверить собственное поведение с § 5 / § 5.9 для
заявленного домена — сверх того, что проверяет этот языконезависимый
набор тестов. Подключайте
директорию как git submodule (или копию).

>>>>> lang=zh
```sh
python scripts/validate_corpus.py versions/0.8/tests \
  --require-unrepresentable --require-boundary \
  --boundary-manifest-lock scripts/locks/boundary-fixtures.0.8.lock.json \
  --corpus-inventory-lock scripts/locks/corpus-inventory.0.8.lock.json
```

每个 lock 都会拒绝新增、删除、内容漂移与未知顶层条目;lock 补充而不取代
semantic/schema 检查。

通过该版本测试套件中每个存在类别的全部测试,是通过发布的必要门槛,
但本身并不足以证明合规:`boundary-fixtures.json`(0.7 起)告诉共享
语料库,对在该叶的轴上数值域宽于最小域的实现,跳过特定叶的精确
字节/Value 检查——spec § 8.1 / § 8.2 定义了这类实现在那里的正确性
实际取决于什么(§ 5、§ 5.9),而共享语料库并不验证它。声明更宽
数值域的实现 MUST 额外针对 § 5 / § 5.9 验证其自身在其所声称域上的
行为,超出本语言无关测试套件所检查的范围。可以把目录作为 git
submodule 引入(或直接拷贝)。

