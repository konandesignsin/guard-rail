import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { SettingsClient } from "./settings-client";
import { AI_PROVIDER_NAME } from "@/lib/legal";
import { resolveProviderConfig, isEmailAllowed } from "@/lib/ai";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) notFound();

  const user = await getOrCreateUser();
  const config = resolveProviderConfig();
  const emailAllowed = isEmailAllowed(user.email);

  return (
    <Suspense fallback={<div className="p-8 text-xs font-mono text-[var(--muted)]">Loading settings...</div>}>
      <SettingsClient
        initialOptIn={user.aiOptIn}
        optedInAt={user.aiOptInAt ? user.aiOptInAt.toISOString() : null}
        aiEnabledGlobal={config.enabled}
        emailAllowed={emailAllowed}
        providerName={AI_PROVIDER_NAME}
      />
    </Suspense>
  );
}
