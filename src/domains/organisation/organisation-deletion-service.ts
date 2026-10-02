import { appConfig } from "@/lib/config/app-config";
import { getCurrentTenantSlug } from "@/lib/database/db";
import type { SessionUser } from "@/lib/auth/session";
import { EmailService } from "@/domains/integrations/email-service";
import { SchoolService } from "@/domains/organisation/school-service";

const emailService = new EmailService();
const schoolService = new SchoolService();

export class OrganisationDeletionService {
  async request(currentUser: SessionUser, confirmation: string, reason: string) {
    const [school, slug] = await Promise.all([
      schoolService.getSchoolInfo(),
      getCurrentTenantSlug(),
    ]);
    if (confirmation.trim() !== school.name) {
      return { ok: false as const, message: `Enter ${school.name} exactly to confirm.` };
    }

    const recipient = process.env.ORGANISATION_DELETION_REQUEST_EMAIL?.trim()
      || appConfig.supportEmail;
    if (!recipient || recipient === "support@example.com") {
      return { ok: false as const, message: "Deletion request email is not configured. Contact Myntix support directly." };
    }

    const submittedReason = reason.trim() || "No reason supplied.";
    const subject = `Organisation deletion request: ${school.name} (${slug})`;
    const text = [
      "An organisation administrator has requested deletion.",
      "",
      `Organisation: ${school.name}`,
      `Tenant slug: ${slug}`,
      `Requested by: ${currentUser.displayName} (${currentUser.username})`,
      `User ID: ${currentUser.id}`,
      `Reason: ${submittedReason}`,
      "",
      "This email is a request only. No data has been disabled or deleted automatically.",
      `Review the request, then run the protected platform-owner offboarding command for '${slug}'.`,
    ].join("\n");
    const result = await emailService.sendEmail({
      html: `<h2>Organisation deletion request</h2><p><strong>Organisation:</strong> ${escapeHtml(school.name)}</p><p><strong>Tenant slug:</strong> ${escapeHtml(slug)}</p><p><strong>Requested by:</strong> ${escapeHtml(currentUser.displayName)} (${escapeHtml(currentUser.username)})</p><p><strong>User ID:</strong> ${escapeHtml(currentUser.id)}</p><p><strong>Reason:</strong> ${escapeHtml(submittedReason)}</p><p><strong>No data has been disabled or deleted automatically.</strong> Review this email and run the protected platform-owner offboarding command manually.</p>`,
      subject,
      text,
      to: recipient,
    });

    return result.ok
      ? { ok: true as const, message: "Request emailed to Myntix support. Your organisation remains active until the request is manually reviewed and actioned." }
      : { ok: false as const, message: "The request email could not be sent. Contact Myntix support directly." };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
