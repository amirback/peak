"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Zap, Flame, Star, BookOpen, ChevronRight, TrendingUp, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getLevel } from "@/lib/utils";
import type { Profile, Enrollment, Course, LessonProgress, Badge as BadgeType } from "@/types";

interface Props { profile: Profile; }

interface EnrolledCourse {
  course: Course;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  nextLessonId: string | null;
}

export function StudentDashboard({ profile }: Props) {
  const t = useTranslations();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [recentBadges, setRecentBadges] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();

      const [{ data: enrollments }, { data: badges }] = await Promise.all([
        supabase.from("enrollments").select("*, course:courses(*, lessons(id, order_index))").eq("student_id", profile.id),
        supabase.from("badges").select("*").eq("user_id", profile.id).order("earned_at", { ascending: false }).limit(5),
      ]);

      if (enrollments) {
        const courseData: EnrolledCourse[] = await Promise.all(
          enrollments.map(async (e: any) => {
            const lessons = e.course?.lessons || [];
            const lessonIds = lessons.map((l: any) => l.id);
            const { data: progresses } = await supabase.from("lesson_progress").select("*").eq("student_id", profile.id).in("lesson_id", lessonIds);
            const completed = (progresses || []).filter((p: LessonProgress) => p.status === "completed").length;
            const pct = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
            const sortedLessons = [...lessons].sort((a: any, b: any) => a.order_index - b.order_index);
            const completedIds = new Set((progresses || []).filter((p: LessonProgress) => p.status === "completed").map((p: LessonProgress) => p.lesson_id));
            const nextLesson = sortedLessons.find((l: any) => !completedIds.has(l.id));
            return { course: e.course, progress: pct, completedLessons: completed, totalLessons: lessons.length, nextLessonId: nextLesson?.id || null };
          })
        );
        setEnrolledCourses(courseData);
      }
      setRecentBadges(badges || []);
      setLoading(false);
    };
    fetch();
  }, [profile.id]);

  const levelInfo = getLevel(profile.xp);
  const xpToNext = levelInfo.nextLevelXp - profile.xp;
  const levelProgress = ((profile.xp - (levelInfo.level > 1 ? getLevel(profile.xp - 1).nextLevelXp : 0)) / levelInfo.nextLevelXp) * 100;

  const totalLessonsCompleted = enrolledCourses.reduce((acc, c) => acc + c.completedLessons, 0);

  const badgeIcons: Record<string, string> = {
    first_course: "🎓",
    perfect_quiz: "✨",
    streak_7: "🔥",
    course_grad: "🏆",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("dashboard.welcome")}, {profile.full_name.split(" ")[0]}</h1>
        <p className="text-slate-500 mt-1 text-sm">
          {profile.streak_count > 0 ? `${profile.streak_count} ${t("dashboard.streakDays")}` : "Начните учиться сегодня"}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Zap className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("dashboard.totalXP")}</p>
                <p className="text-xl font-bold text-slate-800">{profile.xp}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("dashboard.streak")}</p>
                <p className="text-xl font-bold text-slate-800">{profile.streak_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("dashboard.coursesEnrolled")}</p>
                <p className="text-xl font-bold text-slate-800">{enrolledCourses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("dashboard.lessonsCompleted")}</p>
                <p className="text-xl font-bold text-slate-800">{totalLessonsCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Level Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">{t("dashboard.level")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {levelInfo.level}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{levelInfo.title}</p>
                <p className="text-xs text-slate-500">{profile.xp} XP</p>
              </div>
            </div>
            <Progress value={Math.min(levelProgress, 100)} className="h-2" />
            <p className="text-xs text-slate-500 mt-2">До следующего уровня: {xpToNext} XP</p>
          </CardContent>
        </Card>

        {/* Recent Badges */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">{t("gamification.badges")}</CardTitle>
              <Link href="/leaderboard"><Button variant="ghost" size="sm" className="text-xs h-7">{t("gamification.leaderboard")}</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentBadges.length === 0 ? (
              <div className="text-center py-4">
                <Trophy className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Проходите уроки, чтобы заработать бейджи</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recentBadges.map(badge => (
                  <div key={badge.id} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-lg">{badgeIcons[badge.badge_type] || "🏅"}</span>
                    <div>
                      <p className="text-xs font-medium text-slate-700">{t(`gamification.${badge.badge_type}` as any)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Continue Learning */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">{t("dashboard.continueLeaning")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg" />)}
              </div>
            ) : enrolledCourses.filter(c => c.progress < 100 && c.nextLessonId).length === 0 ? (
              <div className="text-center py-4">
                <BookOpen className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Запишитесь на курс</p>
                <Link href="/courses"><Button variant="outline" size="sm" className="mt-2 text-xs">Каталог курсов</Button></Link>
              </div>
            ) : (
              <div className="space-y-2">
                {enrolledCourses.filter(c => c.progress < 100 && c.nextLessonId).slice(0, 3).map(c => (
                  <Link key={c.course.id} href={`/courses/${c.course.id}/lessons/${c.nextLessonId}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{c.course.title}</p>
                        <p className="text-xs text-slate-400">{c.progress}%</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">{t("dashboard.myCourses")}</h2>
          <Link href="/courses"><Button variant="ghost" size="sm" className="gap-1 text-sm">
            {t("courses.catalog")} <ChevronRight className="h-4 w-4" />
          </Button></Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : enrolledCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">{t("courses.noCourses")}</p>
              <Link href="/courses"><Button>{t("courses.catalog")}</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledCourses.map(c => (
              <Link key={c.course.id} href={`/courses/${c.course.id}`}>
                <Card className="hover:border-blue-200 transition-colors cursor-pointer overflow-hidden">
                  {c.course.cover_url && (
                    <div className="h-32 overflow-hidden">
                      <img src={c.course.cover_url} alt={c.course.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {!c.course.cover_url && (
                    <div className="h-32 bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-blue-300" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-slate-800 text-sm mb-1 truncate">{c.course.title}</h3>
                    <p className="text-xs text-slate-500 mb-3">{c.completedLessons}/{c.totalLessons} {t("courses.lessons")}</p>
                    <Progress value={c.progress} className="h-1.5" />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">{c.progress}%</span>
                      {c.progress === 100 && <Badge variant="mint" className="text-xs">Завершён</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
