import "server-only";
import { Resend } from "resend";
import { welcomeEmailHtml } from "@/src/emails/welcome";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

export async function sendWelcomeEmail(to: string, name: string | null) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Guardrail",
    html: welcomeEmailHtml({ name, appUrl }),
  });
}
