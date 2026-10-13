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
    return new Response(null, { status: 200 });
  }

  const name =
    [first_name, last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ") || null;

  await db
    .insert(users)
    .values({ clerkId: id, email, name, emailOptIn: true, emailsSinceActive: 0 })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email, name, emailOptIn: true },
    });

  try {
    const { error } = await sendWelcomeEmail(email, name);
    if (error) {
      console.error("[clerk webhook] welcome email failed:", error.message);
    }
  } catch (err) {
    console.error(
      "[clerk webhook] welcome email crashed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  return new Response(null, { status: 200 });
}
