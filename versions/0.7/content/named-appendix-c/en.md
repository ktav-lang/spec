
One breaking change must be addressed when migrating a 0.5.0
document to 0.6.0:

1. **Backslash in keys is now an escape lead.** In 0.5.0, a
   backslash byte `\` inside a key was a literal character. In
   0.6.0, `\` starts an escape sequence. If any key contains a
   literal backslash, replace `\` with `\\`. This is rare in
   practice — backslashes in key names are uncommon in
   configuration files.

Additionally, keys can now contain literal dots and colons via
`\.` and `\:`, enabling key names like `example.com` or `a:b`
that were previously impossible to express.

