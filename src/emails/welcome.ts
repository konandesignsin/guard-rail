export interface WelcomeEmailProps {
  name: string | null;
  appUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function welcomeEmailHtml({ name, appUrl }: WelcomeEmailProps): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";

  const steps = [
    {
      title: "Paste a repository link",
      body: "Copy any public GitHub repository URL into the scanner on your dashboard.",
    },
    {
      title: "Get your audit score",
      body: "Guardrail checks the code for leaked API secrets, open database policies, and quality risks, then gives it a score out of 100.",
    },
    {
      title: "Fix issues in plain English",
      body: "Every finding comes with a simple explanation and an exact fix, so you can ship with confidence.",
    },
  ];

  const stepRows = steps
    .map(
      (step, i) => `
      <tr>
        <td style="padding: 0 0 18px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="width: 28px; vertical-align: top;">
                <div style="width: 24px; height: 24px; line-height: 24px; border-radius: 12px; background-color: #16a34a; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; text-align: center;">${i + 1}</div>
              </td>
              <td style="padding-left: 12px; vertical-align: top;">
                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; color: #111827; padding-bottom: 2px;">${step.title}</div>
                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 22px; color: #4b5563;">${step.body}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to Guardrail</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
            <tr>
              <td style="padding: 32px 40px 0 40px;">
                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 0.08em; color: #111827;">GUARDRAIL<span style="color: #16a34a;">.</span></div>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 40px 8px 40px;">
                <h1 style="margin: 0 0 12px 0; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700; color: #111827;">Welcome to Guardrail</h1>
                <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #4b5563;">
                  ${greeting} Your account is ready. Guardrail audits the apps you build for the security mistakes that most often slip into generated code &mdash; before an attacker finds them first.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 40px 8px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${stepRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 40px 32px 40px;">
                <a href="${appUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 8px;">Run your first scan</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 28px 40px;">
                <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #4b5563;">
                  If you have any questions, just reply to this email &mdash; we read every message.
                </p>
                <p style="margin: 16px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #4b5563;">
                  &mdash; The Guardrail team
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 40px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #9ca3af;">
                  You are receiving this email because you created a Guardrail account.
                  <a href="${appUrl}" style="color: #9ca3af;">Guardrail</a> scans public repositories for leaked secrets and security risks.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
