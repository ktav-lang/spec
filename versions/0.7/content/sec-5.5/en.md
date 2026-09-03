
Two pairs in the same Object with the same effective key (after
dotted-key expansion, § 5.3.2) produce a `DuplicateKey` error
(§ 6.2). The error span SHOULD point at the offending key on the
duplicating line, not at the first occurrence. Implementations MAY
additionally include a span pointing at the first occurrence as
context.

