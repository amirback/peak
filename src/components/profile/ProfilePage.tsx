"use client";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormData } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Camera, Save, Loader2, Zap, Flame, AtSign, CheckCircle, XCircle, Users, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getLevel, formatDate } from "@/lib/utils";
import type { Profile, Badge as BadgeType, Follow } from "@/types";
import Link from "next/link";

const BADGE_DATA: Record<string, { icon: string; label: string }> = {
  first_course: { icon: "🎓", label: "Первый курс" },
  perfect_quiz: { icon: "✨", label: "Идеальный тест" },
  streak_7: { icon: "🔥", label: "7 дней подряд" },
  course_grad: { icon: "🏆", label: "Выпускник" },
};

interface Props { profile: Profile; badges: BadgeType[]; userEmail: string; }

export function ProfilePage({ profile: initialProfile, badges, userEmail }: Props) {
  const t = useTranslations();
  const { toast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState(profile.username || "");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<Follow[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile.full_name, bio: profile.bio || "", locale: (profile.locale as any) || "ru" },
  });

  const locale = watch("locale");
  const levelInfo = getLevel(profile.xp);

  useEffect(() => {
    fetchFollowData();
  }, []);

  const fetchFollowData = async () => {
    const supabase = createClient();
    const [{ count: followersC }, { count: followingC }, { data: requests }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id).eq("status", "accepted"),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id).eq("status", "accepted"),
      supabase.from("follows").select("*, follower:profiles!follower_id(*)").eq("following_id", profile.id).eq("status", "pending"),
    ]);
    setFollowersCount(followersC || 0);
    setFollowingCount(followingC || 0);
    setPendingRequests((requests as any) || []);
  };

  const checkUsername = useCallback(async (value: string) => {
    if (!value || value === profile.username) { setUsernameStatus("idle"); return; }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(value)) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("id").ilike("username", value).neq("id", profile.id).maybeSingle();
    setUsernameStatus(data ? "taken" : "available");
  }, [profile.id, profile.username]);

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(username), 500);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRespondFollow = async (followId: string, accept: boolean) => {
    const supabase = createClient();
    await supabase.from("follows").update({ status: accept ? "accepted" : "declined" }).eq("id", followId);
    setPendingRequests(prev => prev.filter(r => r.id !== followId));
    if (accept) setFollowersCount(prev => prev + 1);
    toast({ title: accept ? "Подписка принята" : "Подписка отклонена" });
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (usernameStatus === "taken") { toast({ title: "Этот юзернейм уже занят", variant: "destructive" }); return; }
    setSaving(true);
    const supabase = createClient();
    let avatar_url = profile.avatar_url;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { data: uploadData } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        avatar_url = publicUrl;
      }
    }

    const updateData: any = { full_name: data.full_name, bio: data.bio, locale: data.locale, avatar_url };
    if (username && username !== profile.username && usernameStatus === "available") {
      updateData.username = username.toLowerCase();
    } else if (!username && profile.username) {
      // keep existing
    } else if (!username) {
      // no username set yet, skip
    }

    const { data: updated } = await supabase.from("profiles").update(updateData).eq("id", profile.id).select().single();
    if (updated) {
      setProfile(updated as Profile);
      document.cookie = `locale=${data.locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
      toast({ title: t("profile.saved") });
    }
    setSaving(false);
  };

  const initials = profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t("profile.title")}</h1>

      {/* Pending follow requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-blue-100 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Запросы на подписку ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((req) => {
              const follower = (req as any).follower as Profile;
              const fi = follower?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
              return (
                <div key={req.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={follower?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{fi}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{follower?.full_name}</p>
                    {follower?.username && <p className="text-xs text-slate-500">@{follower.username}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleRespondFollow(req.id, true)} className="gap-1 h-7 text-xs">
                      <CheckCircle className="h-3.5 w-3.5" /> Принять
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRespondFollow(req.id, false)} className="gap-1 h-7 text-xs">
                      <XCircle className="h-3.5 w-3.5" /> Отклонить
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stats Column */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar className="h-20 w-20 mx-auto">
                  <AvatarImage src={avatarPreview || profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center cursor-pointer hover:bg-blue-400 transition-colors">
                  <Camera className="h-3.5 w-3.5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
              <p className="font-semibold text-slate-800">{profile.full_name}</p>
              {profile.username && <p className="text-sm text-blue-500 mt-0.5">@{profile.username}</p>}
              <p className="text-xs text-slate-500 capitalize mt-0.5">{profile.role}</p>
              <p className="text-xs text-slate-400 mt-1">{t("profile.memberSince")} {formatDate(profile.created_at)}</p>

              <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{followersCount}</p>
                  <p className="text-xs text-slate-500">Подписчики</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{followingCount}</p>
                  <p className="text-xs text-slate-500">Подписки</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">{levelInfo.level}</div>
                  <p className="text-sm font-medium text-slate-700">{levelInfo.title}</p>
                </div>
                <p className="text-xs text-slate-500">{profile.xp} XP</p>
              </div>
              <Progress value={Math.min((profile.xp / levelInfo.nextLevelXp) * 100, 100)} className="h-1.5" />
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-blue-500" />{profile.xp} XP</div>
                <div className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" />{profile.streak_count} дней</div>
              </div>
            </CardContent>
          </Card>

          {badges.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-700">{t("gamification.badges")}</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                  {badges.map(badge => {
                    const data = BADGE_DATA[badge.badge_type];
                    return (
                      <div key={badge.id} className="flex flex-col items-center gap-1 p-2 bg-slate-50 rounded-lg">
                        <span className="text-2xl">{data?.icon || "🏅"}</span>
                        <span className="text-[10px] text-slate-600 font-medium text-center">{data?.label || badge.badge_type}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("profile.editProfile")}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t("profile.fullName")}</Label>
                  <Input {...register("full_name")} />
                  {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <AtSign className="h-3.5 w-3.5 text-slate-400" />
                    Юзернейм (уникальный)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                    <Input
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="ваш_ник"
                      className="pl-7"
                      maxLength={30}
                    />
                    {usernameStatus === "checking" && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                    {usernameStatus === "available" && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
                    {usernameStatus === "taken" && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />}
                  </div>
                  {usernameStatus === "taken" && <p className="text-xs text-red-500">Этот юзернейм уже занят</p>}
                  {usernameStatus === "available" && <p className="text-xs text-emerald-600">Юзернейм свободен</p>}
                  <p className="text-xs text-slate-400">Только буквы a-z, цифры, _ · 3–30 символов</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={userEmail} disabled className="bg-slate-50 text-slate-500" />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("profile.bio")}</Label>
                  <Textarea {...register("bio")} rows={3} placeholder="Расскажите о себе..." />
                  {errors.bio && <p className="text-xs text-red-500">{errors.bio.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>{t("profile.language")}</Label>
                  <Select value={locale} onValueChange={v => setValue("locale", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="kz">Қазақша</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={saving || usernameStatus === "taken"} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t("profile.save")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
