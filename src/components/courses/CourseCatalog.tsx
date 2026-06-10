"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Search, BookOpen, Users, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import type { Course } from "@/types";

interface Props { userId: string; }

export function CourseCatalog({ userId }: Props) {
  const t = useTranslations();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [{ data: rawCourses }, { data: enrollments }] = await Promise.all([
        supabase.from("courses").select("*, teacher:profiles!teacher_id(full_name, avatar_url), lessons(id), enrollments(id)").eq("is_published", true).order("created_at", { ascending: false }),
        supabase.from("enrollments").select("course_id").eq("student_id", userId),
      ]);
      if (rawCourses) {
        setCourses(rawCourses.map((c: any) => ({
          ...c,
          lessonCount: c.lessons?.length || 0,
          studentCount: c.enrollments?.length || 0,
        })));
      }
      if (enrollments) setEnrolledIds(new Set(enrollments.map((e: any) => e.course_id)));
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    const supabase = createClient();
    const { error } = await supabase.from("enrollments").insert({ student_id: userId, course_id: courseId });
    if (!error) {
      setEnrolledIds(prev => new Set([...prev, courseId]));
      // Award XP and check badges
      const { data: currentProfile } = await supabase.from("profiles").select("xp").eq("id", userId).single();
      const newXp = (currentProfile?.xp || 0) + 10;
      await supabase.from("profiles").update({ xp: newXp }).eq("id", userId);

      const { count } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("student_id", userId);
      if (count === 1) {
        await supabase.from("badges").upsert({ user_id: userId, badge_type: "first_course" }, { onConflict: "user_id,badge_type" });
        await supabase.from("notifications").insert({ user_id: userId, type: "badge_earned", content: "Вы получили бейдж «Первый курс»!", link: "/profile" });
      }
      await supabase.from("notifications").insert({
        user_id: userId, type: "new_lesson", content: `Вы успешно записались на курс`, link: `/courses/${courseId}`
      });
      toast({ title: "Вы записались на курс!", variant: "default" });
    }
    setEnrollingId(null);
  };

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("courses.catalog")}</h1>
        <p className="text-slate-500 mt-1 text-sm">{filtered.length} курсов</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder={t("courses.search")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-52 bg-white/70 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{t("courses.noCourses")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(course => {
            const isEnrolled = enrolledIds.has(course.id);
            return (
              <Card key={course.id} className="overflow-hidden flex flex-col hover:border-blue-200 hover:shadow-md transition-all bg-white/90">
                <Link href={isEnrolled ? `/courses/${course.id}` : "#"} className={isEnrolled ? "" : "pointer-events-none"}>
                  {course.cover_url ? (
                    <div className="h-28 sm:h-36 overflow-hidden">
                      <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="h-28 sm:h-36 bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-blue-300" />
                    </div>
                  )}
                </Link>
                <CardContent className="p-3 sm:p-4 flex flex-col flex-1">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2 text-sm">{course.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2 hidden sm:block">{course.description}</p>

                    <div className="flex items-center gap-1.5 mb-2">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={course.teacher?.avatar_url} />
                        <AvatarFallback className="text-[9px]">{course.teacher?.full_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-slate-400 truncate">{course.teacher?.full_name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-0.5"><BookOpen className="h-3 w-3" />{course.lessonCount}</span>
                      <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{course.studentCount}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    {isEnrolled ? (
                      <Link href={`/courses/${course.id}`}>
                        <Button variant="mint" className="w-full gap-1.5 text-xs h-8">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {t("courses.continue")}
                        </Button>
                      </Link>
                    ) : (
                      <Button className="w-full text-xs h-8" onClick={() => handleEnroll(course.id)} disabled={enrollingId === course.id}>
                        {enrollingId === course.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("courses.enroll")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
