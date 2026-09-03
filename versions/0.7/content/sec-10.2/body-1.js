export default {
  en: `
A common annoyance with the line-based form is that short objects
become verbose:

\`\`\`
server: {
    host: localhost
    port: 8080
}
\`\`\`

Four lines to say one thing. The inline form

\`\`\`
server: {host: localhost, port: 8080}
\`\`\`

is one line. The trade-off (commas as separators, mandatory closer
on the same line) is small enough that adding the option is a clear
win for compactness.

`,
  ru: `
Частое неудобство построчной формы: короткие объекты становятся
многословными:

\`\`\`
server: {
    host: localhost
    port: 8080
}
\`\`\`

Четыре строки ради одной мысли. Inline-форма

\`\`\`
server: {host: localhost, port: 8080}
\`\`\`

занимает одну строку. Компромисс (запятые как разделители,
обязательный закрыватель на той же строке) достаточно невелик, так
что добавление этой возможности — явный выигрыш в компактности.

`,
  zh: `
行式形式的一个常见烦恼是短对象变得冗长:

\`\`\`
server: {
    host: localhost
    port: 8080
}
\`\`\`

四行只说了一件事。inline 形式

\`\`\`
server: {host: localhost, port: 8080}
\`\`\`

只有一行。其代价(以逗号作分隔符、闭合符必须同行出现)足够小,增加这一选项对
紧凑性是明显的胜利。

`,
};
