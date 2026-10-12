# Domain Boundaries

The main app is a modular monolith. Domain folders are the future extraction
points if the app later moves to separate services.

Rules:

- `auth` owns users, sessions, passwords, SSO, and server-side action guards.
- `ledger` owns accounts, ledger entries, balances, presets, and transaction workflows.
- `groups` owns student groups and group membership imports.
- `timetable` owns teacher/group scheduling.
- `rewards` owns reward items, reward requests, and approval decisions.
- `analytics` owns dashboards, reporting, goals, and exports.
- `organisation` owns school/profile/settings data.
- `audit` owns audit and error log records.
- `integrations` owns external API clients, API contracts, idempotency, and directory-sync integrations such as TASS.
- `notifications` owns in-app notification records, notification preferences, digest delivery, and email notification workflows.
- `operations` owns tenant backup scheduling, backup requests, and restore workflows. Host/container monitoring remains outside the tenant domain layer.
- `users` owns user-specific preferences and transaction preset preferences; identity and credentials remain under `auth`.

Dependency direction should stay one-way where possible:

- `auth` should not depend on ledger, rewards, groups, or analytics.
- `ledger` should not depend on rewards or analytics.
- `rewards` may call ledger.
- `notifications` owns the delivery workflow; feature domains may publish notification events but should not send email directly.
- `analytics` may read from ledger, groups, users, rewards, and audit.
- UI components should call actions, not repositories or database code directly.

The old `src/services/*` files are compatibility exports for the domain services.
Server action files stay in `src/lib/actions/*` because Next.js requires `"use server"`
modules to directly export async functions. Those actions should stay thin and call
domain services for the actual work.
