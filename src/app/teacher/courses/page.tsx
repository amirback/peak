import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherCoursesPage } from "@/components/courses/TeacherCoursesPage";

export default async function TeacherCourses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role !== "teacher" && profile?.role !== "admin") redirect("/dashboard");

  return (
    <AppShell profile={profile}>
      <TeacherCoursesPage userId={user.id} />
    </AppShell>
  );
}
