# Changelog — atom.js

## v0.5.0
Auto-generation of REQ/REP request handlers from the interface lexicon. Services no longer need to define `requestHandlers` manually — the framework wraps existing component functions automatically on `advertiseAndActivate()`. Explicit `requestHandlers` in config still take precedence when defined.

## v0.4.0
Introduced `Atom.Request` — a proper ZMQ REQ/REP transport layer (`port+2`) to replace the PUB/SUB sender-reply pattern for request-response use cases. The old pattern created a new socket per call and never closed it, causing file descriptor leaks under load. `_interface.request(targetService, operation, data, opts)` is the new API. Default timeout 10s.

## v0.3.0
Separated atom-cli into its own repo. Nucleus connection retry with exponential backoff added to `atom.interface` (30 attempts, 6s apart). Fixed connection retry continuing after a connection was already established.

## v0.2.0
Connection resilience overhaul. Services now discover each other regardless of startup order via `AgentActivated:::Atom.Interface:::${name}` Diont events. `_bindConnections`, `initConnections`, `filterConnectionsConfigByAgent` introduced. `readystate` implementation on nucleus.

## v0.1.0
Initial working framework. `Atom.Nucleus` (Redis + Diont), `Atom.Interface` (ZMQ PUB/SUB), `Atom.Signal` (peer-to-peer subscriptions), `Atom.Lexeme` (schema-enforced message normalization). Basic pub/sub, sender/reply, CLI foundations.
