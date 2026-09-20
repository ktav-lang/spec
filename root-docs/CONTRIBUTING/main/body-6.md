>>>>> lang=en
Small, surgical PRs merge fast. Large "while I'm here" refactors of
the spec text get pushed back — break them up.

## Language policy

The `ktav-lang` organisation maintains every prose document in three
parallel languages: English (canonical), Russian, and Simplified
Chinese. File naming: `<name>.md` / `<name>.ru.md` / `<name>.zh.md`.
When you change any prose file, **update all three versions in the
same commit** — translation drift is the main failure mode of
multi-language docs. If you don't speak one of them, mark the
untouched files with `<!-- TODO: sync with <name>.md -->` at the top
and open the PR anyway; a maintainer or community contributor will
fill the gap before merge.

`versions/<v>/spec.md` is normatively English; RU / ZH translations
are informative (helpful to non-English readers, not a source of
authority). RFC 2119 keywords (MUST, SHOULD, MAY, …) stay in English
capitals across every translation — they are technical terms.

Full policy in the org-level
[`.github/AGENTS.md`](https://github.com/ktav-lang/.github/blob/main/AGENTS.md).

## License

By contributing, you agree that your contribution is dual-licensed
under **MIT OR Apache-2.0** at the user's option, same as the rest
of this repository.
>>>>> lang=ru
Маленькие хирургические PR мержатся быстро. Большие рефакторинги
текста спецификации «раз уж я здесь» отклоняются — разбивайте их.

## Языковая политика

Организация `ktav-lang` ведёт каждый prose-документ в трёх
параллельных языках: английский (канонический), русский и
упрощённый китайский. Именование файлов:
`<name>.md` / `<name>.ru.md` / `<name>.zh.md`. Изменяя любой
prose-файл, **обновляйте все три версии в одном коммите** —
расхождение переводов это главная болячка многоязычных документов.
Если вы не владеете одним из языков, пометьте нетронутые файлы
комментарием `<!-- TODO: sync with <name>.md -->` в начале и
откройте PR как есть; мейнтейнер или участник сообщества закроет
пробел до мерджа.

`versions/<v>/spec.md` нормативен на английском; переводы RU / ZH —
**информативные** (полезны не-англоязычным читателям, но не
авторитетный источник). Ключевые слова RFC 2119 (MUST, SHOULD, MAY,
…) сохраняются в английских капсах во всех переводах — это
технические термины.

Полная политика — в org-level
[`.github/AGENTS.md`](https://github.com/ktav-lang/.github/blob/main/AGENTS.md).

## Лицензия

Внося вклад, вы соглашаетесь, что ваш вклад лицензируется под
двойной лицензией **MIT OR Apache-2.0** по выбору пользователя, так же
как и остальная часть репозитория.
>>>>> lang=zh
细小、精确的 PR 合入很快。顺手而为的大规模规范文本重构会被退回
——请拆开。

## 语言政策

`ktav-lang` 组织下每一份 prose 文档都以三种平行语言维护：英语
（规范源）、俄语、简体中文。文件命名规则：
`<name>.md` / `<name>.ru.md` / `<name>.zh.md`。修改任何 prose 文件时，
**请在同一次提交中更新全部三种版本** —— 翻译漂移是多语言文档的头
号失败模式。如果您不通其中某一语种，请在未动过的版本顶部留下
`<!-- TODO: sync with <name>.md -->` 标记，然后照常提交 PR；维护
者或社区贡献者会在合入前补齐。

`versions/<v>/spec.md` 以英语版为规范源（normative）；俄语 / 中文
译本为**informative** —— 对非英语读者有帮助，但不作为权威依据。
RFC 2119 关键字（MUST、SHOULD、MAY ……）在所有译本中保持英语大写
—— 它们是技术术语，不是英文单词。

完整政策见组织级别的
[`.github/AGENTS.md`](https://github.com/ktav-lang/.github/blob/main/AGENTS.md)。

## 许可证

一旦贡献,您即同意您的贡献在双重许可 **MIT OR Apache-2.0** 下发布
(由用户选择),与本仓库的其余部分相同。
