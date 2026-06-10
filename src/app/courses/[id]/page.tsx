import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { CourseDetailPage } from "@/components/courses/CourseDetailPage";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const { data: course } = await supabase
    .from("courses")
    .select("*, teacher:profiles!teacher_id(full_name, avatar_url), lessons(*, quiz:quizzes(id))")
    .eq("id", id)
    .single();

  if (!course) notFound();

  const { data: enrollment } = await supabase.from("enrollments").select("id").eq("student_id", user.id).eq("course_id", id).maybeSingle();
  const { data: progresses } = await supabase.from("lesson_progress").select("*").eq("student_id", user.id).in("lesson_id", course.lessons.map((l: any) => l.id));

  return (
    <AppShell profile={profile}>
      <CourseDetailPage
        course={course}
        userId={user.id}
        userRole={profile?.role || "student"}
        isEnrolled={!!enrollment}
        progresses={progresses || []}
      />
    </AppShell>
  );
}
