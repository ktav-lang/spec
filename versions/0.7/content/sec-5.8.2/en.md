
An inline pair is `key: value` or `key:: value`. The semantics
follow § 5.3:

- Plain `:` dispatches the value through § 5.2 (type inference).
- Raw `::` interprets the value as a literal String (no inference,
  but **escape sequences ARE processed** per § 3.7).

Empty value (`{a:}`, `{a::}`) is an empty String — this is
deliberate: an explicitly empty pair value is semantically
meaningful (an "explicitly empty" field), and the form is concise.

