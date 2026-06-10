import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StudentDashboard } from "@/components/courses/StudentDashboard";
import { TeacherDashboard } from "@/components/courses/TeacherDashboard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  return (
    <AppShell profile={profile}>
      {profile.role === "teacher" ? (
        <TeacherDashboard profile={profile} />
      ) : (
        <StudentDashboard profile={profile} />
      )}
    </AppShell>
  );
}
