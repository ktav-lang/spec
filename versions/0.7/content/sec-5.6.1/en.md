
Inside a stripped block, a content line whose trimmed text is
exactly `)` would be indistinguishable from the closer; the writer
MUST switch to verbatim form when such a line is required. The
analogous rule applies to `))` inside a verbatim block.

Parser behaviour is symmetric: if a content line inside a stripped
block trims to exactly `)`, the parser MUST close the block at
that line. The same applies to a line that trims to exactly `))`
inside a verbatim block. The writer-side rule above MUST therefore
be observed by any emitter: producing such content requires
switching the multi-line string to the other form, since the
parser has no way to distinguish a lone-`)` content line from the
stripped-form closer.

