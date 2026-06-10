import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StudentsAnalytics } from "@/components/analytics/StudentsAnalytics";

export default async function StudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role !== "teacher" && profile?.role !== "admin") redirect("/dashboard");

  const { data: course } = await supabase.from("courses").select("*, lessons(id)").eq("id", id).eq("teacher_id", user.id).single();
  if (!course) notFound();

  return (
    <AppShell profile={profile}>
      <StudentsAnalytics course={course} />
    </AppShell>
  );
}
