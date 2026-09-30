import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { appConfig } from "@/lib/config/app-config";

export const metadata: Metadata = {
  description: `How ${appConfig.name} handles school reward wallet user, ledger, audit, and security information.`,
  title: `Privacy | ${appConfig.name}`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      description="This page explains the types of information handled by the application and how schools should expect that information to be used."
      title="Privacy"
    >
      <LegalSection title="Information we handle">
        <p>
          {appConfig.name} stores information needed to run a school reward
          wallet system. This can include names, usernames, email addresses,
          roles, profile images, groups, timetable assignments, account
          balances, ledger activity, reward requests, audit records, and security
          records such as sessions and password reset tokens.
        </p>
      </LegalSection>

      <LegalSection title="How information is used">
        <p>
          Information is used to authenticate users, show the correct student,
          staff, or admin view, record reward currency activity, manage groups
          and reward requests, support reporting, and keep an audit trail of
          important administrative actions.
        </p>
      </LegalSection>

      <LegalSection title="School control">
        <p>
          Each school controls the users and activity in its own environment.
          School administrators are responsible for keeping user details
          accurate and deciding which staff members should have access to
          student information.
        </p>
      </LegalSection>

      <LegalSection title="Access and sharing">
        <p>
          Student information should only be available to authorised users who
          need it for school reward, reporting, or administration workflows. The
          application should not sell student data or use it for advertising.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          The application uses hashed passwords, server-side sessions,
          role-based access checks, audit logs, and tenant-specific database
          connections. Operational security also depends on secure hosting,
          backups, HTTPS, restricted database access, and careful administrator
          practices.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Schools should provide a contact point for privacy questions. For
          hosted environments, the operator of {appConfig.name} should also
          provide a support contact for privacy, export, and deletion requests.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
