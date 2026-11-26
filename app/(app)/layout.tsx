import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { AppShell } from "@/components/shell/app-shell";

// Layout grup member: semuanya butuh sesi.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  return (
    <AppShell email={user.email} credits={user.credits} demoMode={isDemoMode()}>
      {children}
    </AppShell>
  );
}
