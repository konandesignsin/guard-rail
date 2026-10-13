import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendWelcomeEmail } from "@/lib/email";

interface ClerkUserEventData {
  id: string;
  email_addresses: { id: string; email_address: string }[];
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserEventData;
}

function redactEmail(message: string, email: string): string {
  return message.split(email).join(`***@${email.split("@")[1] ?? "***"}`);
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response(
      "Server not configured: CLERK_WEBHOOK_SECRET is missing.",
      { status: 500 },
    );
  }

  const h = await headers();
  const svixHeaders = {
    "svix-id": h.get("svix-id") ?? "",
    "svix-timestamp": h.get("svix-timestamp") ?? "",
    "svix-signature": h.get("svix-signature") ?? "",
  };

  const payload = await req.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    wh.verify(payload, svixHeaders);
    console.log("[clerk webhook] signature verified");
    event = JSON.parse(payload) as ClerkWebhookEvent;
  } catch {
    return new Response("Invalid webhook signature.", { status: 400 });
  }

  if (event.type !== "user.created") {
    return new Response(null, { status: 200 });
  }

  const {
    id,
    email_addresses,
    primary_email_address_id,
    first_name,
    last_name,
  } = event.data;

  const primary =
    email_addresses.find((e) => e.id === primary_email_address_id) ??
    email_addresses[0];
  const email = primary?.email_address;

  if (!id || !email) {
    console.log("[clerk webhook] user.created skipped: missing id or email");
    return new Response(null, { status: 200 });
  }

  const name =
    [first_name, last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ") || null;

  console.log(
    "[clerk webhook] user.created parsed:",
    JSON.stringify({
      clerkId: id,
      emailDomain: email.split("@")[1] ?? "(unknown)",
      hasName: Boolean(name),
    }),
  );

  try {
    await db
      .insert(users)
      .values({ clerkId: id, email, name, emailOptIn: true, emailsSinceActive: 0 })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: { email, name, emailOptIn: true },
      });
    console.log("[clerk webhook] database insert succeeded:", { clerkId: id });
  } catch (err) {
    console.error(
      "[clerk webhook] database insert failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  const emailFrom = process.env.EMAIL_FROM?.trim();
  if (!emailFrom) {
    console.log("[clerk webhook] welcome email skipped: sender is not configured");
  } else if (emailFrom.toLowerCase() === "onboarding@resend.dev") {
    console.log("[clerk webhook] welcome email skipped: Resend test sender is configured");
  } else {
    try {
      const { data, error } = await sendWelcomeEmail(email, name);
      if (error) {
        console.error(
          "[clerk webhook] welcome email failed:",
          redactEmail(error.message, email),
        );
      } else {
        console.log("[clerk webhook] welcome email sent:", {
          messageId: data?.id,
        });
      }
    } catch (err) {
      console.error(
        "[clerk webhook] welcome email crashed:",
        redactEmail(err instanceof Error ? err.message : String(err), email),
      );
    }
  }

  return new Response(null, { status: 200 });
}
