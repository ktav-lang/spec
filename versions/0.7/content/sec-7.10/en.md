
```
"cache:redis": enabled
'say "hi": now': ok
```

`"cache:redis"` writes the key `cache:redis` directly in quoted form —
equivalent to the bare-escaped `cache\:redis` of § 7.9, but without a
backslash sitting inline (§ 10.7). `'say "hi": now'` writes the key
`say "hi": now`: the single-quote delimiter needs no escape for the
embedded `"` characters (self-escaping, § 10.7) or the embedded `:`
(only the segment's own delimiter is structural inside a
`<quoted-segment>`, § 3.7). Both keys contain a `:`, so bare form
would need `\:` and the canonical writer (§ 5.9.10) keeps them quoted;
the canonical delimiter is always `"`, so the second key's embedded
double quotes are re-escaped as `\"` in canonical output:

```
"cache:redis": enabled
"say \"hi\": now": ok
```

