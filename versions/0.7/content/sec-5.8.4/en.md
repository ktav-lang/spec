
An inline value may itself be an inline compound:

```
{outer: {inner: {leaf: 1}}}
[ [1, 2], [3, 4] ]
{users: [ {name: alice}, {name: bob} ]}
```

Nesting depth is implementation-defined. The specification sets no
normative depth limit. Portable documents SHOULD avoid pathologically
deep nesting; implementations MAY enforce a depth limit and reject
overly-deep input.

