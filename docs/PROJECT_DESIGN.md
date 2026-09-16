# Myntix Ledger Product and Design Specification

## Purpose of this document

This is the living product, UX, architecture, and engineering specification for Myntix Ledger. It is written primarily for AI coding agents, but it should also be useful to human contributors.

Read this document before making product, interface, database, security, or architecture changes. It describes the intended system and the constraints that should remain true as implementation details evolve.

This document governs product intent. The repository remains the source of truth for current implementation details. When the two disagree:

1. Do not silently change behaviour to match this document.
2. Inspect the relevant implementation and recent Git history.
3. Preserve existing behaviour unless the task explicitly authorises a change.
4. Update this document when an approved product decision changes.

## Product summary

Myntix Ledger is a multi-tenant internal currency ledger for schools and similar organisations. It lets an organisation operate a controlled, non-monetary currency used to recognise positive participation, apply deductions, and support rewards.

The primary product loop is:

1. Staff quickly select one or more students or a group.
2. Staff add or remove a whole-number amount and record a reason.
3. The ledger records the movement with its actor, subject, time, source, and status.
4. Students see their own balance, history, progress, and available rewards.
5. Administrators manage people, groups, timetables, settings, integrations, and oversight.

The app should feel like a simple, trustworthy bank account without implying that its currency is legal tender or real money.

## Product goals

- Make issuing or removing currency fast enough to use during a class.
- Give students an understandable, rewarding view of their own account.
- Provide administrators with reliable controls, auditability, and exports.
- Support thousands of students without overwhelming screens or slow client-side workflows.
- Allow each organisation to use its own name, logo, currency name, users, and data.
- Support both shared-schema and dedicated-database tenancy behind one application.
- Keep domain boundaries clear enough that a domain could later become a service.
- Provide secure external ledger APIs without moving ledger rules into client applications.
- Remain simple enough for a small team to operate and debug.

## Non-goals

- This is not a real bank, payment processor, accounting package, or store of legal tender.
- It does not allow student-to-student transfers.
- It does not allow arbitrary negative student balances.
- It does not automatically create local users after SSO authentication.
- It is not currently a microservice system. It is a modular monolith.
- Custom roles, behavioural intervention, investments, interest, and term deposits are not current core features.
- Optional engagement modules should not be embedded into the core ledger without an explicit product decision.

## Product principles

### The ledger is authoritative

Balances are derived from ledger entries. Do not add a mutable `balance` column as an independent source of truth. Every movement must be explainable from ledger records.

### Fast for staff, private for students

Staff workflows prioritise speed, search, bulk selection, current classes, and clear feedback. Students only see their own balance, transactions, goals, groups, and requests. Cohort metrics and other students' records are never exposed to students.

### Audit rather than erase

Historical financial and administrative records should be retained. Users and groups are normally disabled or archived rather than deleted. Posted ledger entries are voided through reversal entries rather than removed or edited out of history.

### Configuration over hard-coding

Organisation name, logo, currency name, balance cap, quick amounts, quick reasons, SSO settings, API clients, and branding configuration must come from their defined settings or configuration source. Do not introduce hard-coded references to a particular school or currency.

### Progressive complexity

Build the smallest complete workflow first. Add abstractions only when they reduce clear duplication, enforce an invariant, or match an established domain boundary.

## Users and permissions

The current system roles are `student`, `teacher`, and `admin`. The database display name for `teacher` is Staff, but the code key remains `teacher`.

| Capability | Student | Teacher/staff | Admin |
| --- | --- | --- | --- |
| View own balance and ledger | Yes | Not applicable | Not applicable |
| View all student balances and ledger entries | No | Yes | Yes |
| Add or remove currency | No | Yes | No through the admin dashboard |
| Request rewards | Yes | No | No |
| Approve or deny reward requests | No | Yes | No |
| Manage reward catalogue | No | Yes | Yes |
| View staff analytics | No | Yes | Yes |
| Manage users | No | No | Yes |
| Manage groups and memberships | No | No | Yes |
| Manage timetable | No | No | Yes |
| Void ledger entries | No | No | Yes |
| View audit and error logs | No | No | Yes |
| Manage organisation, SSO, API, and reward settings | No | No | Yes |
| Change own password | Yes | Yes | Yes |

Important permission rules:

- Navigation visibility is a convenience, not a security boundary.
- Every server action and API route must authenticate and authorise independently.
- Never trust a user ID, role, organisation, amount, price, scope, or status supplied by the browser.
- A disabled user or disabled role must not log in or retain a usable existing session.
- Students must never be able to widen a query from their own account to the cohort.
- Reward approval remains a teacher/staff responsibility, not an admin dashboard action.

The database contains `roles`, `permissions`, and `role_permissions`. Current TypeScript capability helpers still map the resolved role key to named capabilities. Do not assume that adding a database permission automatically changes application authorisation until the permission resolution layer is explicitly completed.

## Primary experiences

### Login

- Resolve the organisation before authentication.
- Show Myntix Ledger branding plus the organisation logo.
- Use the wording `Sign in to {organisation}` when the organisation is known.
- Keep username and password visually grouped and compact.
- Offer local username/password authentication.
- Show Google or Microsoft buttons only when that provider is configured and enabled for the organisation.
- Keep forgot-password access visible but secondary.
- Use a yellow warning for an expired session, red for an error, and green for success.
- Invalid or inactive organisation domains must not receive a generic working login screen.

### Student experience

The student experience may be warmer and more rewarding than staff/admin views, but it must remain polished and readable.

Core student dashboard content:

- A bank-card-inspired wallet showing current balance, configured currency name, and subtle organisation name.
- Balance history over time.
- A savings-style goal with an animated progress ring and concise progress wording.
- Small personal account metrics such as average movement over a selected period.
- Recent activity showing description first, then less-prominent date/time, and one signed colour-coded amount.
- Current and historical reward requests under `My Orders` or the established rewards wording.
- Student group memberships where appropriate.

Student restrictions:

- Do not show cohort totals, rankings, averages, other users, or the full ledger.
- Do not expose staff/admin controls in markup as a substitute for server authorisation.
- Do not allow purchases or deductions to make the available balance negative.

### Teacher/staff experience

The teacher dashboard should remain primarily operational. Do not fill it with decorative or low-value metrics.

Core teacher workflow:

- Default the student list to the currently timetabled group when one exists.
- Search students and groups from one compact control.
- Support multiple search terms separated by semicolons.
- Keep individual add/remove actions directly on student cards.
- Keep an always-visible `Issue all` workflow for the currently filtered set.
- Show circular student photos or initials, name, current balance, and subtle recent trend.
- Refresh balances immediately after a successful adjustment and close the completed modal.
- Show pending reward approvals in a compact table above the student search.
- Provide analytics, rewards management, and the transaction log through navigation.

Teacher transaction forms must collect recipients, direction, amount, and reason before creating any ledger entry. Never write a partial adjustment while the sequential form is still in progress.

### Admin experience

The admin interface is an operational console. It should be denser, calmer, and more enterprise-oriented than the student interface.

Core areas:

- Dashboard: ledger balance, circulation history, account composition, pending counts, top credit/demerit issuers, recent audit events, and recent ledger activity.
- Users: create, edit, duplicate, disable/enable, reset passwords, assign roles/groups, upload profile images, import/export CSV, and filter/paginate.
- Groups: create, view members, edit, duplicate, archive/restore, bulk membership management, import/export CSV, and filter/paginate.
- Timetable: create, edit, duplicate, delete, import/export CSV, and filter by teacher, group, day, and status.
- Analytics: cohort by default, filterable by student or group and time range.
- Rewards: compact management table with catalogue actions and filtering.
- Transaction log: full ledger, filterable, exportable, with details and admin void workflow.
- Audit log: administrative/security/configuration actions, excluding ordinary ledger activity that already belongs in the transaction log.
- Error log: actionable server errors with source, time, message, and context.
- Settings: Account, Organisation, Auth, API, Rewards, and Appearance sections, each with its own save action where applicable.
- Export all school data: deliberate ZIP of human-readable CSV files.

## Navigation and responsive structure

- Desktop uses a full-height left navigation rail.
- The rail is expanded by default and can collapse to icons.
- The product name and logo belong at the top; account controls belong at the bottom.
- The active navigation state spans the usable width of the rail and has clear contrast.
- Mobile uses a compact account/menu trigger and a menu overlay; it closes after navigation, on Escape, and when clicking outside.
- Do not create separate navigation patterns for each role when the same component can filter a shared definition.
- The main content should use the available viewport width while retaining readable internal padding.
- The page background must continue to the bottom of the viewport and content.

Current navigation:

| Role | Navigation |
| --- | --- |
| Student | Dashboard, Rewards |
| Teacher | Dashboard, Analytics, Rewards, Transaction Log |
| Admin | Dashboard, Users, Groups, Timetable, Analytics, Rewards, Transaction Log, Audit Log, Error Log, Settings |

## Visual design system

### Brand

- Product: Myntix Ledger
- Company/product family: Myntix
- Positioning: internal currency, made simple
- Brand personality: trustworthy, modern, calm, capable, and lightly optimistic
- Avoid: toy-like controls, excessive rounded bubbles, loud gradients, oversized copy, or a classroom clip-art aesthetic

Brand assets live under `public/brand`. Public naming and asset URLs are configured through `src/lib/app-config.ts` and `NEXT_PUBLIC_APP_*` environment values. Do not scatter brand names or asset paths through components.

### Typography

- Primary UI font: Lato.
- Numeric values use the `App Numerals` face, currently backed by Sora glyphs, through `--font-numeric`.
- Use lighter weights for navigation and secondary copy.
- Use weight and size hierarchy deliberately: important number first, concise label beneath it.
- Avoid making every heading, button, label, and value bold.
- Do not use viewport-width-based font sizing or negative letter spacing.

### Core colour tokens

Use semantic CSS variables and Tailwind theme aliases. Do not add literal colours directly to components when an appropriate token exists.

| Purpose | Light/default value |
| --- | --- |
| Page background | `--background: #f6f9f7` |
| Main foreground | `--foreground: #111827` |
| Surface | `--surface: #ffffff` |
| Soft panel | `--panel-soft: #f4f7f5` |
| Primary brand | `--accent-primary: #183f3d` |
| Secondary brand | `--accent-secondary: #70b895` |
| Highlight mint | `--accent-highlight: #7ae4b7` |
| Positive/increase | `--success: rgb(89, 188, 146)` |
| Negative/decrease | `--danger: rgb(246, 155, 99)` |
| Warning | `--warning: #9a6700` |
| Wallet base | `--balance-bg: #173b40` |

Dark mode uses a near-black neutral background and dark neutral surfaces. It must not become a dark green monochrome theme. Positive and negative semantics remain consistent in both modes.

Users may select teal, blue, purple, orange, or a custom accent. Accent choices may affect navigation, icons, charts, and highlights, but must never replace semantic success, danger, or warning colours.

### Shape and surface

- Controls use `--radius-control`.
- Repeated cards use `--radius-card`.
- Large panels/modals use `--radius-panel`.
- Admin/staff tables and modals should feel compact and restrained.
- Avoid cards nested inside cards unless the inner item is a genuine repeated record or framed tool.
- Do not add hover elevation or outlines to static panels.
- Clickable elements must use a pointer cursor and have a visible hover/focus state.
- Borders should be subtle. Use contrast between background and surface before adding heavy outlines.
- Empty states should not leave a meaningless large panel, and must retain any action required to create the first item.

### Motion

- Motion must be subtle and short, using `--motion-fast`, `--motion-standard`, and `--motion-ease`.
- Appropriate uses: login entrance, modal entrance, balance count changes, goal progress, toast appearance, and small state transitions.
- Avoid movement that changes layout, causes cards to rise, or delays routine staff work.
- Respect reduced-motion preferences.

### Icons

- Prefer familiar icons over long action labels when space is constrained.
- Desktop primary creation/import actions may show icon plus text; mobile may show icons with accessible labels and tooltips.
- Row actions use a vertical three-dot menu.
- Use pencil/edit, archive, restore, duplicate, eye/view, trash/delete, cog/settings, and clear close icons consistently.
- Never rely on icon colour alone to communicate meaning.

## Layout rules

- Use a four-unit desktop grid for the main dashboards unless a deliberately approved six-unit analytics layout is already established.
- Components may span one to four units; align adjacent cards to shared grid lines and heights where it improves scanning.
- Mobile collapses to a single column or a deliberate two-column metric grid.
- No desktop table may require horizontal scrolling.
- Mobile tables may hide secondary columns and prioritise record identity, amount/status, selection, and the action menu.
- Keep search controls and adjacent selectors on one line on mobile when they fit without truncating meaning.
- Stable controls, charts, buttons, and cards should have constrained dimensions so dynamic content does not shift the layout.

## Tables and list management

All administrative tables should follow the shared table pattern:

- One integrated toolbar/header band containing the count, bulk actions, search where relevant, and an overflow menu for secondary tools.
- A square select-all checkbox in the header and square row checkboxes.
- Column-level filters opened from their corresponding header.
- Each independent column gets an independent filter; do not combine name and description filters.
- Every active filter has an obvious clear action.
- Static finite fields such as status/day may use selects; names such as teacher/group use searchable text unless explicitly designed otherwise.
- The table remains visible when filters return zero results so filters can be cleared.
- The action column has a narrow fixed width and no visible `Actions` label.
- Individual actions live in a vertical three-dot menu.
- Archive/restore belongs in the row action menu, not hidden only inside edit forms.
- Bulk actions are limited to operations that are safe and understandable across all selected rows.
- Pagination is required for large datasets. Current product preference is approximately 50 rows on desktop and 15 on mobile, with previous/next and direct page selection.
- Table content should fill the available section without unnecessary wrapper panels or dead space.

Destructive or high-impact actions use the reusable confirmation modal. Routine reversible actions should not be burdened with unnecessary confirmation.

## Forms, modals, notifications, and imports

### Forms

- Labels must be associated with controls even if a compact design visually hides them.
- Required and optional fields must be visually clear.
- Numeric fields must allow the user to clear the initial value before typing.
- Currency amounts are whole numbers and display with locale separators.
- Validation errors should identify the field or action that needs correction.

### Modals

- Use the shared `ModalShell` and focus-management utilities.
- Modals require a visible icon close button in the top-right, Escape support, focus trapping/restoration, and a constrained viewport height.
- Modal headers, body, and footer actions must have clear visual separation.
- Keep mobile forms compact; use internal scrolling only when content cannot reasonably be reduced.
- New, edit, duplicate, detail, import, and risky confirmation workflows should follow the same modal language.

### Notifications

- Use the shared fixed toast/notification viewport.
- Notifications must not reserve blank space in panels or shift table content.
- Success is green, warning is yellow, error is red, and neutral information uses a neutral/brand treatment.
- Successful adjustment feedback should state direction, actual amount, recipient(s), and reason.

### CSV import/export

- Every import modal offers a downloadable example/template CSV.
- Document required and optional headers in the modal and template.
- Parse by header name, not column position.
- Provide a preview and clear row-level errors before or after import as appropriate.
- Generated passwords from user imports must be exportable once for distribution and must not be written into the source CSV.
- Define duplicate behaviour explicitly per import. Do not silently create ambiguous duplicates.
- Large imports should use efficient set-based or batched database operations and must not freeze the interface.
- Export filenames include `ddmmyyHHMM` without punctuation.
- Full school export is a ZIP containing separate, human-readable CSV files.

## Ledger rules and invariants

These rules are critical. Treat changes here as high risk.

- Currency uses signed whole-number integers.
- Positive entries add value; negative entries remove value.
- A student's balance is the sum of valid pending and posted ledger entries according to the existing ledger query rules.
- Manual staff deductions are capped at the student's available balance; if less is available, remove only what is available and stop at zero.
- External API debits and holds reject insufficient balance rather than silently changing the requested amount.
- An optional organisation balance cap limits credits. A manual bulk credit may apply only the remaining capacity per student.
- An amount of zero is never stored as a ledger entry.
- Every manual adjustment requires a non-empty reason.
- Bulk/group adjustments create an independently traceable entry for each student.
- Posted entries are not deleted. Voiding marks the original and creates one idempotent opposite-signed `void_reversal` entry.
- Pending entries may be voided without posting.
- Use database transactions and row locks for balance-affecting workflows.
- Preserve source linkage with `related_entity_type` and `related_entity_id`.
- Do not calculate a displayed balance from a client-side cache after a write; reload authoritative data after success.

### Reward request accounting

The current rewards flow reserves both affordability and stock immediately:

1. Student requests an active in-stock reward.
2. The server locks the relevant records and verifies available balance.
3. Stock is decremented.
4. A pending reward purchase record is created.
5. A negative pending ledger hold is created and immediately affects available balance.
6. Teacher approval posts/converts the related ledger entry into a reward purchase.
7. Teacher denial restores stock and voids the pending ledger entry, refunding the hold.
8. Admin transaction voiding preserves the ledger history through reversal behaviour.

Do not move these decisions into the browser. The database transaction must keep purchase, stock, and ledger state consistent.

## Data model

### Platform database

The platform database contains the `organisations` directory. It resolves a request host or development slug to an active tenant target.

Important fields:

- `slug`: stable internal tenant key and subdomain lookup value.
- `name`: organisation display/reference name in the platform directory.
- `primary_domain`: exact host mapping.
- `tenancy_mode`: `schema` or `database`.
- `schema_name`: required only for shared-schema tenancy.
- `database_host`, `database_port`, `database_name`, `database_user`, `database_password`: dedicated database target details.
- `is_active`: platform-level tenant availability switch.

Database credentials are server-only. They must never be sent to the browser or logged. The current platform schema stores dedicated tenant passwords as text; improving this requires a deliberate secret-management design, not ad hoc reversible encryption in application code.

### Organisation database or schema

| Domain | Tables | Ownership |
| --- | --- | --- |
| Core/organisation | `school_info` | Organisation profile, currency name, logo, balance cap |
| Audit | `audit_log`, `server_error_log` | Administrative/security events and actionable server errors |
| Auth | `roles`, `permissions`, `role_permissions`, `users`, `password_reset_tokens`, `user_sessions` | Identity, access, passwords, sessions |
| Ledger | `accounts`, `ledger_entries`, `transaction_presets`, `student_goals` | Accounts, movements, balances, quick actions, goals |
| Groups | `student_groups`, `student_group_memberships` | Group records and many-to-many student membership |
| Timetable | `timetable_entries` | Teacher-to-group day/time assignments |
| Rewards | `shop_items`, `shop_purchases` | Reward catalogue and request lifecycle; table names are legacy implementation names |
| SSO | `sso_identity_providers` | Per-organisation Google/Microsoft configuration |
| External API | `api_clients`, `api_client_scopes`, `api_idempotency_keys` | Hashed keys, scopes, and replay protection |

The application supports:

- Dedicated database mode for stronger tenant isolation.
- Shared database plus one schema per organisation for efficient smaller tenants.

All domain code must use the tenant-aware `db` abstraction. Never instantiate a tenant connection in a component, action, or domain service. Schema-mode connections must set and then reset `search_path`; dedicated databases use per-target connection pools.

Database setup scripts are ordered and domain-oriented under `database/school`. They are setup scripts, not a production migration framework. Once production data exists, use explicit forward migrations rather than modifying bootstrap SQL alone.

## Architecture

Myntix Ledger is a Next.js 16, React 19, TypeScript, PostgreSQL modular monolith.

```text
Browser
  -> Next.js page/client component
    -> thin server action or API route
      -> authentication + authorisation guard
        -> domain service
          -> tenant-aware database abstraction
            -> platform lookup
            -> organisation database or schema
```

### Domain boundaries

- `auth`: users, sessions, passwords, SSO, action guards.
- `ledger`: accounts, entries, balances, presets, adjustment workflows.
- `groups`: groups and memberships.
- `timetable`: teacher/group schedules.
- `rewards`: reward items, requests, approval, stock, and ledger integration.
- `analytics`: dashboards, reports, goals, and exports.
- `organisation`: organisation profile and settings.
- `audit`: audit and error records.
- `integrations`: API clients, idempotency, finance API operations, and email.

Preferred dependency direction:

- Auth does not depend on ledger, rewards, groups, or analytics.
- Ledger does not depend on rewards or analytics.
- Rewards may call ledger.
- Analytics may read users, ledger, groups, rewards, and audit.
- UI components call actions, never database code directly.
- `src/lib/actions` modules remain thin `use server` boundaries that validate/authenticate and delegate to domain services.

Do not split into networked microservices without a concrete operational need. Preserve domain ownership now so extraction remains possible later.

## External API contract principles

The external API is a controlled interface to ledger operations, not a second financial rules engine.

- API clients authenticate with generated keys; only the prefix is identifiable later and the secret is never shown again.
- Store only keyed hashes of API secrets.
- Scope each key to the minimum required operations.
- Current scopes: `balances:read`, `ledger:credit`, `ledger:debit`, `ledger:hold`, and `ledger:void`.
- Require idempotency for balance-changing requests so retries do not duplicate ledger entries.
- The server resolves the student, validates the client scope, enforces tenant isolation, balance rules, caps, and ledger invariants.
- Prefer a stable organisation-specific API hostname or tenant resolution mechanism; never accept an unrestricted database target from a client.
- Return structured errors suitable for another application, without exposing SQL, secrets, stack traces, or internal topology.

## Authentication and security baseline

- Passwords are hashed with the established password utility and policy.
- Login and reset requests are rate-limited server-side.
- Session tokens are random, stored as keyed hashes, and sent only in `httpOnly` cookies.
- Cookies use `sameSite=lax`, `secure` in production, and the root path.
- Sessions have a seven-day absolute lifetime and an eight-hour idle timeout.
- Session expiry must return the user cleanly to login with a warning, not leave components throwing unauthenticated errors.
- Password changes, admin password resets, and user disabling invalidate old sessions.
- Password reset tokens are single-use, hashed, expire, and invalidate earlier reset tokens.
- Local and SSO login only allow active users with active roles.
- SSO uses authorisation code flow, validates state/nonce, issuer, audience, expiry, signature, and allowed email domains, then signs in an existing local user only.
- Provider client secrets are encrypted at rest using the configured server key.
- Server actions assert same-origin requests before executing authenticated work.
- API keys are hashed, scoped, revocable, and only displayed once.
- Production enforces HTTPS using trusted reverse-proxy headers.
- Security headers include CSP, HSTS over HTTPS, frame denial, MIME sniff prevention, restrictive permissions policy, and a strict referrer policy.
- Secrets belong only in server environment variables or approved secret storage. Never expose them through `NEXT_PUBLIC_*` variables.
- Audit important authentication and security events without logging passwords, raw reset tokens, session tokens, API keys, or SSO secrets.

## Organisation configuration

Organisation-controlled data includes:

- Name and logo.
- Address, contact email, phone, website, and timezone.
- Currency name.
- Optional balance cap, off by default.
- Up to five quick amounts and six quick reasons.
- Google and Microsoft SSO settings and allowed domains.
- External API clients and scopes.

User-controlled local preferences include:

- Light/dark mode.
- Accent preset or custom accent colour.

Developer/platform-controlled settings include:

- App name, brand assets, public site, support address, and version.
- Root domain and tenant resolution.
- Platform/shared database connections.
- Maintenance banner message.
- Cryptographic secrets and email provider credentials.

The global maintenance banner is platform-managed and visible on login and authenticated screens when `MAINTENANCE_MESSAGE` is non-empty. Organisation admins do not edit it.

## Accessibility and usability baseline

- Use semantic headings, landmarks, tables, labels, and buttons.
- Maintain one meaningful page-level heading, even when visually hidden.
- Provide a keyboard-visible skip link to `#main-content`.
- Every icon-only button requires an accessible name and usually a tooltip/title.
- Dialogs require correct dialog semantics and keyboard focus handling.
- Focus indicators must be visible in light and dark mode.
- Do not communicate success, danger, direction, selection, or status with colour alone.
- Text and controls must meet practical contrast requirements.
- Images require useful alternative text; decorative images use empty alt text.
- Uploaded logos/photos need graceful fallbacks and must not show unwanted white framing.
- Touch targets must be usable on mobile without crowding destructive and navigation controls together.
- Avoid hydration differences caused by browser-only values; initialise themes before paint and calculate unstable display values after hydration.

## Performance and scale expectations

- Assume an organisation may contain thousands of students and a large ledger history.
- Do not render every user or transaction at once.
- Paginate server data where scale warrants it; avoid loading an entire table only to filter it in the browser.
- Student/group search should require a meaningful query or limit results.
- Add indexes for common tenant-local filters and joins before introducing caches.
- Use database transactions for multi-record writes and set-based operations for imports/bulk actions.
- Charts should aggregate by the selected time bucket. Year views should not render one point per raw transaction.
- Avoid expensive rerenders while typing filters.
- Uploaded media should have size/type validation and appropriate delivery/cache behaviour.

## Error handling and observability

- User-facing errors explain the failed operation and next useful action without exposing internals.
- Database and server errors may be recorded in `server_error_log` with source and safe context.
- Expected validation/authorisation failures are not noisy server incidents.
- Audit logs capture meaningful admin, configuration, import, SSO, API-client, and security changes.
- Ordinary ledger activity belongs in the transaction log, not the admin audit feed.
- Empty, loading, success, partial success, unauthorised, expired-session, and failure states all require deliberate UI behaviour.

## Naming and terminology

Use these public terms:

- `Myntix Ledger` for the app.
- `currency` in generic explanatory text.
- The configured `currency_name` wherever the organisation's unit is displayed.
- `Rewards` for the user-facing catalogue area.
- `My Orders` for a student's reward-request history where that wording is already used.
- `Teacher` or `staff` according to context; the internal role key remains `teacher`.
- `Organisation` in reusable platform/configuration language and school-specific wording where the audience expects it.
- `Primary account` for the student's ledger account.
- `Add` and `Take` for concise staff actions; use `credit` and `debit` in API/ledger contexts where precision matters.

Legacy implementation names such as `ShopPanel`, `shop_items`, `shop_purchases`, and `shop_*` permission keys remain for compatibility. Do not perform a casual global rename. A database/code rename requires an explicit migration and compatibility plan.

## Engineering conventions for AI agents

Before editing:

1. Read `AGENTS.md`, this document, and the relevant domain/UI files.
2. Run `git status --short --branch` and preserve existing work.
3. Identify the server action, domain service, database tables, and UI components involved.
4. State whether the request changes behaviour, visual design, schema, or only implementation structure.

While editing:

- Prefer existing components, tokens, helpers, and domain patterns.
- Keep server actions thin and domain logic out of React components.
- Keep database queries in domain services or the tenant database layer.
- Use small, plainly named functions and components.
- Split files by responsibility when it genuinely improves navigation.
- Do not create a generic abstraction for a single speculative use.
- Do not add magic numbers or literal colours when a named constant/token is appropriate.
- Preserve transactionality and server-side authorisation.
- Preserve mobile behaviour while changing desktop UI, and vice versa.
- Do not change wording, schema, permissions, or workflows as collateral damage during refactors.
- Do not modify generated files or environment files unless explicitly requested.

Before finishing:

1. Review the diff for unintended wording, layout, permission, and query changes.
2. Run `npm run lint`.
3. Run `npm run build` for application changes.
4. Exercise the changed workflow at desktop and mobile sizes when UI behaviour changed.
5. Verify empty, loading, error, success, and filtered-to-zero states where relevant.
6. Confirm student data isolation and server-side permission checks for any new action.
7. Update setup SQL and this document when an approved schema or product rule changes.
8. Report what changed, what passed, and what could not be verified.

## Feature decision checklist

Before adding a feature, answer:

- Which user problem does it solve?
- Is it core ledger functionality, an organisation setting, analytics, or a separable module?
- Which role owns the workflow?
- What may each role view and mutate?
- What is the authoritative record?
- Which audit event is required?
- Can it change a balance, reserve value, or create a race condition?
- How does it behave with disabled users, archived groups, voided entries, and insufficient balance?
- What is the empty state?
- How does it work with 1,000+ students and a long ledger?
- How does it work on a narrow mobile viewport?
- Does it require a schema migration, new permission, API scope, environment variable, or background job?
- Can it remain inside the modular monolith without weakening a domain boundary?

## Current product direction

The near-term priority is a dependable, deployable core ledger that real organisations can trial and provide feedback on. Prefer work in this order:

1. Correctness, tenant isolation, permissions, and recoverable ledger operations.
2. Fast staff issuance and clear student feedback.
3. Reliable imports, exports, settings, SSO, backups, and operational visibility.
4. Performance with realistic organisation data volumes.
5. Polished onboarding and organisation ownership of the experience.
6. Optional engagement modules connected through stable, scoped APIs only after the core is proven.

The product should become more capable through measured additions, not by turning the dashboard into a collection of unrelated widgets.
