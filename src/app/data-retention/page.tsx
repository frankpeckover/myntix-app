import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { appConfig } from "@/lib/config/app-config";

export const metadata: Metadata = {
  description: `Data retention expectations for ${appConfig.name} users, ledger records, audit logs, and backups.`,
  title: `Data Retention | ${appConfig.name}`,
};

export default function DataRetentionPage() {
  return (
    <LegalPage
      description="This page describes practical retention expectations for student, staff, ledger, audit, and operational records."
      title="Data Retention"
    >
      <LegalSection title="General approach">
        <p>
          {appConfig.name} should keep information only for as long as it is
          useful for school operations, reporting, audit, support, legal, or
          backup purposes. Retention periods may vary by school policy, hosting
          model, and local legal requirements.
        </p>
      </LegalSection>

      <LegalSection title="User accounts">
        <p>
          Active user accounts are retained while the school uses the
          application. Inactive users should normally be disabled first so
          historical ledger and audit records remain understandable.
        </p>
        <p>
          If a school later requires removal, account data may need to be
          exported, anonymised, or deleted according to the school&apos;s policy.
        </p>
      </LegalSection>

      <LegalSection title="Ledger and reward records">
        <p>
          Ledger entries, balance changes, reward requests, approvals, denials,
          voids, and refunds should generally be retained for the school year
          and any additional period needed for reporting or dispute resolution.
        </p>
        <p>
          Because ledger records explain balances, they should usually be
          corrected by voiding or reversal rather than direct deletion.
        </p>
      </LegalSection>

      <LegalSection title="Audit and error logs">
        <p>
          Audit logs should be retained long enough to investigate account,
          settings, import, reward, and administrative changes. Server error logs
          should be retained only as long as needed for troubleshooting and
          operational review.
        </p>
      </LegalSection>

      <LegalSection title="Security records">
        <p>
          Session records expire automatically. Password reset tokens are
          short-lived and should be expired or marked as used after completion.
          Expired security records should be cleaned up routinely.
        </p>
      </LegalSection>

      <LegalSection title="Backups">
        <p>
          Backups may retain data after it has changed or been removed from the
          live database. Backup retention should be documented separately and
          restore processes should be tested regularly.
        </p>
      </LegalSection>

      <LegalSection title="Exports and offboarding">
        <p>
          Schools should be able to export core records such as users, groups,
          ledger activity, audit logs, timetable data, and reward records before
          ending use of the application.
        </p>
      </LegalSection>

      <LegalSection title="Policy status">
        <p>
          This page is an operational policy starting point. A formal retention
          schedule should be reviewed with the school or organisation
          responsible for the data.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
