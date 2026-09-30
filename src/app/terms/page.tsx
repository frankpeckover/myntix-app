import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { appConfig } from "@/lib/config/app-config";

export const metadata: Metadata = {
  description: `Terms for using ${appConfig.name} as an internal reward wallet and administration tool.`,
  title: `Terms | ${appConfig.name}`,
};

export default function TermsPage() {
  return (
    <LegalPage
      description="These terms describe the intended use of the application as a school reward wallet and administration tool."
      title="Terms of Use"
    >
      <LegalSection title="Purpose">
        <p>
          {appConfig.name} is designed to help schools manage a simulated
          reward currency. Balances, reward items, goals, and ledger records are
          educational and administrative tools only. They are not real money,
          stored value, banking products, or financial accounts.
        </p>
      </LegalSection>

      <LegalSection title="School responsibilities">
        <p>
          Schools are responsible for deciding how reward currency is issued,
          removed, spent, voided, and explained to students. Schools are also
          responsible for maintaining user accounts, assigning roles, reviewing
          staff access, and communicating local expectations to students and
          families.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Users should access only their own account or the accounts they are
          authorised to manage. Staff and administrators should use ledger,
          group, timetable, reward, and reporting tools only for legitimate school
          purposes.
        </p>
      </LegalSection>

      <LegalSection title="Accounts and security">
        <p>
          Users are responsible for keeping credentials secure. Administrators
          should disable accounts that no longer need access and should use
          strong password, session, and access-control practices.
        </p>
      </LegalSection>

      <LegalSection title="Records and corrections">
        <p>
          Ledger and audit records are intended to provide a reliable history.
          Incorrect transactions should normally be corrected by voiding or
          reversing records rather than editing history directly.
        </p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          The application may be unavailable during maintenance, hosting
          failures, network outages, database work, or software updates. Schools
          should not rely on it as the only place where critical operational
          records are kept.
        </p>
      </LegalSection>

      <LegalSection title="Legal review">
        <p>
          These terms are a practical starting point for the product. Before
          using the application with real schools, they should be reviewed and
          adapted for the relevant jurisdiction, hosting model, and school
          agreement.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
