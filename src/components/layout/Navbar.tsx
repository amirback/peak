"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, MessageSquare, LogOut, User, Settings, BookOpen, LayoutDashboard, Trophy, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Profile } from "@/types";

interface NavbarProps {
  profile: Profile | null;
}

export function Navbar({ profile }: NavbarProps) {
  const t = useTranslations();
  const router = useRouter();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();

    const fetchCounts = async () => {
      const [{ count: notifCount }, { count: msgCount }] = await Promise.all([
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_read", false),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", profile.id).eq("is_read", false),
      ]);
      setUnreadNotifs(notifCount || 0);
      setUnreadMessages(msgCount || 0);
    };

    fetchCounts();

    const channel = supabase.channel("navbar-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` }, () => {
        setUnreadNotifs(prev => prev + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${profile.id}` }, () => {
        setUnreadMessages(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-800">Peak</span>
          </Link>

          {profile && (
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
                  <LayoutDashboard className="h-4 w-4" />
                  {t("nav.dashboard")}
                </Button>
              </Link>
              {profile.role === "student" && (
                <Link href="/courses">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
                    <BookOpen className="h-4 w-4" />
                    {t("nav.courses")}
                  </Button>
                </Link>
              )}
              {profile.role === "teacher" && (
                <Link href="/teacher/courses">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
                    <BookOpen className="h-4 w-4" />
                    {t("nav.courses")}
                  </Button>
                </Link>
              )}
              <Link href="/leaderboard">
                <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
                  <Trophy className="h-4 w-4" />
                  {t("nav.leaderboard")}
                </Button>
              </Link>
              {profile.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
                    <Shield className="h-4 w-4" />
                    {t("nav.admin")}
                  </Button>
                </Link>
              )}
            </nav>
          )}

          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            {profile ? (
              <>
                <Link href="/messages">
                  <Button variant="ghost" size="icon" className="relative text-slate-600">
                    <MessageSquare className="h-5 w-5" />
                    {unreadMessages > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="relative text-slate-600">
                    <Bell className="h-5 w-5" />
                    {unreadNotifs > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]">
                        {unreadNotifs > 9 ? "9+" : unreadNotifs}
                      </Badge>
                    )}
                  </Button>
                </Link>

                <div className="relative">
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-sm py-1 min-w-[180px]">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-800 truncate">{profile.full_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{profile.role} · {profile.xp} XP</p>
                      </div>
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)}>
                        <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <User className="h-4 w-4" />
                          {t("profile.title")}
                        </button>
                      </Link>
                      <button onClick={handleSignOut} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut className="h-4 w-4" />
                        {t("nav.logout")}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login"><Button variant="ghost" size="sm">{t("nav.login")}</Button></Link>
                <Link href="/register"><Button size="sm">{t("nav.register")}</Button></Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
