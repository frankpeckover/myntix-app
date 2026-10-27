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
- SSO just-in-time (JIT) account creation is optional per organisation and is
  restricted to explicitly allowed email domains; administrator privileges are
  never granted by JIT.
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

Student year level is optional (`users.year_level`, 0 for Prep through 12).
Students below Year 7 use a simplified dashboard with their existing wallet,
savings goal, short activity feed and cart. Year 7 and above, and unknown year
levels, keep the standard dashboard. This is presentation only: rewards,
preferences and full transaction history remain available to every student.
Staff/admin dashboard layouts and authorisation are unchanged. Admin user
forms and CSV import can set or clear year level; SSO JIT leaves it unknown
and existing directory sync does not overwrite manually assigned year levels.

Build the smallest complete workflow first. Add abstractions only when they reduce clear duplication, enforce an invariant, or match an established domain boundary.

### Mobile presentation

Mobile dashboards use a separate presentation below the shell's 1024px sidebar
breakpoint. Use `components/layout/use-dashboard-layout.ts` for dashboard
selection; retain the smaller table-specific breakpoint for table/card layouts.
Only mount the active dashboard presentation. Keep fetching, permissions and
mutation handlers in the existing shared containers, never in a second mobile
implementation of the business logic.

Student mobile home prioritises the existing personalised wallet, rewards and
three recent transactions. Savings goal and cart expand on demand, mounting on
first use and retaining their state when collapsed. Teacher mobile home puts
the current class and issuing credits first, with compact request and timetable
links. Desktop layouts and all existing secondary pages remain available and
unchanged. Further mobile page migrations should follow these feature-local
`mobile/` presentation folders rather than adding broad global CSS overrides.

Reward requests and credit management also use feature-local mobile layouts
below 1024px. Keep mobile cards to the person/group name, reward where relevant,
amount and essential actions. Credit cards omit avatars, usernames and weekly
totals (a username is shown only to distinguish duplicate student names);
reward request dates, usernames and decision notes are under Details.
Filters/sorting are collapsible, and selection/bulk decisions remain available.
Both presentations call the same existing transaction and approval handlers.
Use the shared credit and reward decision controls, with larger touch targets
on mobile, rather than copying mutation logic into cards.

Mobile repeated utility actions use familiar icon controls with accessible
names and hover titles, including request details, approve/deny, selection,
and credit adjustment. Touch targets remain at least 44px. Retain short labels
for navigation and forms, and exact numbers for balances/prices; use visuals
for meaningful proportions or progress, not arbitrary graphs of exact costs.

Use `components/ui/mobile-list-row.tsx` for compact list entries, following the
mobile transaction log: primary name, one optional secondary line, exact value
and icon actions. Mobile rewards omit large images, descriptions and routine
stock/status badges; their existing detail dialog retains that information.
Student rewards keep direct cart access; staff keep view/edit/duplicate/archive
and restore in a compact action menu. Desktop reward cards/tables are unchanged.

Mobile selectable lists use `mobile-selection-surface.tsx`: tap non-interactive
row content to toggle selection, with tint and an accent strip when selected.
Do not display per-row checkboxes on mobile. Retain an accessible visually
hidden native checkbox for keyboard/screen-reader use, and visible Select All
in the list header. Buttons, links, menus and form controls must not toggle
their containing row. Group navigation remains available through its actions.

Admin users, groups and timetable list entries have feature-local `mobile/`
rows and `shared/row-actions.tsx` action definitions. Desktop keeps its existing
table/action grid; mobile uses the common compact list row and touch-sized
action menu. Mobile user rows show name/role (username only for duplicate
names), groups show name/member count, and timetable rows show class, teacher
and short day/time. Archived state remains visible. Fetching, filters,
pagination, selection and mutations remain in their existing containers.

## Shared interface conventions

Keep the page title as the main heading; the desktop greeting is secondary and
page headings do not need a repeated navigation icon. Panels use restrained,
consistent shadows; keep stronger visual emphasis for the personalised wallet
and overlays rather than elevating every container on hover.

Mobile navigation has short labels. Students keep Home, Rewards and History;
staff/admin keep Home and Credits with the remaining permitted pages under
More. Notifications, voice (staff only) and account controls remain in the
bottom bar, with utilities on the left and page navigation on the right.
The mobile order is profile, notifications, voice (staff only), then More,
Credits and Home for staff; students have profile, notifications, History,
Rewards and Home. Keep DOM/focus order aligned with the visible order.
More supports keyboard navigation, Escape and outside dismissal.
Opening a different page starts at the top rather than retaining the previous
page's scroll offset. Native browser Back/Forward behaviour remains unchanged.

Shared search fields provide a clear button and Escape-to-clear, retain focus
when cleared, and keep the same debounce/minimum-character rules. Mobile
Select All has a label-sized touch target and announces the selected count.
Filter popups focus their first usable field; mobile multi-filter panels stay
open while choosing fields or sorting, with explicit close and Escape support.
Group status refreshes retain mounted controls instead of discarding an open
filter panel.

Shared information tooltips open on hover, focus or tap, fit within the viewport
and sit above overlays. Escape dismisses focused help before its containing
dialog. Mobile close/retry controls retain 44px targets; secondary student
sections use the same right-aligned disclosure chevron. The development badge
is hidden so it cannot cover the mobile account button; Next.js still reports
compile and runtime errors.

Bulk credit issuing uses the label Issue to all and includes all matching
students across pages, not just the rendered page. The accessible label and
confirmation retain the exact target count. Existing
confirmation, limits and server authorisation remain authoritative.

Pagination uses a page-number input committed on Enter or blur, bounded to
the available pages, rather than one option per page. Page-size controls stay
available when a non-empty list fits on one page. Heatmaps use one tab stop;
arrows explore dates, Home/End reach the first/last date, Escape dismisses
details, and existing Enter/click date selection is retained.

## Users and permissions

The current system roles are `student`, `teacher`, and `admin`. The database display name for `teacher` is Staff, but the code key remains `teacher`.

| Capability | Student | Teacher/staff | Admin |
| --- | --- | --- | --- |
| View own balance and ledger | Yes | Not applicable | Not applicable |
| View student balances and ledger entries | No | Yes | Yes |
| Add or remove currency | No | Yes | Yes, through Credit Management |
| Request rewards | Yes | No | No |
| Approve or deny reward requests | No | Yes | Yes, through Reward Requests |
| Manage reward catalogue | No | Yes | Yes |
| View staff analytics | No | Yes | Yes |
| Manage users | No | No | Yes |
| Manage groups and memberships | No | No | Yes |
| View own timetable | No | Yes | Not applicable |
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
- Administrators can perform the staff credit and reward-request workflows as
  well as organisation management; one person does not need separate teacher
  and admin accounts.

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

- A bank-card-inspired wallet showing current balance, configured currency name, the student's name, date-style card number, and organisation logo.
- Balance history over time.
- A student-scoped transaction history with all of that student's ledger activity.
- A savings-style goal with an animated progress ring and concise progress wording.
- Small personal account metrics such as average movement over a selected period.
- One dashboard-level period selector controls balance history, activity snapshot,
  and best day together, including custom dates. Daily movement remains a fixed
  past-12-month heatmap and is labelled separately.
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
- The Credit Management view is a shared-style table with each student's
  balance and compact add, adjust, and take actions; keep the workflow fast on
  mobile. The separate teacher dashboard may use student cards for at-a-glance
  work and one-click personal quick actions.
- Keep the `Issue all` workflow for the currently filtered set, with an explicit
  recipient/amount/reason review before submission.
- Show circular student photos or initials, name, current balance, and subtle recent trend.
- Refresh balances immediately after a successful adjustment and close the completed modal.
- Provide a voice shortcut (F2, F8, Ctrl+Shift+Space, or microphone-only) that
  listens only after explicit activation and requires review/confirmation before
  writing a transaction. Ignore shortcuts while the user is typing.
- Provide timetable, analytics, reward requests, rewards, and transaction
  history through separate navigation items.

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
- Credit Management and Reward Requests are separate staff workflows. Admins
  also see them so they can issue credits or handle requests without changing
  roles.
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
| Student | Dashboard, Rewards, Transaction History, Preferences |
| Teacher/staff | Dashboard, Credit Management, Reward Requests, Timetable, Analytics, Rewards, Transaction Log, Preferences |
| Admin | Dashboard, Credit Management, Reward Requests, Users, Groups, Timetable, Analytics, Rewards, Transaction Log, Audit Log, Error Log, Settings, Preferences |

## Visual design system

### Brand

- Product name: Myntix Ledger; product family: Myntix.
- Positioning: internal currency, made simple.
- Brand character: trustworthy, modern, calm, capable, and lightly optimistic.
- Use the coin-stack mark for the favicon and compact brand placements; use the
  wordmark in navigation and the lockup on the login screen.
- Organisation identity should be visible in tenant login, relevant dashboard
  context, and the student's wallet without competing with Myntix branding.

- Avoid: toy-like controls, excessive rounded bubbles, loud gradients, oversized copy, or a classroom clip-art aesthetic

Brand assets live under `public/brand`. Public naming and asset URLs are configured through `src/lib/config/app-config.ts` and `NEXT_PUBLIC_APP_*` environment values. Do not scatter brand names or asset paths through components.

### Typography

- Primary UI font: Inter, with Plus Jakarta Sans used for headings.
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
| Positive/increase | `--success: #10b981`; soft surface `#e8f5ee`, ink `#166534` |
| Negative/decrease | `--danger: #ef4444`; soft surface `#feecec`, ink `#991b1b` |
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
- Row and bulk actions use a compact icon-button grid in the table toolbar/action
  area; reveal row actions on hover or keyboard focus where supported.
- Use pencil/edit, archive, restore, duplicate, eye/view, trash/delete, cog/settings, and clear close icons consistently.
- Never rely on icon colour alone to communicate meaning.

## Layout rules

- Dashboard sections use the `page` URL parameter so browser Back, Forward,
  refresh, and shared links preserve the active section without a full-page
  navigation. Student day-specific history links also include `date`.
- Resolve navigation against the current role's shared navigation list; unknown
  or unavailable sections fall back to Dashboard. Server authorisation remains
  the security boundary. Table filters and unsaved forms are not persisted by
  section navigation.
- Use a four-unit desktop grid for the main dashboards unless a deliberately approved six-unit analytics layout is already established.
- Components may span one to four units; align adjacent cards to shared grid lines and heights where it improves scanning.
- Mobile collapses to a single column or a deliberate two-column metric grid.
- No desktop table may require horizontal scrolling.
- Mobile tables may hide secondary columns and prioritise record identity, amount/status, selection, and the action menu.
- Keep search controls and adjacent selectors on one line on mobile when they fit without truncating meaning.
- Stable controls, charts, buttons, and cards should have constrained dimensions so dynamic content does not shift the layout.

## Tables and list management

All administrative tables should follow the shared table pattern:

- One integrated toolbar/header band containing the count, bulk actions, and search where relevant. Table actions use the shared compact icon-button grid.
- A square select-all checkbox in the header and square row checkboxes.
- Column-level filters opened from their corresponding header.
- Each independent column gets an independent filter; do not combine name and description filters.
- Active filters are visibly indicated in their column headers and can be cleared without removing unrelated filters.
- Static finite fields such as status/day may use selects; names such as teacher/group use searchable text unless explicitly designed otherwise.
- The table remains visible when filters return zero results so filters can be cleared.
- The action column has a narrow fixed width and no visible `Actions` label.
- Individual actions use a compact icon-button grid in the right action column;
  show clear hover/focus borders and keep row height stable.
- Archive/restore belongs in the row action grid, not hidden only inside edit forms.
- Bulk actions are limited to operations that are safe and understandable across all selected rows.
- Pagination is required for large datasets. Current product preference is approximately 50 rows on desktop and 15 on mobile, with previous/next and direct page selection.
- Table headers remain sticky while scrolling. Long text truncates with access to the full value; numeric values do not truncate.
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
| Core/organisation | `school_info` | Organisation profile, currency name, logo, balance cap, transaction cap, timetable cycle settings |
| Audit | `audit_log`, `server_error_log` | Administrative/security events and actionable server errors |
| Auth | `roles`, `permissions`, `role_permissions`, `users`, `password_reset_tokens`, `user_sessions` | Identity, access, passwords, sessions |
| Ledger | `accounts`, `ledger_entries`, `transaction_presets`, `student_goals` | Accounts, movements, balances, quick actions, goals |
| Groups | `student_groups`, `student_group_memberships` | Group records and many-to-many student membership |
| Timetable | `timetable_entries` | Teacher-to-group day/time assignments |
| Rewards | `shop_items`, `shop_purchases` | Reward catalogue and request lifecycle; table names are legacy implementation names |
| SSO | `sso_identity_providers` | Per-organisation Google/Microsoft configuration and optional domain-restricted JIT |
| External API | `api_clients`, `api_client_scopes`, `api_idempotency_keys`, `api_request_log` | Hashed keys, scopes, replay protection, and request activity |
| Notifications | `notifications`, `notification_preferences`, `notification_digest_deliveries` | In-app alerts, user choices, and email digest deduplication |
| Account preferences | `user_preferences`, `user_transaction_preset_preferences` | Persisted appearance, dashboard, table density, text size, voice shortcut, and personal quick-action choices |
| Directory sync | `directory_sync_sources`, `directory_sync_runs`, `directory_sync_*_mappings` | Integration configuration, run history, and ownership for sync-managed users/groups/timetable |
| Admin onboarding | `admin_setup_checklist_preferences` | Checklist completion and dismiss state |

The application supports:

- Dedicated database mode for stronger tenant isolation.
- Shared database plus one schema per organisation for efficient smaller tenants.

All domain code must use the tenant-aware `db` abstraction. Never instantiate a tenant connection in a component, action, or domain service. Schema-mode connections must set and then reset `search_path`; dedicated databases use per-target connection pools.

Database setup scripts are ordered and domain-oriented under `infrastructure/database/tenant`. They are setup scripts, not a production migration framework. Once production data exists, use explicit forward migrations rather than modifying bootstrap SQL alone.

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
- `integrations`: API clients, idempotency, finance API operations, and directory sync.
- `notifications`: in-app notifications, preferences, and email digests.
- `users`: user-specific preferences and transaction preset preferences; authentication remains under `auth`.
- `operations`: tenant backups and restores.

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
- Current scopes: `accounts:read`, `ledger:read`, `ledger:credit`, `ledger:debit`, `holds:read`, `holds:write`, `ledger:void`, `rewards:read`, `purchases:read`, and `purchases:write`.
- Require idempotency for balance-changing requests so retries do not duplicate ledger entries.
- The server resolves the student, validates the client scope, enforces tenant isolation, balance rules, caps, and ledger invariants.
- Prefer a stable organisation-specific API hostname or tenant resolution mechanism; never accept an unrestricted database target from a client.
- Return structured errors suitable for another application, without exposing SQL, secrets, stack traces, or internal topology.
- External API writes use bounded UTF-8 JSON bodies (16 KiB) and explicit input
  types. Authentication accepts only generated-format Bearer keys; cookies do not
  authenticate API clients. Authenticated responses are private/no-store.
- The shared write handler owns the transaction: idempotency reservation,
  domain mutation, and replay response commit together on one tenant connection.
  Domain write methods receive this connection and never commit independently.
- Purchase holds are controlled only by purchase decisions, not generic hold
  capture/release routes. Transaction caps apply to reservations and purchases;
  crediting a debit reversal requires credit scope as well as debit scope.

## Authentication and security baseline

- Passwords are hashed with the established password utility and policy.
- Every manually entered new password requires a second, exactly matching
  confirmation field: profile changes, emailed resets, admin resets and user
  creation. Reuse the shared password fields and validate on both client and
  server before hashing or database writes. Never trim either entry. Generated
  import/SSO passwords remain automatic and do not require manual confirmation.
- Login and reset requests are rate-limited server-side.
- Login validates runtime input types and bounds before querying or hashing.
  Identifiers are trimmed and lowercased; passwords are never trimmed, modified,
  or HTML-sanitised. SQL remains parameterised and rendered text is escaped.
- Login limits are tenant-scoped: eight attempts per identifier in five minutes,
  plus 200 failed attempts per source IP in five minutes. Successful logins do
  not consume the shared-IP failure allowance. Reset requests allow five per
  identifier and 30 per source IP in 15 minutes. Counters currently live in
  process memory; use a shared durable limiter before horizontal scaling.
- Login and reset-request actions require a matching browser Origin. Public
  errors do not reveal database setup details. Unknown or disabled accounts
  still perform a dummy password-hash comparison to reduce timing differences.
- Session tokens are random, stored as keyed hashes, and sent only in `httpOnly` cookies.
- Cookies use `sameSite=lax`, `secure` in production, and the root path.
- Sessions have a seven-day absolute lifetime and an eight-hour idle timeout.
- Successful sign-in replaces the current browser session and invalidates its
  previous token transactionally. Malformed session cookies are rejected early.
- Session expiry must return the user cleanly to login with a warning, not leave components throwing unauthenticated errors.
- Password changes, admin password resets, and user disabling invalidate old sessions.
- Password reset tokens are single-use, hashed, expire, and invalidate earlier reset tokens.
- Local and SSO login only allow active users with active roles.
- SSO uses authorisation code flow and validates state/nonce, issuer, audience, expiry, signature, and allowed email domains. It signs in a matching local user or, when enabled, creates a permitted JIT account.
- Optional SSO JIT can create an account only when enabled and the verified
  identity matches an allowed email domain. New JIT accounts are students;
  staff and admin accounts are provisioned separately, and admin rights remain
  manually assigned. Existing users are matched before creating a new account.
- Provider client secrets are encrypted at rest using the configured server key.
- Server actions assert same-origin requests before executing authenticated work.
- API keys are hashed, scoped, revocable, and only displayed once.
- Production enforces HTTPS using trusted reverse-proxy headers.
- Security headers include CSP, HSTS over HTTPS, frame denial, MIME sniff prevention, restrictive permissions policy, and a strict referrer policy.
- Secrets belong only in server environment variables or approved secret storage. Never expose them through `NEXT_PUBLIC_*` variables.
- Audit important authentication and security events without logging passwords, raw reset tokens, session tokens, API keys, or SSO secrets.
- Disable Next.js development Server Function argument logging and request logs
  for reset/SSO URLs. Post-login return paths must remain local to this app.
- The reverse proxy must overwrite untrusted forwarded host/IP headers and the
  application port must not be publicly reachable around the trusted proxy.
  Enable MFA at the SSO provider for staff/admin accounts. These controls do not
  replace an independent penetration test or make the application unhackable.

## Organisation configuration

Organisation-controlled data includes:

- Name and logo.
- Address, contact email, phone, website, and timezone.
- Currency name.
- Optional balance cap, off by default.
- Up to five quick amounts and six quick reasons.
- Google and Microsoft SSO settings and allowed domains.
- External API clients and scopes.

User-controlled account preferences are stored per user in the tenant database
and cached in the browser for fast startup. Appearance, dashboard, density, and
voice shortcut choices live in `user_preferences`; personal transaction presets
and notification modes have their own domain tables. They include:

- Light/dark mode, accent preset/custom colour, and table density.
- Desktop navigation default (expanded or collapsed), restored from the account
  on refresh/sign-in. The sidebar toggle changes the current session only;
  choosing a new default in Appearance applies immediately. Mobile navigation
  is unaffected, and existing accounts default to expanded.
- Student wallet finish, wallet pattern, and dashboard background.
- Staff voice-command shortcut (F2, F8, Ctrl+Shift+Space, or microphone-only).
- Staff personal quick amounts/reasons and one-click add/take defaults.
- Staff reward-request notification mode (`Off`, `In-app`, or weekly digest).

Developer/platform-controlled settings include:

- App name, brand assets, public site, support address, and version.
- Root domain and tenant resolution.
- Platform/shared database connections.
- Maintenance banner message.
- Cryptographic secrets and email provider credentials.

The global maintenance banner is developer-managed through the platform database and visible on login and authenticated screens while an active `platform_announcements` record is within its scheduled time range. Organisation admins do not edit it, and changing it does not require an application restart.

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
- Text searches and column filters share a two-character minimum (after
  trimming) and a 250 ms debounce. Keep keystrokes local to the input until
  ready; retain the last applied results for a one-character draft and show a
  short hint. Clearing restores the unfiltered/bounded default immediately.
  Number, date and finite dropdown filters remain immediate. Do not stack
  debounce delays on controls whose parent already debounces remote searches.
  Server-side student/analytics lookups also enforce the minimum, cap results,
  and escape SQL LIKE wildcards so user input is treated literally.
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
