# Myntix API v1

## Public organisation discovery

Landing pages can retrieve the active organisation directory from the fixed
platform API hostname without knowing an organisation hostname or using an API
key:

```http
GET https://api.myntix.com/api/public/organisations
```

```json
{
  "organisations": [
    {
      "name": "Example School",
      "slug": "example",
      "loginUrl": "https://example.myntix.com/"
    }
  ]
}
```

The endpoint supports public cross-origin GET requests and returns only the
organisation name, slug, and sign-in URL. Inactive organisations are excluded.
`api.myntix.com` must route to the same Myntix app service; this route reads the
platform database directly and does not perform tenant resolution.

The API is tenant-scoped by hostname at:

```text
https://{organisation}.myntix.com/api/v1
```

## Authentication

Send `Authorization: Bearer myntix_live_...` with every request. Keys are
shown once, stored only as hashes, revocable, optionally expirable, and limited
by scopes. Invalid credentials return `401`; insufficient scope returns `403`.

Every `POST` also requires a unique `Idempotency-Key`. Repeating the same
request returns its original response. Reusing a key for different input returns
`409 idempotency_conflict`.

Use `Content-Type: application/json` for non-empty bodies. Bodies are limited
to 16 KiB, including streamed requests; compressed bodies are not accepted.
Idempotency keys are 1-128 printable ASCII characters without spaces.
Amounts may be JSON integers or decimal digit strings, from 1 to 1,000,000;
booleans, arrays, objects and other numeric coercions are rejected.

Authenticated responses are private and non-cacheable. Keys must stay on the
integrating server, never in a public browser bundle or URL. Only the public
organisation directory permits cross-origin browser access.

## Rate limits

The application applies a broad per-IP ceiling plus separate per-client limits
for reads and writes. Defaults are 600 total requests, 300 reads, and 60 writes
per minute. Configure them with `API_GLOBAL_RATE_LIMIT_PER_MINUTE`,
`API_READ_RATE_LIMIT_PER_MINUTE`, and `API_WRITE_RATE_LIMIT_PER_MINUTE`.

Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset`. A limited request returns `429 rate_limit_exceeded` with a
`Retry-After` header. These application limits complement, rather than replace,
edge throttling at Cloudflare or the reverse proxy.

Per-client buckets also include the organisation, so restored/copied client IDs
do not share a budget across tenants. Limits are currently process-local memory:
restarts reset them, and multiple app instances need a shared limiter or edge
rules. Trusted proxies must overwrite forwarded IP headers; keep the app port
private. Unauthenticated attempts are throttled but do not create database
request-log rows. Public discovery is limited to 120 origin requests per minute
per IP (cached edge responses do not reach this limit).

## Routes

```text
GET  /students/resolve?email={email}             accounts:read
GET  /accounts/{accountId}                      accounts:read
GET  /accounts/{accountId}/balance              accounts:read
GET  /accounts/{accountId}/ledger               ledger:read
POST /accounts/{accountId}/credits              ledger:credit
POST /accounts/{accountId}/debits               ledger:debit
POST /accounts/{accountId}/holds                holds:write
GET  /holds/{holdId}                            holds:read
POST /holds/{holdId}/capture                    holds:write
POST /holds/{holdId}/release                    holds:write
POST /ledger/entries/{entryId}/reverse          ledger:debit
GET  /rewards                                   rewards:read
POST /purchases                                 purchases:write
GET  /purchases/{purchaseId}                    purchases:read
POST /purchases/{purchaseId}/approve            purchases:write
POST /purchases/{purchaseId}/deny               purchases:write
```

Ledger history accepts `limit` from 1 to 100 and an optional ISO `before`
cursor. Balances distinguish `ledgerBalance`, `heldAmount`, and
`availableBalance`.

Credit and debit bodies contain a positive whole-number `amount` and a
`description`. Hold bodies use the same fields and may include an ISO
`expiresAt`. Purchase bodies contain `accountId` and `rewardId`. A reversal
body contains `reason`.

## Guarantees

- Debits and holds cannot exceed available balance.
- Credits and positive reversals cannot exceed the organisation balance cap.
- Corrections append reversal entries; the API never edits or deletes ledger history.
- A client can only access holds, purchases, and reversible entries that it created.
- Purchase creation reserves stock and funds atomically.
- Purchase reservations cannot be captured or released through generic hold
  routes; use purchase approval/denial to keep funds, stock and status aligned.
- Organisation transaction caps apply to credits, debits, hold creation/capture
  and purchase creation/approval. Exact corrections remain exempt from the
  transaction cap; positive corrections still respect the balance cap.
- Reversing a debit additionally requires `ledger:credit`, preventing a
  debit-only client from issuing credits via the correction endpoint.
- Approval captures the hold as a posted debit; denial releases it and restores stock.
- The API cannot create users, assign roles, set balances, backdate entries, or impersonate staff.

External catalogs should use holds rather than the built-in rewards endpoints.

Responses use `{ "ok": true, "data": ... }` or a stable error object under
`error`. Every response has an `X-Request-Id`. Request logs store client,
route, status, duration, and idempotency key, but never the API secret or body.

Each write and its idempotency response share one database transaction.
Failure to save the replay response rolls back the ledger/purchase mutation.
Concurrent retries wait for the same reservation; lock conflicts return a
retryable `409 request_in_progress`. Retry with the original Idempotency-Key,
not a new key. The replay window remains 24 hours; keys reused after expiry can
execute again. Incomplete reservations from older releases retain their existing
24-hour expiry.

Internal job endpoints require their configured Bearer secret, have per-source
and per-job limits, and return generic failure messages. Detailed failures remain
in server logs. None of these controls replace infrastructure protection or an
independent security assessment.
