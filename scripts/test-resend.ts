import { Resend } from "resend";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY is not set. Add it to .env.local and retry.");
    process.exit(1);
  }
  if (!apiKey.startsWith("re_")) {
    console.error(
      "RESEND_API_KEY does not look valid - Resend keys start with 're_'.",
    );
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  // Step 1: verify the key itself (no email required).
  const { error: domainsError } = await resend.domains.list();
  if (domainsError) {
    console.error("Resend rejected the API key:", JSON.stringify(domainsError));
    process.exit(1);
  }
  console.log("API key is valid (Resend accepted it).");

  // Step 2: send exactly one test email, only if TEST_EMAIL is configured.
  const to = process.env.TEST_EMAIL;
  if (!to) {
    console.log(
      "TEST_EMAIL is not set, so no email was sent. " +
        "Add TEST_EMAIL=you@example.com to .env.local and run again to receive one.",
    );
    return;
  }

  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "Guardrail - Resend test email",
    html: "<p>If you can read this, Resend is wired up correctly.</p>",
  });

  if (error) {
    console.error("Resend send failed:", JSON.stringify(error));
    process.exit(1);
  }
  console.log(`Test email sent to the TEST_EMAIL address. id: ${data?.id}`);
}

main().catch((err: unknown) => {
  console.error("Unexpected error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
