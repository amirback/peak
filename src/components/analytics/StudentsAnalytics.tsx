"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Users, TrendingUp, Award, UserX, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface Props { course: any; }

export function StudentsAnalytics({ course }: Props) {
  const t = useTranslations();
  const { toast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);

  const totalLessons = course.lessons?.length || 0;
  const lessonIds = (course.lessons || []).map((l: any) => l.id);

  const fetchStudents = async () => {
    const supabase = createClient();
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("*, student:profiles!student_id(*)")
      .eq("course_id", course.id)
      .order("enrolled_at", { ascending: false });

    if (!enrollments) { setLoading(false); return; }

    const enriched = await Promise.all(enrollments.map(async (e: any) => {
      const [{ data: progresses }, { data: attempts }] = await Promise.all([
        supabase.from("lesson_progress").select("*").eq("student_id", e.student_id).in("lesson_id", lessonIds),
        supabase.from("quiz_attempts").select("score, attempted_at").eq("student_id", e.student_id).order("attempted_at", { ascending: false }),
      ]);

      const completed = (progresses || []).filter((p: any) => p.status === "completed").length;
      const pct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
      const lastActivity = (progresses || []).reduce((acc: any, p: any) => {
        const d = p.completed_at || p.started_at;
        if (!acc || (d && d > acc)) return d;
        return acc;
      }, null);
      const avgScore = attempts && attempts.length > 0 ? Math.round(attempts.reduce((acc: number, a: any) => acc + a.score, 0) / attempts.length) : null;

      return { ...e, progresses: progresses || [], attempts: attempts || [], completedLessons: completed, percentage: pct, lastActivity, avgScore };
    }));

    setStudents(enriched);

    // Daily progress chart data (last 14 days)
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      days[d] = 0;
    }
    enriched.forEach((s: any) => {
      s.progresses.forEach((p: any) => {
        if (p.completed_at) {
          const d = p.completed_at.split("T")[0];
          if (d in days) days[d]++;
        }
      });
    });
    setDailyData(Object.entries(days).map(([date, count]) => ({ date: date.slice(5), completions: count })));
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm("Удалить ученика с курса?")) return;
    const supabase = createClient();
    await supabase.from("enrollments").delete().eq("student_id", studentId).eq("course_id", course.id);
    setStudents(prev => prev.filter(s => s.student_id !== studentId));
    toast({ title: "Ученик удалён с курса" });
  };

  const scoreDistribution = [
    { range: "0-20%", count: students.filter(s => s.avgScore !== null && s.avgScore <= 20).length },
    { range: "21-40%", count: students.filter(s => s.avgScore !== null && s.avgScore > 20 && s.avgScore <= 40).length },
    { range: "41-60%", count: students.filter(s => s.avgScore !== null && s.avgScore > 40 && s.avgScore <= 60).length },
    { range: "61-80%", count: students.filter(s => s.avgScore !== null && s.avgScore > 60 && s.avgScore <= 80).length },
    { range: "81-100%", count: students.filter(s => s.avgScore !== null && s.avgScore > 80).length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/teacher/courses/${course.id}/edit`}><Button variant="ghost" size="sm" className="gap-1 text-slate-500"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t("teacher.progress")}</h1>
          <p className="text-sm text-slate-500">{course.title}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><Users className="h-4 w-4 text-blue-500" /></div><div><p className="text-xs text-slate-500">{t("teacher.students")}</p><p className="text-xl font-bold text-slate-800">{students.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-emerald-500" /></div><div><p className="text-xs text-slate-500">Сред. прогресс</p><p className="text-xl font-bold text-slate-800">{students.length > 0 ? Math.round(students.reduce((acc, s) => acc + s.percentage, 0) / students.length) : 0}%</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center"><Award className="h-4 w-4 text-amber-500" /></div><div><p className="text-xs text-slate-500">Сред. балл</p><p className="text-xl font-bold text-slate-800">{students.filter(s => s.avgScore !== null).length > 0 ? Math.round(students.filter(s => s.avgScore !== null).reduce((acc, s) => acc + s.avgScore, 0) / students.filter(s => s.avgScore !== null).length) : "—"}%</p></div></div></CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-700">{t("teacher.dailyProgress")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 8 }} />
                <Line type="monotone" dataKey="completions" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-700">{t("teacher.scoreDistribution")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#6EE7B7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t("teacher.students")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-slate-400">{t("teacher.noStudents")}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {students.map(s => (
                <div key={s.student_id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={s.student?.avatar_url} />
                    <AvatarFallback className="text-xs">{s.student?.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{s.student?.full_name}</p>
                    <p className="text-xs text-slate-500">{s.lastActivity ? formatRelativeTime(s.lastActivity) : "Не было активности"}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 w-32">
                    <Progress value={s.percentage} className="h-1.5 flex-1" />
                    <span className="text-xs text-slate-500 w-8 text-right">{s.percentage}%</span>
                  </div>
                  {s.avgScore !== null && (
                    <Badge variant={s.avgScore >= 80 ? "mint" : "secondary"} className="text-xs">
                      {s.avgScore}%
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs gap-1"
                    onClick={() => handleRemoveStudent(s.student_id)}
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
