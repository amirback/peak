"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormData } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Camera, Save, Loader2, Zap, Flame, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getLevel, formatDate } from "@/lib/utils";
import type { Profile, Badge } from "@/types";

const BADGE_DATA: Record<string, { icon: string; label: string }> = {
  first_course: { icon: "🎓", label: "Первый курс" },
  perfect_quiz: { icon: "✨", label: "Идеальный тест" },
  streak_7: { icon: "🔥", label: "7 дней подряд" },
  course_grad: { icon: "🏆", label: "Выпускник" },
};

interface Props { profile: Profile; badges: Badge[]; userEmail: string; }

export function ProfilePage({ profile: initialProfile, badges, userEmail }: Props) {
  const t = useTranslations();
  const { toast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile.full_name, bio: profile.bio || "", locale: (profile.locale as any) || "ru" },
  });

  const locale = watch("locale");
  const levelInfo = getLevel(profile.xp);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: ProfileFormData) => {
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

    const { data: updated } = await supabase.from("profiles").update({
      full_name: data.full_name, bio: data.bio, locale: data.locale, avatar_url,
    }).eq("id", profile.id).select().single();

    if (updated) {
      setProfile(updated as Profile);
      document.cookie = `locale=${data.locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
      toast({ title: t("profile.saved"), variant: "default" });
    }
    setSaving(false);
  };

  const initials = profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t("profile.title")}</h1>

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
              <p className="text-xs text-slate-500 capitalize mt-0.5">{profile.role}</p>
              <p className="text-xs text-slate-400 mt-1">{t("profile.memberSince")} {formatDate(profile.created_at)}</p>
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

          {/* Badges */}
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="kz">Қазақша</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={saving} className="gap-2">
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
