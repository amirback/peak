import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LessonView } from "@/components/lessons/LessonView";

export default async function LessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*, materials:lesson_materials(*), quiz:quizzes(*, questions:quiz_questions(*))")
    .eq("id", lessonId)
    .eq("course_id", id)
    .single();

  if (!lesson) notFound();

  const { data: course } = await supabase.from("courses").select("id, title, teacher_id, lessons(id, order_index)").eq("id", id).single();
  if (!course) notFound();

  // Check access
  const isTeacher = profile?.role === "teacher" && course.teacher_id === user.id;
  if (!isTeacher) {
    const { data: enrollment } = await supabase.from("enrollments").select("id").eq("student_id", user.id).eq("course_id", id).maybeSingle();
    if (!enrollment) redirect(`/courses/${id}`);
  }

  const { data: progress } = await supabase.from("lesson_progress").select("*").eq("student_id", user.id).eq("lesson_id", lessonId).maybeSingle();
  const { data: attempts } = await supabase.from("quiz_attempts").select("*").eq("student_id", user.id).eq("quiz_id", lesson.quiz?.id || "").order("attempted_at", { ascending: false });

  // Get sorted lesson ids for prev/next
  const sortedLessons = [...(course.lessons || [])].sort((a: any, b: any) => a.order_index - b.order_index);
  const currentIdx = sortedLessons.findIndex((l: any) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? sortedLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < sortedLessons.length - 1 ? sortedLessons[currentIdx + 1] : null;

  return (
    <AppShell profile={profile}>
      <LessonView
        lesson={lesson}
        courseId={id}
        courseTitle={course.title}
        userId={user.id}
        userRole={profile?.role || "student"}
        progress={progress}
        latestAttempt={attempts?.[0] || null}
        prevLessonId={prevLesson?.id || null}
        nextLessonId={nextLesson?.id || null}
      />
    </AppShell>
  );
}
