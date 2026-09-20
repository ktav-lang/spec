>>>>> lang=en

`versions/0.8/tests/manifest.json` is a machine-readable inventory of
this section's conformance corpus: the closed set of category
directories under `versions/0.8/tests/`, the exact fixture count for
each one, and every fixture whose primary input is not decodable as
text and is instead given to the implementation under test as a raw
byte sequence. A conformance test runner for Ktav 0.7 MUST load
this file before enumerating any fixture, and MUST reject a manifest
whose `schema_version` field names a schema newer than the runner
implements rather than guess at its shape. Such a runner:

- Hard-fails, without executing any fixture, if a directory named
  in the manifest's `categories` map is absent from the tests
  directory being run, or if a directory present under the tests
  directory is not named in that map; an unknown category directory
  MUST NOT be silently skipped or silently accepted.
- Hard-fails if the number of fixtures present in a category differs
  from the `count` declared for it. This check is over the corpus
  checkout, not over what a given run executes: which categories an
  implementation exercises follows from the level it claims (§ 8.1,
  § 8.2), so a parser-only implementation legitimately does not
  execute the writer-only `unrepresentable/` fixtures — but every
  declared category MUST still be present and complete in the
  checkout. What this forbids is running against a stale checkout, a
  wrong path, or an earlier specification version's directory.
- For every fixture the manifest's `fixture_flags` marks with the
  `raw_bytes` flag, reads that fixture's primary input as a byte
  sequence and passes those exact bytes to the implementation under
  test; it MUST NOT first pass them through a text-decoding step
  whose behavior on invalid encoding is to substitute or drop
  bytes, and a decode failure or substitution occurring before the
  implementation under test receives the bytes does not satisfy
  this requirement.

>>>>> lang=ru

`versions/0.8/tests/manifest.json` — машиночитаемый реестр
конформанс-корпуса этого раздела: замкнутый набор директорий
категорий под `versions/0.8/tests/`, точное число фикстур для
каждой из них и каждая фикстура, чей первичный ввод не декодируется
как текст и вместо этого передаётся тестируемой реализации как
последовательность сырых байт. Раннер конформанс-тестов для Ktav
0.7 MUST загружать этот файл до перечисления любой фикстуры и
MUST отвергать манифест, чьё поле `schema_version` называет схему
новее той, которую реализует раннер, вместо того чтобы угадывать
её форму. Такой раннер:

- Прерывается отказом, не выполнив ни одной фикстуры, если
  директория, названная в `categories` манифеста, отсутствует в
  проверяемой директории тестов, либо если директория,
  присутствующая в директории тестов, не названа в этой карте;
  неизвестная директория категории MUST NOT молча пропускаться или
  молча приниматься.
- Прерывается отказом, если число фикстур, присутствующих в
  категории, отличается от `count`, заявленного для неё. Эта
  проверка относится к копии корпуса, а не к тому, что исполняет
  конкретный прогон: какие категории задействует реализация,
  следует из заявленного ею уровня (§ 8.1, § 8.2), поэтому
  парсер-конформная реализация законно не исполняет фикстуры
  `unrepresentable/`, относящиеся только к writer'у, — но каждая
  заявленная категория MUST при этом присутствовать в копии и быть
  полной. Запрещается здесь прогон против устаревшей копии,
  неверного пути или директории более ранней версии спецификации.
- Для каждой фикстуры, помеченной в `fixture_flags` манифеста
  флагом `raw_bytes`, читает первичный ввод этой фикстуры как
  последовательность байт и передаёт эти самые байты тестируемой
  реализации без изменений; она MUST NOT сначала пропускать их
  через шаг текстового декодирования, чьё поведение при
  недопустимой кодировке — заменять или отбрасывать байты, а сбой
  декодирования или замена, произошедшие до того, как тестируемая
  реализация получит байты, не удовлетворяют этому требованию.

>>>>> lang=zh

`versions/0.8/tests/manifest.json` 是本节 conformance 语料库的
机器可读清单:`versions/0.8/tests/` 下的封闭类别目录集合、每个
类别的精确 fixture 数量,以及每个其主输入不可解码为文本、而是作为
原始字节序列交给被测实现的 fixture。Ktav 0.7 的 conformance
测试运行器 MUST 在枚举任何 fixture 之前加载此文件,并且 MUST
拒绝其 `schema_version` 字段所指模式比运行器所实现的更新的清单,
而不是去猜测其形状。这样的运行器:

- 在未执行任何 fixture 的情况下直接失败,如果清单 `categories`
  中列出的某个目录在被运行的 tests 目录中不存在,或者 tests 目录
  下存在某个未在该映射中列出的目录;未知类别目录 MUST NOT 被悄悄
  跳过或悄悄接受。
- 如果某个类别中存在的 fixture 数量与为其声明的 `count` 不同,
  则失败。此检查针对的是语料库检出本身,而非某次运行实际执行的
  内容:实现执行哪些类别取决于它所声明的级别(§ 8.1、
  § 8.2),因此仅声明 parser 一致性的实现合法地不执行只属于
  writer 的 `unrepresentable/` fixture——但每个已声明的类别
  MUST 仍然存在于检出中且完整。此处禁止的是针对过期检出、错误
  路径或更早规范版本目录运行。
- 对于清单 `fixture_flags` 中标记了 `raw_bytes` 标志的每个
  fixture,按字节序列读取该 fixture 的主输入,并将这些确切字节
  原样交给被测实现;运行器 MUST NOT 先将其经过某个在遇到非法编码
  时会替换或丢弃字节的文本解码步骤,在被测实现收到这些字节之前
  发生的解码失败或替换均不满足本要求。

