
A common annoyance with the line-based form is that short objects
become verbose:

```
server: {
    host: localhost
    port: 8080
}
```

Four lines to say one thing. The inline form

```
server: {host: localhost, port: 8080}
```

is one line. The trade-off (commas as separators, mandatory closer
on the same line) is small enough that adding the option is a clear
win for compactness.

