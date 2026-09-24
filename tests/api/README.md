# API integration tests

These tests call a running Myntix tenant through the same public API used by an
external integration. No API keys or tenant data are stored in the repository.

## Required setup

Create a test-only API key with all scopes, start the application, then set:

```powershell
$env:API_TEST_BASE_URL="http://localhost:3000/api/v1"
$env:API_TEST_KEY="myntix_live_..."
$env:API_TEST_STUDENT_EMAIL="student@example.edu"
npm run test:api
```

`API_TEST_ACCOUNT_ID` can replace `API_TEST_STUDENT_EMAIL`. Optional coverage:

```powershell
$env:API_TEST_READ_ONLY_KEY="myntix_live_..."
$env:API_TEST_REWARD_ID="00000000-0000-4000-8000-000000000000"
$env:API_TEST_ENABLE_WRITES="true"
$env:API_TEST_RUN_RATE_LIMIT="true"
$env:API_TEST_EXPECTED_READ_LIMIT="300"
```

Write tests are disabled by default. When enabled, ledger tests add and reverse
one credit, hold tests create and release one hold, and purchase tests request
and deny one reward. Ledger history remains append-only, so use a non-production
tenant. The rate-limit exhaustion test is also opt-in because it intentionally
blocks that test API client for the remainder of the one-minute window.

The default suite covers authentication, response metadata, account resolution,
balances, ledger pagination, validation, idempotency, holds, rewards, purchases,
scope enforcement and rate-limit behaviour.
