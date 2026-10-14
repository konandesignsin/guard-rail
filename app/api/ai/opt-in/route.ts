import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser();

    // Check if AI is enabled globally and API key exists
    const aiEnabled = process.env.AI_ENABLED === "true";
    const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
    const hasKey =
      (provider === "gemini" && !!process.env.GEMINI_API_KEY) ||
      (provider === "groq" && !!process.env.GROQ_API_KEY && !!process.env.AI_MODEL);

    return NextResponse.json({
      aiEnabled: aiEnabled && hasKey,
      userOptIn: !!user.aiOptIn,
      optedInAt: user.aiOptInAt?.toISOString() || null,
      provider: provider === "groq" ? "Groq" : "Google",
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
    let body: { enabled?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const enabled = Boolean(body.enabled);
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
