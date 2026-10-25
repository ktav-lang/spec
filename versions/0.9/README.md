# Ktav 0.9 — draft diagnostics corpus

This directory prepares version 0.9.0; it is not a published release. The language and existing fixture categories inherit version 0.8. New diagnostic fixtures live only in this version. Version 0.8 remains unchanged.

## Source locations

Source parse errors carry a 1-based line and a half-open byte span in the original input. BOM bytes and LF, lone CR and CRLF terminators are never removed or normalized before calculating offsets. CRLF counts as one terminator. A position inside a terminator belongs to the line that terminator closes.

For `UnclosedCompound`, the diagnostic anchors the innermost unclosed opener: the line is the opener's line and the span runs from the opener to EOF. For multiline values, the opener starts at `(`, not at the pair's key.

For `InvalidUtf8`, validation precedes grammar processing. The span starts at the first invalid sequence, covers at least one original byte and stays within the input. Implementations may cover different widths of the malformed subsequence. Raw-byte fixtures must never pass through lossy decoding. I/O failures and writer rejections do not receive invented source locations.

## Fixture schema

The existing `invalid/<name>.ktav` / `<name>.json` pair remains. An oracle may additionally contain `expected_location`, with exactly one of these shapes:

```json
{"line": 2, "start": 12, "end": 27}
```

```json
{"line": 3, "start": 33, "minimum_end": 34}
```

`line` is positive; the remaining values are nonnegative byte offsets. `end` requires an exact endpoint; `minimum_end` requires a covering endpoint at least that large and no larger than the input. The two endpoint fields are mutually exclusive. A runner must check every declared location, not merely the error category. All fixtures under `invalid/diagnostics09/` require this location oracle.

The manifest counts every new fixture and flags malformed UTF-8 inputs as `raw_bytes`. The Rust owned parser, strict parser, thin event parser and formatter exercise valid-UTF-8 fixtures; `from_file` exercises malformed byte inputs. Direct error accessors and public envelope conversion must agree. Native C ABI source operations use the same location contract.

The human-readable message is not a cross-language coordinate oracle. The existing ten-field error-envelope schema is unchanged; this migration makes its source coordinates complete and consistent with the direct Rust API.
