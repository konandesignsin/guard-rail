import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function getOrCreateUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("getOrCreateUser called without a signed-in user");
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUser.id))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [row] = await db
    .insert(users)
    .values({ clerkId: clerkUser.id, email })
    .returning();

  return row;
}
