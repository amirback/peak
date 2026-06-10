"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Trophy, Zap, Flame, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getLevel } from "@/lib/utils";
import type { Profile } from "@/types";

interface Props { currentUserId: string; }

export function LeaderboardPage({ currentUserId }: Props) {
  const t = useTranslations();
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("xp", { ascending: false })
        .limit(50);
      setStudents(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-amber-400";
    if (rank === 2) return "text-slate-400";
    if (rank === 3) return "text-amber-600";
    return "text-slate-400";
  };

  const getRowBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-blue-50 border border-blue-200";
    if (rank === 1) return "bg-amber-50/50";
    return "";
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          {t("gamification.leaderboard")}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Топ учеников по XP</p>
      </div>

      {/* Top 3 podium */}
      {!loading && students.length >= 3 && (
        <div className="flex items-end justify-center gap-4 pb-4">
          {[students[1], students[0], students[2]].map((s, i) => {
            const positions = [2, 1, 3];
            const heights = ["h-20", "h-28", "h-16"];
            const rank = positions[i];
            return (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarImage src={s.avatar_url || undefined} />
                  <AvatarFallback>{s.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <p className="text-xs font-medium text-slate-700 text-center max-w-[80px] truncate">{s.full_name.split(" ")[0]}</p>
                <p className="text-xs text-slate-500">{s.xp} XP</p>
                <div className={`${heights[i]} w-20 rounded-t-xl flex items-start justify-center pt-2 ${rank === 1 ? "bg-amber-100" : rank === 2 ? "bg-slate-100" : "bg-orange-50"}`}>
                  <span className={`text-2xl font-bold ${getMedalColor(rank)}`}>{rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-slate-400">Пока нет данных</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {students.map((student, idx) => {
                const rank = idx + 1;
                const isCurrentUser = student.id === currentUserId;
                const levelInfo = getLevel(student.xp);
                return (
                  <div key={student.id} className={`flex items-center gap-4 px-6 py-3.5 transition-colors ${getRowBg(rank, isCurrentUser)}`}>
                    <div className="w-6 text-center">
                      {rank <= 3 ? (
                        <Medal className={`h-5 w-5 mx-auto ${getMedalColor(rank)}`} />
                      ) : (
                        <span className="text-sm font-medium text-slate-400">{rank}</span>
                      )}
                    </div>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={student.avatar_url || undefined} />
                      <AvatarFallback className="text-sm">{student.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${isCurrentUser ? "text-blue-600" : "text-slate-800"}`}>{student.full_name}</p>
                        {isCurrentUser && <Badge className="text-[10px] h-4 px-1.5">Вы</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">{levelInfo.title} · Ур. {levelInfo.level}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {student.streak_count > 0 && (
                        <div className="flex items-center gap-1 text-xs text-orange-500">
                          <Flame className="h-3 w-3" />
                          {student.streak_count}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
                        <Zap className="h-3.5 w-3.5 text-blue-500" />
                        {student.xp}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
