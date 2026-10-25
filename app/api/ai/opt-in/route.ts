import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { resolveProviderConfig, isEmailAllowed } from "@/lib/ai";
import { AI_PROVIDER_NAME } from "@/lib/legal";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser();
    const config = resolveProviderConfig();
    const emailAllowed = isEmailAllowed(user.email);

    return NextResponse.json({
      aiEnabled: config.enabled,
      emailAllowed,
      userOptIn: !!user.aiOptIn,
      optedInAt: user.aiOptInAt?.toISOString() || null,
      provider: AI_PROVIDER_NAME,
    });
  } catch (err) {
    console.error("[api/ai/opt-in GET] Error:", err);
    return NextResponse.json({ error: "Failed to load AI preferences" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser();
    let body: { enabled?: boolean } = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === "object") {
        body = parsed;
      }
    } catch {
      // Allow empty POST body to default to enabling AI (used by simple opt-in buttons)
      body = { enabled: true };
    }

    const enabled = body.enabled !== undefined ? Boolean(body.enabled) : true;
    const now = enabled ? new Date() : null;

    await db
      .update(users)
      .set({
        aiOptIn: enabled,
        aiOptInAt: now,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      userOptIn: enabled,
      optedInAt: now?.toISOString() || null,
    });
  } catch (err) {
    console.error("[api/ai/opt-in POST] Error:", err);
    return NextResponse.json({ error: "Failed to update AI opt-in status" }, { status: 500 });
  }
}
