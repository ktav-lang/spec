
A **writer-conforming** implementation MUST emit a *canonical* Ktav
serialisation of any **representable** Value — § 5.9.0 defines which
Values are representable, subsuming the narrow set of String values
that § 5.9.7 excludes. The canonical form is byte-deterministic: for
any given representable Value, every writer-conforming
implementation MUST produce the same byte sequence. A
writer-conforming implementation MUST reject a non-representable
Value with an error, rather than serialise it — this requirement
applies uniformly to every non-representability rule of § 5.9.0,
not only to § 5.9.7's String exclusions: permitting an
implementation-chosen or lossy encoding for the same
non-representable Value would itself violate the byte-determinism
guarantee just stated.

