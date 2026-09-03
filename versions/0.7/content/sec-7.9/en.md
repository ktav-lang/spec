
```
example\.com: prod
a\:b: v
deep.example\.com: 1
path\\to: x
```

`example\.com` is the single key `example.com` — the `\.` is a literal
dot, not a path separator. `a\:b` is the key `a:b` (literal colon).
`deep.example\.com` nests under `deep` with the leaf key `example.com`
(the first dot splits; the escaped dot does not). `path\\to` is the key
`path\to` — a literal backslash, written `\\`. Since 0.7.0, the
canonical writer (§ 5.9.10) prefers **quoted** form over
bare-with-escape whenever a structural byte (here `.` or `:`) would
otherwise need escaping, so the first three canonicalise to:

```
"example.com": prod
"a:b": v
deep: {
    "example.com": 1
}
```

`path\\to: x` is unchanged in canonical form — escaping only a literal
backslash does not switch the form (§ 10.7), since quoting would not
remove the need for that escape. All four still round-trip (§ 8.3);
only the byte shape of the first three changed from 0.6.x's
bare-with-escape output.

