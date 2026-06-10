import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PublicProfileView } from "@/components/profile/PublicProfileView";

interface Props { params: Promise<{ username: string }> }

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: targetProfile } = await supabase.from("profiles").select("*").ilike("username", username).single();
  if (!targetProfile) notFound();

  // Redirect to own profile page
  if (targetProfile.id === user.id) redirect("/profile");

  // Get follow status
  const { data: followData } = await supabase
    .from("follows")
    .select("*")
    .eq("follower_id", user.id)
    .eq("following_id", targetProfile.id)
    .maybeSingle();

  // Get badges
  const { data: badges } = await supabase.from("badges").select("*").eq("user_id", targetProfile.id);

  // Get counts
  const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetProfile.id).eq("status", "accepted"),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", targetProfile.id).eq("status", "accepted"),
  ]);

  return (
    <AppShell profile={currentProfile}>
      <PublicProfileView
        currentUserId={user.id}
        profile={targetProfile}
        badges={badges || []}
        followStatus={followData?.status || null}
        followersCount={followersCount || 0}
        followingCount={followingCount || 0}
      />
    </AppShell>
  );
}
