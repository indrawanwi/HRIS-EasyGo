# Architecture Decision Records (ADR) — HRIS EasyGo

## ADR-001: Cloud Database — Neon PostgreSQL
- **Decision**: Adopt Neon serverless PostgreSQL via pooled connection over TLS (`@neon/sdk` and `pg`).
- **Rationale**: Provides instant branching, autoscaling, serverless cold starts, and point-in-time recovery.
- **Connection**: Managed via `.env.local` using standard `DATABASE_URL`.

## ADR-002: Modular Clean Architecture & Domain Engines
- **Decision**: Keep business domain calculations isolated from HTTP transport in dedicated pure JavaScript modules:
  - `src/features/payroll/engine/calculator.js`
  - `src/features/requests/rules/leave.js`
  - `src/features/requests/rules/overtime.js`
  - `src/features/approvals/engine.js`
- **Rationale**: Facilitates exhaustive automated unit testing without needing active network or database fixtures.

## ADR-003: Strict Separation of Duties & Anti-Self-Approval
- **Decision**: No user can approve their own request regardless of role. Requests submitted by managers route to their designated director or designated surrogate. Four distinct individuals are enforced for payroll lifecycle (Penyiap, Pemeriksa, Penyetuju, Pembayar).
- **Rationale**: Internal audit compliance and SOX-like control over financial and organizational transactions.

## ADR-004: Versioned REST API (`/api/v1`)
- **Decision**: Provide clean JSON API endpoints under `/api/v1` for both web dashboard consumption and mobile client / simulator operations.
- **Rationale**: Eliminates client-server coupling and guarantees uniform authorization checks.
