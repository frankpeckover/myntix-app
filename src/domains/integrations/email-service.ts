import type { ActionResult } from "@/lib/actions/action-results";
import { appConfig } from "@/lib/config/app-config";
import { getRequiredServerEnvInProduction } from "@/lib/config/server-env";

type SendEmailInput = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

const resendApiUrl = "https://api.resend.com/emails";
const defaultFromAddress = `${appConfig.name} <onboarding@resend.dev>`;

export class EmailService {
  async sendEmail(input: SendEmailInput): Promise<ActionResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = getRequiredServerEnvInProduction(
      "EMAIL_FROM",
      defaultFromAddress,
    );

    if (!apiKey) {
      return {
        ok: false,
        message: "Email is not configured. Add RESEND_API_KEY to the server environment.",
      };
    }

    try {
      const response = await fetch(resendApiUrl, {
        body: JSON.stringify({
          from,
          html: input.html,
          subject: input.subject,
          text: input.text,
          to: input.to,
        }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error("Send email failed", response.status, responseText);

        return {
          ok: false,
          message: "Could not send email.",
        };
      }

      return { ok: true };
    } catch (error) {
      console.error("Send email failed", error);

      return {
        ok: false,
        message: "Could not send email.",
      };
    }
  }
}
