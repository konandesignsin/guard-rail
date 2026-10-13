import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateUser();
  await db
    .update(users)
    .set({ onboardingDismissed: true })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
