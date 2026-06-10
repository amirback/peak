"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, CheckCircle, FileText, Download, Play, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getYouTubeId, getVimeoId, secondsToTime, calculateXP } from "@/lib/utils";
import { QuizSection } from "@/components/quiz/QuizSection";
import { CommentsSection } from "@/components/lessons/CommentsSection";
import type { LessonProgress, QuizAttempt } from "@/types";

interface Props {
  lesson: any;
  courseId: string;
  courseTitle: string;
  userId: string;
  userRole: string;
  progress: LessonProgress | null;
  latestAttempt: QuizAttempt | null;
  prevLessonId: string | null;
  nextLessonId: string | null;
}

export function LessonView({ lesson, courseId, courseTitle, userId, userRole, progress, latestAttempt, prevLessonId, nextLessonId }: Props) {
  const t = useTranslations();
  const { toast } = useToast();
  const [isCompleted, setIsCompleted] = useState(progress?.status === "completed");
  const [timeSpent, setTimeSpent] = useState(progress?.time_spent_seconds || 0);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (userRole === "student" && progress?.status !== "completed") {
      const supabase = createClient();
      supabase.from("lesson_progress").upsert({
        student_id: userId, lesson_id: lesson.id,
        status: "in_progress",
        started_at: progress?.started_at || new Date().toISOString(),
        time_spent_seconds: progress?.time_spent_seconds || 0,
      }, { onConflict: "student_id,lesson_id" });
    }

    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      if (userRole === "student") {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const supabase = createClient();
        supabase.from("lesson_progress").upsert({
          student_id: userId, lesson_id: lesson.id,
          time_spent_seconds: (progress?.time_spent_seconds || 0) + elapsed,
        }, { onConflict: "student_id,lesson_id" });
      }
    };
  }, []);

  const handleMarkComplete = async () => {
    const supabase = createClient();
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const totalTime = (progress?.time_spent_seconds || 0) + elapsed;

    await supabase.from("lesson_progress").upsert({
      student_id: userId, lesson_id: lesson.id,
      status: "completed",
      time_spent_seconds: totalTime,
      completed_at: new Date().toISOString(),
      started_at: progress?.started_at || new Date().toISOString(),
    }, { onConflict: "student_id,lesson_id" });

    const { data: profile } = await supabase.from("profiles").select("xp, streak_count, last_active_date").eq("id", userId).single();
    const xpGain = calculateXP("lesson_complete");
    const today = new Date().toISOString().split("T")[0];
    const lastActive = profile?.last_active_date;
    let newStreak = profile?.streak_count || 0;
    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      newStreak = lastActive === yesterday ? newStreak + 1 : 1;
    }
    await supabase.from("profiles").update({ xp: (profile?.xp || 0) + xpGain, streak_count: newStreak, last_active_date: today }).eq("id", userId);

    if (newStreak === 7) {
      await supabase.from("badges").upsert({ user_id: userId, badge_type: "streak_7" }, { onConflict: "user_id,badge_type" });
      await supabase.from("notifications").insert({ user_id: userId, type: "badge_earned", content: "Бейдж «7 дней подряд» получен!", link: "/profile" });
    }

    // Check course completion
    const { data: courseData } = await supabase.from("lessons").select("id").eq("course_id", courseId);
    const lessonIds = (courseData || []).map((l: any) => l.id);
    const { count } = await supabase.from("lesson_progress").select("*", { count: "exact", head: true }).eq("student_id", userId).in("lesson_id", lessonIds).eq("status", "completed");
    if (count === lessonIds.length) {
      await supabase.from("certificates").upsert({ student_id: userId, course_id: courseId }, { onConflict: "student_id,course_id" });
      await supabase.from("notifications").insert({ user_id: userId, type: "course_completed", content: `Вы завершили курс «${courseTitle}»!`, link: `/certificate/${userId}-${courseId}` });
      await supabase.from("badges").upsert({ user_id: userId, badge_type: "course_grad" }, { onConflict: "user_id,badge_type" });
      toast({ title: "Курс завершён!", description: "Вы получили сертификат", variant: "default" });
    }

    setIsCompleted(true);
    clearInterval(timerRef.current);
    toast({ title: `+${xpGain} XP`, description: t("lessons.completed"), variant: "default" });
  };

  const youtubeId = lesson.video_url ? getYouTubeId(lesson.video_url) : null;
  const vimeoId = lesson.video_url && !youtubeId ? getVimeoId(lesson.video_url) : null;
  const isDirectVideo = lesson.video_url && !youtubeId && !vimeoId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href={`/courses/${courseId}`} className="hover:text-slate-700 transition-colors">{courseTitle}</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{lesson.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">{lesson.title}</h1>
        <div className="flex items-center gap-2 shrink-0">
          {userRole === "student" && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {secondsToTime(timeSpent)}
            </div>
          )}
          {isCompleted ? (
            <Badge variant="mint" className="gap-1"><CheckCircle className="h-3 w-3" />{t("lessons.completed")}</Badge>
          ) : null}
        </div>
      </div>

      {/* Video */}
      {lesson.video_url && (
        <div className="rounded-xl overflow-hidden bg-black aspect-video">
          {youtubeId && (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          )}
          {vimeoId && (
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}`}
              className="w-full h-full"
              allowFullScreen
            />
          )}
          {isDirectVideo && (
            <video src={lesson.video_url} controls className="w-full h-full" />
          )}
        </div>
      )}

      {/* Content */}
      {lesson.content && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="prose-content" dangerouslySetInnerHTML={{ __html: lesson.content }} />
        </div>
      )}

      {/* Materials */}
      {lesson.materials && lesson.materials.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            {t("lessons.materials")}
          </h3>
          <div className="space-y-2">
            {lesson.materials.map((m: any) => (
              <a
                key={m.id}
                href={m.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{m.file_name}</p>
                  <p className="text-xs text-slate-400">{m.file_type}</p>
                </div>
                <Download className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Mark Complete */}
      {userRole === "student" && !isCompleted && (
        <div className="flex justify-center">
          <Button onClick={handleMarkComplete} size="lg" className="gap-2 px-8">
            <CheckCircle className="h-5 w-5" />
            {t("lessons.markComplete")}
          </Button>
        </div>
      )}

      {/* Quiz */}
      {lesson.quiz && (
        <QuizSection
          quiz={lesson.quiz}
          userId={userId}
          userRole={userRole}
          latestAttempt={latestAttempt}
          onComplete={(score) => {
            if (score === 100 && userRole === "student") {
              const supabase = createClient();
              supabase.from("badges").upsert({ user_id: userId, badge_type: "perfect_quiz" }, { onConflict: "user_id,badge_type" });
              supabase.from("notifications").insert({ user_id: userId, type: "badge_earned", content: "Бейдж «Идеальный тест» получен!", link: "/profile" });
            }
          }}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        {prevLessonId ? (
          <Link href={`/courses/${courseId}/lessons/${prevLessonId}`}>
            <Button variant="outline" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              {t("lessons.prev")}
            </Button>
          </Link>
        ) : (
          <Link href={`/courses/${courseId}`}>
            <Button variant="outline" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              {t("lessons.back")}
            </Button>
          </Link>
        )}
        {nextLessonId && (
          <Link href={`/courses/${courseId}/lessons/${nextLessonId}`}>
            <Button className="gap-2">
              {t("lessons.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Comments */}
      <CommentsSection lessonId={lesson.id} userId={userId} />
    </div>
  );
}
