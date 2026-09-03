
```
literal_true:: true
literal_zero:: 0
literal_hex:: 0xFF
literal_path:: /usr/local/bin
literal_comma_only:: just,a,comma,separated,plain,string
```

Все значения выше — Strings, а не их выведенные типы. Raw-маркер
безусловно заставляет диспетчеризовать тело как String. Обратите
внимание: в этой многострочной raw-форме обработка
escape-последовательностей **не** выполняется — `\n` внутри тела —
это два символа, `\` и `n`.

