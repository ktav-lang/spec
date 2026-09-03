
A document whose first (and only) content line is a closed inline
compound:

```
{host: localhost, port: 8080, tags: [a, b, c]}
```

The root Value IS that inline Object — no enclosing braces are
needed at the document level; the inline form is the document.
Same applies to a top-level inline Array:

```
[1, 2, 3, 4]
```

