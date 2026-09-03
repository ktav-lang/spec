
A dotted-key path that passes through a name already holding a
non-Object leaf, or a plain (non-dotted) pair whose key names an
Object already established by an earlier dotted-key pair, is a
`KeyPathConflict` error (§ 5.3.2). Reopening a synthetic-prefix
sub-Object — via a later dotted-key pair sharing the same prefix,
after any number of intervening sibling pairs — is NOT a conflict;
see § 5.3.2's merge semantics.

