export default {
  en: `
Implementations MAY claim parser-only, writer-only, or both
levels of conformance. An implementation MAY support older Ktav
format versions in parallel (e.g. 0.1.1) under a configuration
flag, but MUST treat a document as 0.7.0 by default unless the
caller explicitly selects a different target version — this
specification defines no in-document version marker.

A claim at either level is supported only by a corpus run performed
by a conformance test runner that satisfies § 8.5.

`,
  ru: `
Реализации MAY заявлять только parser-, только writer- или оба
уровня соответствия. Реализация MAY параллельно поддерживать
старые версии формата Ktav (например, 0.1.1) под флагом
конфигурации, но MUST по умолчанию трактовать документ как 0.7.0,
если вызывающая сторона явно не выбрала другую целевую версию, —
данная спецификация не определяет никакого маркера версии внутри
самого документа.

Заявка на любом из уровней подтверждается только прогоном корпуса,
выполненным раннером конформанс-тестов, который удовлетворяет § 8.5.

`,
  zh: `
实现 MAY 仅声明 parser-、仅声明 writer- 或两者兼有。实现 MAY
在配置开关下并行支持旧版本 Ktav 格式(如 0.1.1),但除非调用方
显式选择其他目标版本,MUST 默认将文档视为 0.7.0 —— 本规范不
定义任何文档内版本标记。

任一级别的声明仅由满足 § 8.5 的 conformance 测试运行器所执行的
语料库运行来支持。

`,
};
