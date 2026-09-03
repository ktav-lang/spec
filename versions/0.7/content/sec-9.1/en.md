
A maliciously crafted document can request unbounded resources:

- Deeply nested compounds (`{a: {a: {a: …}}}`) can cause
  stack overflow in recursive parsers.
- Extremely long scalar bodies can cause unbounded memory growth.
- Pathological multi-line strings or inline compounds can cause
  quadratic-time parsing in naive implementations.

Implementations SHOULD impose configurable limits on:

- Maximum nesting depth (both multi-line and inline compounds).
- Maximum input length and maximum scalar length.
- Maximum total Value count.

No specific limits are mandated; implementations choose values
appropriate to their target environment.

