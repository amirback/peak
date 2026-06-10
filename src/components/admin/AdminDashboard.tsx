"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Users, BookOpen, TrendingUp, Shield, Search, UserX, UserCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatRelativeTime } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

export function AdminDashboard() {
  const t = useTranslations();
  const { toast } = useToast();
  const [stats, setStats] = useState({ total: 0, activeWeek: 0, courses: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [{ count: total }, { count: activeWeek }, { count: courses }, { data: rawUsers }, { data: rawCourses }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_date", weekAgo.split("T")[0]),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("courses").select("*, enrollments(id), teacher:profiles!teacher_id(full_name)").eq("is_published", true).order("created_at", { ascending: false }).limit(10),
      ]);

      setStats({ total: total || 0, activeWeek: activeWeek || 0, courses: courses || 0 });
      setUsers(rawUsers || []);
      setTopCourses((rawCourses || []).map((c: any) => ({ ...c, students: c.enrollments?.length || 0 })));
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSetRole = async (userId: string, role: string) => {
    const supabase = createClient();
    await supabase.from("profiles").update({ role }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    toast({ title: `Роль изменена на ${role}` });
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.id.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-blue-500" />
        <h1 className="text-2xl font-bold text-slate-800">{t("admin.title")}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><Users className="h-4 w-4 text-blue-500" /></div><div><p className="text-xs text-slate-500">{t("admin.totalUsers")}</p><p className="text-xl font-bold text-slate-800">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-emerald-500" /></div><div><p className="text-xs text-slate-500">{t("admin.activeWeek")}</p><p className="text-xl font-bold text-slate-800">{stats.activeWeek}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center"><BookOpen className="h-4 w-4 text-amber-500" /></div><div><p className="text-xs text-slate-500">{t("admin.totalCourses")}</p><p className="text-xl font-bold text-slate-800">{stats.courses}</p></div></div></CardContent></Card>
      </div>

      {/* Top Courses Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t("admin.topCourses")}</CardTitle></CardHeader>
        <CardContent>
          {topCourses.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCourses.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="title" tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => v.slice(0, 12) + "..."} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 8 }} formatter={(v: any) => [v, "учеников"]} />
                <Bar dataKey="students" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("admin.users")}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск пользователей..." className="pl-8 h-8 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <div key={user.id} className="flex items-center gap-4 px-6 py-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">{user.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-400">{user.last_active_date ? `Был: ${formatRelativeTime(user.last_active_date)}` : "Не было активности"}</p>
                  </div>
                  <p className="text-xs text-slate-500">{user.xp} XP</p>
                  <Select value={user.role} onValueChange={v => handleSetRole(user.id, v)}>
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Ученик</SelectItem>
                      <SelectItem value="teacher">Учитель</SelectItem>
                      <SelectItem value="admin">Админ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
