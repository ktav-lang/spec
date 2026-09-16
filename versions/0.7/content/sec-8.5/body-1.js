export default {
  en: `
\`versions/0.7/tests/manifest.json\` is a machine-readable inventory of
this section's conformance corpus: the closed set of category
directories under \`versions/0.7/tests/\`, the exact fixture count for
each one, and every fixture whose primary input is not decodable as
text and is instead given to the implementation under test as a raw
byte sequence. A conformance test runner for Ktav 0.7.0 MUST load
this file before enumerating any fixture, and MUST reject a manifest
whose \`schema_version\` field names a schema newer than the runner
implements rather than guess at its shape.

- Hard-fails, without executing any fixture, if a directory named
  in the manifest's \`categories\` map is absent from the tests
  directory being run, or if a directory present under the tests
  directory is not named in that map; an unknown category directory
  MUST NOT be silently skipped or silently accepted.
- Hard-fails if the number of fixtures actually present in a
  category differs from the \`count\` declared for it — the corpus
  MUST run at its full declared size, not at whatever smaller size
  a stale checkout, a wrong path, or an earlier spec version's
  directory happens to contain.
- For every fixture the manifest's \`fixture_flags\` marks with the
  \`raw_bytes\` flag, reads that fixture's primary input as a byte
  sequence and passes those exact bytes to the implementation under
  test; it MUST NOT first pass them through a text-decoding step
  whose behavior on invalid encoding is to substitute or drop
  bytes, and a decode failure or substitution occurring before the
  implementation under test receives the bytes does not satisfy
  this requirement.

These checks bound the corpus itself — which fixtures exist, how
many, and how their bytes reach the implementation under test — and
are independent of, and do not replace, § 8.1's and § 8.2's
per-fixture acceptance, rejection, and equivalence requirements.

`,
  ru: `
\`versions/0.7/tests/manifest.json\` — машиночитаемый реестр
конформанс-корпуса этого раздела: замкнутый набор директорий
категорий под \`versions/0.7/tests/\`, точное число фикстур для
каждой из них и каждая фикстура, чей первичный ввод не декодируется
как текст и вместо этого передаётся тестируемой реализации как
последовательность сырых байт. Раннер конформанс-тестов для Ktav
0.7.0 MUST загружать этот файл до перечисления любой фикстуры и
MUST отвергать манифест, чьё поле \`schema_version\` называет схему
новее той, которую реализует раннер, вместо того чтобы угадывать
её форму.

- Прерывается отказом, не выполнив ни одной фикстуры, если
  директория, названная в \`categories\` манифеста, отсутствует в
  проверяемой директории тестов, либо если директория,
  присутствующая в директории тестов, не названа в этой карте;
  неизвестная директория категории MUST NOT молча пропускаться или
  молча приниматься.
- Прерывается отказом, если число фикстур, фактически
  присутствующих в категории, отличается от \`count\`, заявленного
  для неё, — корпус MUST выполняться в полном заявленном объёме, а
  не в том меньшем объёме, который случайно содержит устаревшая
  копия, неверный путь или директория более ранней версии
  спецификации.
- Для каждой фикстуры, помеченной в \`fixture_flags\` манифеста
  флагом \`raw_bytes\`, читает первичный ввод этой фикстуры как
  последовательность байт и передаёт эти самые байты тестируемой
  реализации без изменений; она MUST NOT сначала пропускать их
  через шаг текстового декодирования, чьё поведение при
  недопустимой кодировке — заменять или отбрасывать байты, а сбой
  декодирования или замена, произошедшие до того, как тестируемая
  реализация получит байты, не удовлетворяют этому требованию.

Эти проверки касаются самого корпуса — какие фикстуры существуют,
сколько их и как их байты попадают к тестируемой реализации — и не
зависят от требований § 8.1 и § 8.2 к приёму, отклонению и
эквивалентности на уровне отдельной фикстуры, а также не заменяют
их.

`,
  zh: `
\`versions/0.7/tests/manifest.json\` 是本节 conformance 语料库的
机器可读清单:\`versions/0.7/tests/\` 下的封闭类别目录集合、每个
类别的精确 fixture 数量,以及每个其主输入不可解码为文本、而是作为
原始字节序列交给被测实现的 fixture。Ktav 0.7.0 的 conformance
测试运行器 MUST 在枚举任何 fixture 之前加载此文件,并且 MUST
拒绝其 \`schema_version\` 字段所指模式比运行器所实现的更新的清单,
而不是去猜测其形状。

- 在未执行任何 fixture 的情况下直接失败,如果清单 \`categories\`
  中列出的某个目录在被运行的 tests 目录中不存在,或者 tests 目录
  下存在某个未在该映射中列出的目录;未知类别目录 MUST NOT 被悄悄
  跳过或悄悄接受。
- 如果某个类别中实际存在的 fixture 数量与为其声明的 \`count\`
  不同,则失败——语料库 MUST 以其声明的完整规模运行,而不是以
  过期检出、错误路径或更早规范版本目录碰巧包含的较小规模运行。
- 对于清单 \`fixture_flags\` 中标记了 \`raw_bytes\` 标志的每个
  fixture,按字节序列读取该 fixture 的主输入,并将这些确切字节
  原样交给被测实现;运行器 MUST NOT 先将其经过某个在遇到非法编码
  时会替换或丢弃字节的文本解码步骤,在被测实现收到这些字节之前
  发生的解码失败或替换均不满足本要求。

这些检查约束的是语料库本身——存在哪些 fixture、有多少个,以及
它们的字节如何到达被测实现——独立于且不能替代 § 8.1 与 § 8.2
中关于逐个 fixture 的接受、拒绝与等价性要求。

`,
};
