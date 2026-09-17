export default {
  en: `Examples: the key \`a.b\` (a literal dot) is emitted as \`"a.b"\` (not
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
  ru: `Примеры: ключ \`a.b\` (литеральная точка) выводится как \`"a.b"\` (не
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
  zh: `例:键 \`a.b\`(字面点)输出为 \`"a.b"\`(而非 \`a\\.b\`——一旦另需
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
