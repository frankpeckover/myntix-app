import { EmptyState } from "@/components/ui/empty-state";
import { WalletIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { getSignedAmountTextClassName } from "@/lib/amount-style";
import { formatDateTime, formatSignedCurrencyAmount } from "@/lib/formatters";
import type { AuditLogItem } from "@/domains/audit/audit-service";
import type { AdminDashboardEntry } from "@/domains/analytics/admin-dashboard-service";

export function RecentLedgerActivity({
  currencyName,
  entries,
}: {
  currencyName: string;
  entries: AdminDashboardEntry[];
}) {
  return (
    <section className="admin-recent-activity theme-panel mt-5 min-w-0 p-4">
      <PageHeader
        title="Recent Ledger Activity"
        titleSize="base"
      />

      <div className="mt-3 min-w-0">
        {entries.length === 0 && (
          <EmptyState
            description="Recent ledger entries will appear after credits, holds, reward redemptions, or refunds are recorded."
            icon={<WalletIcon />}
            title="No ledger activity yet"
          />
        )}
        {entries.length > 0 && (
          <RecentLedgerList currencyName={currencyName} entries={entries} />
        )}
      </div>
    </section>
  );
}

export function RecentAuditActivity({ entries }: { entries: AuditLogItem[] }) {
  return (
    <section className="admin-recent-activity theme-panel mt-4 min-w-0 p-4">
      <PageHeader title="Recent Audit" titleSize="base" />

      <div className="mt-3 min-w-0">
        {entries.length === 0 && (
          <EmptyState
            description="Administrative changes such as user imports, school settings, and reward updates will appear here."
            title="No audit events yet"
          />
        )}
        {entries.length > 0 && <RecentAuditList entries={entries} />}
      </div>
    </section>
  );
}

function RecentAuditList({ entries }: { entries: AuditLogItem[] }) {
  return (
    <>
      <div className="grid w-full min-w-0 gap-3 md:hidden">
        {entries.map((entry) => (
          <RecentAuditCard entry={entry} key={entry.id} />
        ))}
      </div>

      <div className="hidden w-full min-w-0 max-w-full overflow-x-auto md:block">
        <table aria-label="Recent audit activity" className="admin-recent-activity-table w-full min-w-[460px] table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th scope="col" className="py-2 pr-4 font-semibold">Time</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Action</th>
              <th scope="col" className="py-2 font-semibold">Actor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-b border-border-subtle" key={entry.id}>
                <td className="py-2 pr-4 text-text-muted">
                  {formatDateTime(entry.createdAt)}
                </td>
                <td className="break-words py-2 pr-4 font-semibold">
                  {formatAuditLabel(entry.action)}
                </td>
                <td className="py-2 text-text-muted">
                  {formatAuditActor(entry)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RecentAuditCard({ entry }: { entry: AuditLogItem }) {
  return (
    <article className="admin-recent-activity-card theme-card w-full min-w-0 overflow-hidden p-3">
      <h4 className="break-words text-sm font-semibold">
        {formatAuditLabel(entry.action)}
      </h4>
      <p className="mt-1 truncate text-sm text-text-muted">
        {formatAuditActor(entry)}
      </p>
      <p className="mt-2 break-words text-xs text-text-muted">
        {formatDateTime(entry.createdAt)}
      </p>
    </article>
  );
}

function RecentLedgerList({
  currencyName,
  entries,
}: {
  currencyName: string;
  entries: AdminDashboardEntry[];
}) {
  return (
    <>
      <div className="grid w-full min-w-0 gap-3 md:hidden">
        {entries.map((entry) => (
          <RecentLedgerCard
            currencyName={currencyName}
            entry={entry}
            key={`${entry.createdAt}-${entry.studentName}-${entry.amount}`}
          />
        ))}
      </div>

      <div className="hidden w-full min-w-0 max-w-full overflow-x-auto md:block">
        <table aria-label="Recent ledger entries" className="admin-recent-activity-table w-full min-w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[46%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th scope="col" className="py-2 pr-4 font-semibold">Account</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Description</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Type</th>
              <th scope="col" className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                className="border-b border-border-subtle"
                key={`${entry.createdAt}-${entry.studentName}-${entry.amount}`}
              >
                <td className="py-2 pr-4 text-text-muted">
                  {entry.studentName}
                </td>
                <td className="break-words py-2 pr-4">
                  <span className="font-semibold">{entry.description}</span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </td>
                <td className="py-2 pr-4 text-text-muted">
                  {formatEntryType(entry.type)}
                </td>
                <td
                  className={`py-2 text-right font-semibold ${getSignedAmountTextClassName(entry.amount)}`}
                >
                  {formatSignedCurrencyAmount(entry.amount, currencyName)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RecentLedgerCard({
  currencyName,
  entry,
}: {
  currencyName: string;
  entry: AdminDashboardEntry;
}) {
  const amountClassName = getSignedAmountTextClassName(entry.amount);

  return (
    <article className="admin-recent-activity-card theme-card w-full min-w-0 overflow-hidden p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-hidden">
          <h4 className="break-words text-sm font-semibold">
            {entry.description}
          </h4>
          <p className="mt-1 break-words text-sm text-text-muted">
            {entry.studentName}
          </p>
        </div>
        <span className={`shrink-0 text-right font-semibold ${amountClassName}`}>
          {formatSignedCurrencyAmount(entry.amount, currencyName)}
        </span>
      </div>
      <p className="mt-2 break-words text-xs text-text-muted">
        {formatEntryType(entry.type)} - {formatDateTime(entry.createdAt)}
      </p>
    </article>
  );
}

function formatEntryType(type: AdminDashboardEntry["type"]) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAuditActor(entry: AuditLogItem) {
  if (entry.actorName && entry.actorUsername) {
    return `${entry.actorName} (${entry.actorUsername})`;
  }

  return entry.actorName ?? entry.actorUsername ?? "System";
}

function formatAuditLabel(action: string) {
  return action
    .split(".")
    .map(formatLabelPart)
    .join(" ");
}

function formatLabelPart(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
