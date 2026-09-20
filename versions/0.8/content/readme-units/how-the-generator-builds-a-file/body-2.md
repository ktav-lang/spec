>>>>> lang=en
```sh
node scripts/build_spec.mjs          # writes the 3 spec .md files and 3 content READMEs
node scripts/build_spec.mjs --check  # verifies byte-identity, writes nothing
node --test scripts/test_build_spec.mjs  # adversarial builder test suite (negative paths)
```

`--check` validates the inventory lock, regenerates all six files in memory,
and byte-compares them against the committed files. On success: exit 0 and
**completely silent**.
On divergence: exit 1 with a diagnostic naming the unit, language, and line
of the first differing byte. It writes nothing. Write mode stages all six
temporary outputs and recoverable backups before replacement. The transaction
journal is one atomically replaced, fsynced snapshot: it contains only a
validated nonce, digests, phase indexes, and the six known output identities;
all temporary and backup paths are derived by the builder. Before its durable
commit marker, recovery restores the exact old bytes; after it, recovery keeps
the exact new bytes and only finishes cleanup. A live cooperative lock rejects
a second writer. Linux and Windows owners derive their incarnation through
the same observable process-start path used by reclaimers; when that source
is unavailable, the owner records an unverified incarnation and a live PID
is never reclaimed. Lease expiry alone never reclaims a live matching
incarnation: only a proven-dead process or a provably different incarnation
may be reclaimed. Reclaim publishes a fresh owner-specific claim before
capturing the stale target and removes only artifacts for the exact old
owner. Release captures its alias in an owner-specific claim and restores a
replacement before removing any owner artifacts. Legacy fixed candidate,
claim, and lease files are cleaned only after conservative owner validation;
`--check` only reports them. If a pending journal, lock, or artifact exists,
`--check`
reports it and performs no recovery or cleanup. Directory fsync is unavailable
on some platforms (notably Windows), so those builds explicitly provide
file-only crash durability rather than claiming power-loss durability.

>>>>> lang=ru
`--check` проверяет inventory lock, регенерирует все шесть файлов в памяти и
побайтово сравнивает их с закоммиченными: три файла спецификации и три content
README. При успехе: код выхода 0 и **полная тишина**. При
расхождении: код выхода 1 с диагностикой, называющей юнит, язык и
строку первого различающегося байта. Ничего не пишет. В режиме записи сборщик
сначала подготавливает все шесть временных файлов и восстанавливаемые backup.
Журнал транзакции представляет собой один атомарно заменяемый и fsync-нутый
снимок: он содержит только проверенный nonce, digest-ы, индексы фаз и шесть
известных идентификаторов выходных файлов; все пути временных файлов и backup
выводятся самим сборщиком. До durable commit marker восстановление возвращает
точные старые байты; после него сохраняет точные новые байты и только
заканчивает очистку. Живой кооперативный lock отклоняет второго писателя.
В Linux и Windows владелец получает инкарнацию тем же наблюдаемым способом
старта процесса, который используют reclaimers; если источник недоступен,
записывается непроверенная инкарнация, и живой PID никогда не отбирается.
Истечение lease само по себе никогда не отбирает lock у живой совпадающей
инкарнации: reclaim разрешён только после доказанной смерти процесса или
доказанно другой инкарнации. Reclaim сначала атомарно публикует свежий claim
владельца, затем захватывает устаревший target и удаляет только артефакты
точной старой инкарнации. При release alias захватывается owner-specific claim;
замена сначала восстанавливается, и только потом удаляются артефакты владельца.
Старые фиксированные candidate, claim и lease очищаются только после строгой
проверки владельца; `--check` только сообщает о них. Если есть journal, lock
или служебный файл незавершённой транзакции, `--check`
сообщает об этом и не выполняет recovery или очистку. На некоторых платформах
(особенно Windows) fsync каталога недоступен, поэтому сборщик явно сообщает
режим file-only crash durability и не выдаёт его за защиту от потери питания.

`node --test scripts/test_build_spec.mjs` запускает adversarial-набор
тестов сборщика (негативные сценарии): он скармливает валидатору
специально искажённые деревья контента и проверяет, что каждое
closed-world-свойство, задокументированное в этом README, отвергается.

>>>>> lang=zh
`--check` 会验证 inventory lock,在内存中重新生成全部六个文件,并与
已提交的文件逐字节比较:三个规范文件与三个 content README。成功时:
退出码 0 且**完全静默**。出现分歧时:退出码 1,并给出诊断
信息,指出第一个不同字节所在的单元、语言和行。它不写任何文件。写入模式
会先准备全部六个临时文件和可恢复的备份。事务 journal 是一个原子替换
并 fsync 的快照,只包含经过验证的 nonce、digest、阶段索引和六个已知输出
标识;所有临时文件与备份路径都由构建器派生。durable commit marker 之前,
恢复会还原精确的旧字节;之后会保留精确的新字节并只完成清理。活跃的协作
lock 会拒绝第二个写入者。Linux 和 Windows 的所有者使用与回收者相同的可观测
进程启动路径来生成 incarnation;如果该来源不可用,构建器会记录未验证的
incarnation,并且永远不会回收仍然存活的 PID。仅凭 lease 过期绝不会回收仍在
运行且 incarnation 匹配的所有者;只有已证明进程退出或已证明 incarnation 不同
才可回收。回收会先原子发布新的所有者专属 claim,再捕获过期 target,并且只删除
精确旧所有者的 artifact。release 会先捕获 alias;如果发现 replacement,会先恢复
它,再删除所有者 artifact。旧的固定 candidate、claim 和 lease 只有在保守验证
所有者已不存在后才会清理;`--check` 只报告它们。如果存在未完成的 journal、lock 或事务文件,
`--check` 会报告它们并且不执行恢复或清理。某些平台(尤其 Windows)不支持
目录 fsync,因此构建器明确提供 file-only crash durability,不会虚假声称
它能防止断电导致的数据丢失。

`node --test scripts/test_build_spec.mjs` 运行构建器的对抗性测试套件
(负面路径):它向验证器提供故意损坏的内容树,断言本 README 中记载的每一条
closed-world 不变量都会被拒绝。

