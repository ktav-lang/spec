export default {
  en: `
\`\`\`
## Sample configuration

## --- Network ---
host: localhost
port: 8080

## Authentication settings
auth: {
    enabled: true
    realm: production
}
\`\`\`

Each \`##\`-prefixed line is a comment and ignored. A \`#\` byte that
is not at the start of a \`##\` pair is just a character.

`,
  ru: `
\`\`\`
## Sample configuration

## --- Network ---
host: localhost
port: 8080

## Authentication settings
auth: {
    enabled: true
    realm: production
}
\`\`\`

Каждая строка, начинающаяся с \`##\`, — комментарий и игнорируется.
Байт \`#\`, не стоящий в начале пары \`##\`, — это просто обычный символ.

`,
  zh: `
\`\`\`
## Sample configuration

## --- Network ---
host: localhost
port: 8080

## Authentication settings
auth: {
    enabled: true
    realm: production
}
\`\`\`

每个以 \`##\` 为前缀的行都是注释,会被忽略。不在 \`##\` 对开头位置的
\`#\` 字节只是一个普通字符。

`,
};
