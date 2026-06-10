"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { BookOpen, Users, TrendingUp, Plus, ChevronRight, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Profile, Course } from "@/types";

interface Props { profile: Profile; }

export function TeacherDashboard({ profile }: Props) {
  const t = useTranslations();
  const [courses, setCourses] = useState<(Course & { studentCount: number; lessonCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data: rawCourses } = await supabase
        .from("courses")
        .select("*, lessons(id), enrollments(id)")
        .eq("teacher_id", profile.id)
        .order("created_at", { ascending: false });

      if (rawCourses) {
        const enriched = rawCourses.map((c: any) => ({
          ...c,
          lessonCount: c.lessons?.length || 0,
          studentCount: c.enrollments?.length || 0,
        }));
        setCourses(enriched);
        setTotalStudents(enriched.reduce((acc: number, c: any) => acc + c.studentCount, 0));
      }
      setLoading(false);
    };
    fetch();
  }, [profile.id]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("dashboard.welcome")}, {profile.full_name.split(" ")[0]}</h1>
          <p className="text-slate-500 mt-1 text-sm">Преподаватель</p>
        </div>
        <Link href="/teacher/courses">
          <Button className="gap-2"><Plus className="h-4 w-4" />{t("courses.newCourse")}</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Курсов</p>
                <p className="text-xl font-bold text-slate-800">{courses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("teacher.students")}</p>
                <p className="text-xl font-bold text-slate-800">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Опубликовано</p>
                <p className="text-xl font-bold text-slate-800">{courses.filter(c => c.is_published).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">{t("courses.myCourses")}</h2>
          <Link href="/teacher/courses"><Button variant="ghost" size="sm" className="gap-1">Все курсы <ChevronRight className="h-4 w-4" /></Button></Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">{t("courses.noCourses")}</p>
              <Link href="/teacher/courses"><Button>{t("courses.newCourse")}</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.slice(0, 6).map(course => (
              <Card key={course.id} className="overflow-hidden hover:border-blue-200 transition-colors">
                {course.cover_url && <div className="h-28 overflow-hidden"><img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" /></div>}
                {!course.cover_url && <div className="h-28 bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center"><BookOpen className="h-8 w-8 text-blue-300" /></div>}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-800 text-sm truncate flex-1">{course.title}</h3>
                    <Badge variant={course.is_published ? "mint" : "secondary"} className="shrink-0 text-xs">
                      {course.is_published ? t("courses.published") : t("courses.draft")}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{course.lessonCount} уроков · {course.studentCount} учеников</p>
                  <div className="flex gap-2">
                    <Link href={`/teacher/courses/${course.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1 text-xs"><Edit className="h-3 w-3" />{t("common.edit")}</Button>
                    </Link>
                    <Link href={`/teacher/courses/${course.id}/students`}>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs"><Users className="h-3 w-3" /></Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
