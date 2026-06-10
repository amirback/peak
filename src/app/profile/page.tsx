import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ProfilePage } from "@/components/profile/ProfilePage";

export default async function Profile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: badges } = await supabase.from("badges").select("*").eq("user_id", user.id);

  return (
    <AppShell profile={profile}>
      <ProfilePage profile={profile} badges={badges || []} userEmail={user.email || ""} />
    </AppShell>
  );
}
