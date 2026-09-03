
The following identity MUST hold for every **representable** Value V
(§ 5.9.0) producible by a parser-conforming implementation, when
emitted and re-parsed by writer- and parser-conforming
implementations of the same Value domain:

```
emit_canonical(parse(emit_canonical(V))) == emit_canonical(V)
```

That is: parsing canonical output and re-emitting it produces
byte-identical output. The canonical form is a fixed point of the
parse-emit cycle. A non-representable Value is outside the scope of
this identity: § 5.9's writer-conforming requirement is to reject
such a Value with an error rather than serialise it (§ 5.9.0).

