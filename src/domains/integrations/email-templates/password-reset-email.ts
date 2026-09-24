type PasswordResetEmailInput = {
  appLockupUrl: string;
  appName: string;
  appOrigin: string;
  expiresInMinutes: number;
  firstName: string;
  resetUrl: string;
  schoolLogoUrl: string;
  schoolName: string;
  supportEmail: string;
};

export function buildPasswordResetEmail(input: PasswordResetEmailInput) {
  const greetingName = input.firstName.trim() || "there";
  const schoolName = input.schoolName.trim();
  const appLogoUrl = getAbsoluteAssetUrl(input.appLockupUrl, input.appOrigin);
  const schoolLogoUrl = getAbsoluteAssetUrl(input.schoolLogoUrl, input.appOrigin);
  const subject = `Reset your ${input.appName} password`;
  const text = [
    `Hi ${greetingName},`,
    "",
    `A password reset was requested for your ${schoolName ? `${schoolName} ` : ""}${input.appName} account.`,
    "",
    `Reset your password: ${input.resetUrl}`,
    "",
    `This secure link expires in ${input.expiresInMinutes} minutes and can only be used once.`,
    "If you did not request this reset, you can safely ignore this email.",
    "",
    `Need help? Contact ${input.supportEmail}.`,
  ].join("\n");
  const schoolIdentity = schoolName
    ? `<div style="margin-top:18px;padding-top:16px;border-top:1px solid #dce8e3;display:flex;align-items:center;gap:10px">
        ${schoolLogoUrl ? `<img src="${escapeHtml(schoolLogoUrl)}" alt="" width="32" height="32" style="display:block;width:32px;height:32px;object-fit:contain;border-radius:6px">` : ""}
        <span style="font-size:13px;color:#657773">${escapeHtml(schoolName)}</span>
      </div>`
    : "";
  const brandHeader = appLogoUrl
    ? `<img src="${escapeHtml(appLogoUrl)}" alt="${escapeHtml(input.appName)}" width="190" style="display:block;max-width:190px;height:auto">`
    : `<div style="font-size:24px;font-weight:700;color:#173b40">${escapeHtml(input.appName)}</div>`;
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f8f6">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">Your secure password reset link expires in ${input.expiresInMinutes} minutes.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f4f8f6">
      <tr>
        <td align="center" style="padding:32px 16px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #dce8e3;border-radius:10px">
            <tr>
              <td style="padding:28px 32px 20px">${brandHeader}</td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;font-family:Arial,Helvetica,sans-serif;color:#173b40;line-height:1.55">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:700">Reset your password</h1>
                <p style="margin:0 0 14px;font-size:15px">Hi ${escapeHtml(greetingName)},</p>
                <p style="margin:0 0 22px;font-size:15px;color:#465c59">A password reset was requested for your ${schoolName ? `${escapeHtml(schoolName)} ` : ""}${escapeHtml(input.appName)} account.</p>
                <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#173b40;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px;font-weight:700">Reset password</a>
                <p style="margin:22px 0 0;font-size:13px;color:#657773">This secure link expires in ${input.expiresInMinutes} minutes and can only be used once.</p>
                <p style="margin:10px 0 0;font-size:13px;color:#657773">If you did not request this reset, you can safely ignore this email.</p>
                ${schoolIdentity}
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#71817e">Need help? <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#173b40">${escapeHtml(input.supportEmail)}</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, subject, text };
}

function getAbsoluteAssetUrl(assetUrl: string, appOrigin: string) {
  const trimmedAssetUrl = assetUrl.trim();

  if (!trimmedAssetUrl) {
    return "";
  }

  try {
    return new URL(trimmedAssetUrl, appOrigin).toString();
  } catch {
    return "";
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };

    return entities[character];
  });
}
