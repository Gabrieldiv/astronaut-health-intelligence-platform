"""Assistant module: plain language questions about the crew, answered by a language model.

Demo only. The deterministic health engine (TypeScript, in the browser) stays the source of truth:
the web app sends a compact, grounded snapshot of its outputs and the model only explains it.
A cloud model is not acceptable on a real spacecraft (see docs/assistant-architecture.md); the
provider seam (`provider.AssistantProvider`) is where an onboard model would plug in with the same
HTTP contract.
"""
