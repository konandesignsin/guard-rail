import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { SettingsClient } from "./settings-client";
import { AI_PROVIDER_NAME } from "@/lib/legal";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) notFound();

  const user = await getOrCreateUser();

  const aiEnabledGlobal = process.env.AI_ENABLED === "true";
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const hasKey =
    (provider === "gemini" && !!process.env.GEMINI_API_KEY) ||
    (provider === "groq" && !!process.env.GROQ_API_KEY && !!process.env.AI_MODEL);

  return (
    <Suspense fallback={<div className="p-8 text-xs font-mono text-[var(--muted)]">Loading settings...</div>}>
      <SettingsClient
        initialOptIn={user.aiOptIn}
        optedInAt={user.aiOptInAt ? user.aiOptInAt.toISOString() : null}
        aiEnabledGlobal={aiEnabledGlobal && hasKey}
        providerName={AI_PROVIDER_NAME}
      />
    </Suspense>
  );
}
