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

## Rate limits

The application applies a broad per-IP ceiling plus separate per-client limits
for reads and writes. Defaults are 600 total requests, 300 reads, and 60 writes
per minute. Configure them with `API_GLOBAL_RATE_LIMIT_PER_MINUTE`,
`API_READ_RATE_LIMIT_PER_MINUTE`, and `API_WRITE_RATE_LIMIT_PER_MINUTE`.

Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset`. A limited request returns `429 rate_limit_exceeded` with a
`Retry-After` header. These application limits complement, rather than replace,
edge throttling at Cloudflare or the reverse proxy.

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
- Approval captures the hold as a posted debit; denial releases it and restores stock.
- The API cannot create users, assign roles, set balances, backdate entries, or impersonate staff.

External catalogs should use holds rather than the built-in rewards endpoints.

Responses use `{ "ok": true, "data": ... }` or a stable error object under
`error`. Every response has an `X-Request-Id`. Request logs store client,
route, status, duration, and idempotency key, but never the API secret or body.
