
The Value model of § 5 is broader than the set of Values for which a
canonical Ktav serialisation exists: a Value constructed
programmatically, outside the parser, may fall outside it. A Value V
is **representable** — the property § 5.9's canonical-serialisation
contract requires — if and only if both of the following hold:

- V is an Object or an Array. A bare scalar root is not
  representable: § 5.0.1 establishes the root kind from the first
  content line, and no scalar has a canonical form that could serve
  as a document root.
- V is **node-representable**.

**Node-representability** — the recursive, per-kind check applied to
every Value in a non-root position (an Object pair's value, an
Array's item). A Value is **node-representable** if and only if, by
kind:

- **Object:** every pair's name is a non-empty string, and every
  pair's value is node-representable. An empty name is not
  node-representable: § 4 requires every key segment to contain at
  least one `<key-token>`, so no document can produce such a pair
  (the parse-side counterpart is the `EmptyKey` error, § 6.5).
- **Array:** every item of V is node-representable.
- **Float:** V is finite — neither NaN nor ±Infinity. No literal
  grammar of § 3.6 produces a non-finite Float (an overflowing
  literal falls through to String at § 5.2 rule 14), and § 5.9.8
  defines no canonical textual form for one.
- **String:** V is node-representable under § 5.9.7's rules (no
  `CR` byte, and none of the pathological multi-line collision
  cases defined there).
- **Null, Bool, Integer**, and every other String: always
  node-representable.

Node-representability recurses through every Object pair's value and
every Array item, at any depth, without re-imposing the root-kind
constraint: a String or Integer nested inside a representable Object
is node-representable on its own terms — it is never itself required
to be an Object or an Array. Only the outermost Value handed to a
writer is subject to the root-kind constraint.

A writer-conforming implementation MUST reject a non-representable
Value with an error, per § 5.9 — and MUST do so without emitting any
part of it: partial output followed by a failure is not a permitted
behaviour.

Representability is deliberately narrower than parseability.
Parsing never yields a scalar root (§ 5.0.1) or an empty pair name
(§ 4, § 6.5), and no literal grammar yields a non-finite Float
(§ 3.6) — but it can yield a String that § 5.9.7 excludes, since a
`CR` byte enters a String through an inline-compound `\r` escape or
the generic `\uXXXX` escape naming code point 000D (§ 3.7, § 3.7.1).
Such a document is accepted by a parser-conforming
implementation, while serialising the resulting Value MUST fail —
which is why non-representable Values sit outside the round-trip
identity of § 8.3.

Each non-representability case above has a stable **reason code**,
normative regardless of how any given implementation's API surfaces
it. `versions/0.7/tests/unrepresentable/` fixtures (§ 8.2) name the
expected reason code for a given Value; a writer-conforming
implementation's own error type MAY take any shape (exception class,
error enum, tagged union, ...) — only the code names and the case
each identifies are normative, not the API through which a caller
observes them:

| Reason code                   | Case                                                                                          |
|--------------------------------|-------------------------------------------------------------------------------------------------|
| `ScalarRoot`                  | The document root is not an Object or an Array.                                                 |
| `EmptyKeyName`                | An Object pair's name is the empty string.                                                      |
| `NonFiniteFloat`              | A Float is NaN or ±Infinity.                                                                     |
| `CRByte`                      | A String contains a `CR` byte (§ 5.9.7).                                                         |
| `BothFormsRequired`           | A String's multi-line body needs both forms — a segment trimming to `))` and a segment trimming to `)` (§ 5.9.7). |
| `TrailingWhitespaceCollision` | A segment trims to `))` and some content line has trailing whitespace (§ 5.9.7).                 |
| `LeadingWhitespaceCollision`  | A segment trims to `))` and every non-blank segment shares leading whitespace at the same position (§ 5.9.7). |

When a Value violates more than one case at once, the checks are
ordered: the document-root constraint (Object-or-Array) is evaluated
first, and only if it passes is node-representability checked
recursively. If node-representability then finds more than one
applicable violation — whether on the Value itself, on an Object
pair's key, or among descendants (e.g. a String satisfying two
collision rules at once, an Object with both an empty key and a
separately non-representable child, or two Array items each
non-representable for a different reason) — an implementation MAY
report any one of the applicable reason codes: this specification
does not mandate a specific traversal order or a deterministic
"first" violation — that question belongs to the still-open
structured-error contract (rust#12).

Of these, `NonFiniteFloat` has no fixture under the ordinary
`<name>.json` schema every other reason code uses: JSON, the format
that schema is written in, has no portable literal for NaN or
Infinity (implementations that accept the bare tokens `NaN` /
`Infinity` as an extension disagree on round-tripping them). To still
pin this case with a machine-checkable fixture,
`versions/0.7/tests/unrepresentable/non_finite_float.json` uses one
normative escape hatch inside its `"value"` field: a Float that would
otherwise have no JSON encoding is written as the tagged object
`{"$float": "NaN"}`, `{"$float": "Infinity"}`, or
`{"$float": "-Infinity"}` in place of an ordinary JSON number. The key
name `$float` is reserved within `unrepresentable/` fixture `"value"`
trees: an ordinary JSON Object that happens to have exactly this shape
(a single key literally named `$float`) can never occur there for any
other reason — no other reason code, and no fixture under `valid/`,
ever needs this sentinel, since every other Value § 5 defines has a
direct JSON mapping. A future `unrepresentable/` fixture MUST NOT use
a literal Object with a `$float` key for any purpose other than this
sentinel.

