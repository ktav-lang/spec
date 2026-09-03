
- Added top-level Array as a recognised root kind (§ 5.0.1) — first-
  content-line array-item shapes (bare scalars, typed markers, lone
  `{` / `[`, multi-line openers) now produce a root-level Array
  instead of erroring. Strictly additive — every 0.1.0 document
  parses identically.

