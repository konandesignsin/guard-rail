import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { aiExplanationFeedback } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser();
    let body: {
      findingId?: string;
      cacheKey?: string;
      feedback?: "up" | "down";
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { findingId, cacheKey, feedback } = body;
    if (!findingId || !feedback || (feedback !== "up" && feedback !== "down")) {
      return NextResponse.json(
        { error: "findingId and feedback ('up' | 'down') are required." },
        { status: 400 }
      );
    }

    await db.insert(aiExplanationFeedback).values({
      userId: user.id,
      findingId,
      cacheKey: cacheKey || null,
      feedback,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/ai/feedback] Error:", err);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
}
