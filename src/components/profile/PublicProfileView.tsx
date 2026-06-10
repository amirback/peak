"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FollowButton } from "./FollowButton";
import { MessageSquare, Zap, Flame, Calendar } from "lucide-react";
import { getLevel, formatDate } from "@/lib/utils";
import type { Profile, Badge as BadgeType, FollowStatus } from "@/types";

const BADGE_DATA: Record<string, { icon: string; label: string }> = {
  first_course: { icon: "🎓", label: "Первый курс" },
  perfect_quiz: { icon: "✨", label: "Идеальный тест" },
  streak_7: { icon: "🔥", label: "7 дней подряд" },
  course_grad: { icon: "🏆", label: "Выпускник" },
};

const ROLE_LABELS: Record<string, string> = {
  student: "Ученик",
  teacher: "Преподаватель",
  admin: "Администратор",
};

interface Props {
  currentUserId: string;
  profile: Profile;
  badges: BadgeType[];
  followStatus: FollowStatus | null;
  followersCount: number;
  followingCount: number;
}

export function PublicProfileView({ currentUserId, profile, badges, followStatus: initialStatus, followersCount: initFollowers, followingCount }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<FollowStatus | null>(initialStatus);
  const [followersCount, setFollowersCount] = useState(initFollowers);

  const levelInfo = getLevel(profile.xp);
  const initials = profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const canMessage = status === "accepted";

  const handleMessage = async () => {
    router.push(`/messages?with=${profile.id}`);
  };

  const handleStatusChange = (newStatus: FollowStatus | null) => {
    const wasAccepted = status === "accepted";
    const nowAccepted = newStatus === "accepted";
    if (wasAccepted && !nowAccepted) setFollowersCount(f => f - 1);
    setStatus(newStatus);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24 shrink-0">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-slate-800">{profile.full_name}</h1>
              {profile.username && (
                <p className="text-blue-500 font-medium mt-0.5">@{profile.username}</p>
              )}
              <p className="text-sm text-slate-500 mt-1">{ROLE_LABELS[profile.role] || profile.role}</p>
              {profile.bio && <p className="text-sm text-slate-600 mt-3 max-w-md">{profile.bio}</p>}

              <div className="flex items-center justify-center sm:justify-start gap-6 mt-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{followersCount}</p>
                  <p className="text-xs text-slate-500">Подписчики</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{followingCount}</p>
                  <p className="text-xs text-slate-500">Подписки</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{profile.xp}</p>
                  <p className="text-xs text-slate-500">XP</p>
                </div>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                <FollowButton
                  currentUserId={currentUserId}
                  targetUserId={profile.id}
                  initialStatus={status}
                  onStatusChange={handleStatusChange}
                />
                {canMessage && (
                  <Button variant="outline" size="sm" onClick={handleMessage} className="gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    Написать
                  </Button>
                )}
              </div>

              {status === "pending" && (
                <p className="text-xs text-slate-400 mt-2">После принятия запроса вы сможете написать сообщение</p>
              )}
              {status === null && (
                <p className="text-xs text-slate-400 mt-2">Подпишитесь, чтобы открыть чат</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">{levelInfo.level}</div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{levelInfo.title}</p>
                <p className="text-xs text-slate-500">{profile.xp} XP до уровня {levelInfo.level + 1}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex items-center gap-1"><Flame className="h-4 w-4 text-orange-500" />{profile.streak_count} дней</div>
            </div>
          </div>
          <Progress value={Math.min((profile.xp / levelInfo.nextLevelXp) * 100, 100)} className="h-2" />
        </CardContent>
      </Card>

      {/* Badges */}
      {badges.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Достижения</h2>
            <div className="flex flex-wrap gap-3">
              {badges.map(badge => {
                const data = BADGE_DATA[badge.badge_type];
                return (
                  <div key={badge.id} className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-3xl">{data?.icon || "🏅"}</span>
                    <span className="text-xs text-slate-600 font-medium">{data?.label || badge.badge_type}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
