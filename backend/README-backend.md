# Tax Lien Insight — Backend

Production backend for Tax Lien Insight. Node + TypeScript + PostgreSQL. Deployed
**independently** from the TanStack Start frontend (per spec: backend-only task, no
frontend changes).

## Architecture

```
INTERNET
   │
   ▼
Backend API (Hono, Node)  :8787
   ├── Auth (sessions, password hashing, email verification, reset, RBAC)
   ├── Jurisdictions / Properties
   ├── Auctions (state machine) + Registrations
   ├── Bid engine (concurrency-safe, fund holds, immutable ledger)
   ├── Funds / Ledger / Holds
   ├── USDC deposits (provider-verified, never trusts user tx hash)
   ├── Certificates (issue / verify / revoke / document)
   ├── Redemptions (rule-based calculation)
   ├── KYC (provider abstraction)
   ├── Documents (access scopes + signed URLs)
   ├── Notifications (event system + email)
   ├── Audit (immutable)
   └── Jobs (retryable, idempotent)
        │
        ▼
   PostgreSQL (+ object storage + email/kyc/blockchain providers)
```

## Layout

```
backend/
  src/
    app/            server entry (src/server.ts)
    shared/         constants, config, logger, errors, api envelope, types
    db/             pool, migrate, seed
    auth/           password, session, rbac, auth.service
    jurisdictions/  jurisdiction rules engine
    properties/     property records + search
    auctions/       auction/lot/registration state machines
    bids/           bid engine (placeBid with serializable tx + row locks)
    funds/          authoritative ledger/accounts/holds
    usdc/           deposit model + blockchain verification
    certificates/   issuance, verification, revocation, document
    redemptions/    calculation + state machine
    kyc/            KYC records + review
    documents/      access control + signed URLs
    notifications/   domain event dispatch
    audit/          immutable audit logging
    jobs/           job runner
    providers/      email, storage, blockchain, kyc (interfaces + stubs)
    api/            Hono app exposing /api/v1
  database/migrations/  0001..0004 SQL
  tests/                  vitest unit tests
```

## Setup

```bash
cp .env.example .env          # fill DATABASE_URL, AUTH_SECRET, etc.
npm install
npm run migrate              # applies SQL migrations (idempotent)
npm run seed                 # dev-only reference data + admin
npm run dev                  # starts API on :8787
npm test                     # unit tests
```

## Environment

`ENVIRONMENT=development | staging | production`. Development seeds demo reference
data and a dev admin. Production never seeds fake auctions.

Security-critical env: `AUTH_SECRET`, `ADMIN_BOOTSTRAP_SECRET` (one-time, then
disabled), `DATABASE_URL`, `RESEND_API_KEY`, `USDC_TOKEN_CONTRACT`,
`BLOCKCHAIN_RPC_URL`, `OBJECT_STORAGE_*`, `CRON_SECRET`.

## API namespace

The backend serves **`/api/v1`** with the envelope:

```json
{ "success": true, "data": {}, "meta": {}, "error": null }
```

Errors: `{ "success": false, "data": null, "error": { "code": "BID_TOO_LOW", "message": "...", "details": {} } }`.

The existing TanStack app proxies `/api/v1/*` to this service (see
`src/lib/backend-proxy.ts` and `src/routes/api/v1/*`). The frontend screens are
unchanged and not yet wired to the live API (next phase).

## Key invariants (enforced in code + DB)

- Ledger entries are **immutable** (DB trigger rejects UPDATE/DELETE).
- Available balance is derived from the ledger; never edited directly.
- Bidding uses `SERIALIZABLE` transactions with `SELECT ... FOR UPDATE` on the
  lot, auction, and funds account to prevent double-spend / conflicting winners.
- Idempotency keys on bids, deposits, payments, ledger entries.
- USDC deposits are verified **independently** via the blockchain provider
  (network, token contract, recipient, amount, confirmations). User-supplied tx
  hashes are never trusted.
- Admin authorization is server-side (role + permission + resource scope).
- Providers not configured fail safely (`NOT_CONFIGURED`) — no fake confirmations.

## Tests

`npm test` runs unit tests (redemption math, envelope/money, password). DB-backed
integration tests require a reachable PostgreSQL (set `DATABASE_URL`).

## Backward compatibility

The legacy in-browser mock (`src/integrations/firebase/mock.ts`) is left intact so
the existing frontend continues to function. The production backend does **not**
depend on it.
