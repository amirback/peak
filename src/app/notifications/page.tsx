import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export default async function Notifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <AppShell profile={profile}>
      <NotificationsPage userId={user.id} />
    </AppShell>
  );
}
