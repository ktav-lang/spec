
Implementations MAY claim parser-only, writer-only, or both
levels of conformance. An implementation MAY support older Ktav
format versions in parallel (e.g. 0.1.1) under a configuration
flag, but MUST treat a document as 0.7.0 by default unless the
caller explicitly selects a different target version — this
specification defines no in-document version marker.

