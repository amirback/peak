"use client";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, Clock, Users, CheckCircle, Circle, Lock, ChevronLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import type { Course, LessonProgress } from "@/types";

interface Props {
  course: any;
  userId: string;
  userRole: string;
  isEnrolled: boolean;
  progresses: LessonProgress[];
}

export function CourseDetailPage({ course, userId, userRole, isEnrolled, progresses }: Props) {
  const t = useTranslations();
  const lessons = [...(course.lessons || [])].sort((a: any, b: any) => a.order_index - b.order_index);
  const progressMap = new Map(progresses.map(p => [p.lesson_id, p]));
  const completedCount = progresses.filter(p => p.status === "completed").length;
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/courses">
        <Button variant="ghost" size="sm" className="gap-2 -ml-1 text-slate-500">
          <ChevronLeft className="h-4 w-4" />
          {t("lessons.back")}
        </Button>
      </Link>

      {/* Course Header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {course.cover_url ? (
          <div className="h-48 sm:h-64 overflow-hidden">
            <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-blue-200" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start gap-3 mb-3">
            <h1 className="text-2xl font-bold text-slate-800 flex-1">{course.title}</h1>
            {userRole === "teacher" && course.teacher?.id === userId && (
              <Link href={`/teacher/courses/${course.id}/edit`}>
                <Button variant="outline" size="sm">Редактировать</Button>
              </Link>
            )}
          </div>
          <p className="text-slate-600 mb-4 leading-relaxed">{course.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={course.teacher?.avatar_url} />
                <AvatarFallback className="text-xs">{course.teacher?.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <span>{course.teacher?.full_name}</span>
            </div>
            <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{lessons.length} {t("courses.lessons")}</span>
          </div>

          {isEnrolled && lessons.length > 0 && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Ваш прогресс</span>
                <span className="text-sm font-bold text-blue-500">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-slate-500 mt-1">{completedCount} из {lessons.length} уроков</p>
            </div>
          )}

          {progress === 100 && isEnrolled && (
            <div className="mt-3 flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              Курс завершён!{" "}
              <Link href={`/certificate/${userId}-${course.id}`} className="text-blue-500 hover:underline">Получить сертификат</Link>
            </div>
          )}
        </div>
      </div>

      {/* Lessons List */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        <div className="p-4 pb-3">
          <h2 className="font-semibold text-slate-800">Уроки курса</h2>
        </div>
        {lessons.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Уроки ещё не добавлены</div>
        ) : (
          lessons.map((lesson: any, idx: number) => {
            const lessonProgress = progressMap.get(lesson.id);
            const isDone = lessonProgress?.status === "completed";
            const isAccessible = isEnrolled || userRole === "teacher";

            return (
              <div key={lesson.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${isDone ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                  {isDone ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : isAccessible ? (
                    <span className="text-xs font-medium text-slate-500">{idx + 1}</span>
                  ) : (
                    <Lock className="h-3 w-3 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isAccessible ? (
                      <Link href={`/courses/${course.id}/lessons/${lesson.id}`} className="font-medium text-slate-800 hover:text-blue-500 transition-colors truncate">
                        {lesson.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-400 truncate">{lesson.title}</span>
                    )}
                    {lesson.quiz && <Badge variant="outline" className="text-[10px] h-4 shrink-0">Тест</Badge>}
                    {lesson.video_url && <Badge variant="secondary" className="text-[10px] h-4 shrink-0">Видео</Badge>}
                  </div>
                  {lesson.deadline && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {formatDate(lesson.deadline)}
                    </p>
                  )}
                </div>

                {isDone && <Badge variant="mint" className="text-xs shrink-0">Пройден</Badge>}
                {!isDone && isAccessible && (
                  <Link href={`/courses/${course.id}/lessons/${lesson.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs">
                      {lessonProgress?.status === "in_progress" ? t("courses.continue") : t("courses.start")}
                    </Button>
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
