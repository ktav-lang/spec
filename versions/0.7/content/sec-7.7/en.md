
```
literal_true:: true
literal_zero:: 0
literal_hex:: 0xFF
literal_path:: /usr/local/bin
literal_comma_only:: just,a,comma,separated,plain,string
```

All values above are Strings, not their inferred types. The raw
marker forces String dispatch unconditionally. Note that escape
processing does **not** apply in this multi-line raw form — `\n`
inside the body is the two characters `\` and `n`.

