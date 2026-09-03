
Integer literals that exceed the implementation's supported integer
range (which MUST be at least i64; see § 5.2 rule 13) MUST fall
back to String per § 5.2 rule 13 — they MUST NOT silently wrap or
raise an exception at parse time. The consumer of the Value is
responsible for choosing how to handle the textual form.

