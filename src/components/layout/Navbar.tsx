"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, MessageSquare, LogOut, User, BookOpen, LayoutDashboard, Trophy, Shield, Menu, X, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import type { Profile } from "@/types";
import { cn } from "@/lib/utils";

interface NavbarProps { profile: Profile | null; }

export function Navbar({ profile }: NavbarProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` }, () => setUnreadNotifs(p => p + 1))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${profile.id}` }, () => setUnreadMessages(p => p + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchVal.trim().replace("@", "");
    if (!q) return;
    router.push(`/u/${q}`);
    setSearchVal("");
    setSearchOpen(false);
  };

  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const NavLinks = () => (
    <>
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className={cn("gap-1.5 text-slate-600 w-full justify-start md:w-auto md:justify-center", pathname === "/dashboard" && "bg-slate-100 text-slate-900")}>
          <LayoutDashboard className="h-4 w-4" />{t("nav.dashboard")}
        </Button>
      </Link>
      {profile?.role === "student" && (
        <Link href="/courses">
          <Button variant="ghost" size="sm" className={cn("gap-1.5 text-slate-600 w-full justify-start md:w-auto md:justify-center", pathname.startsWith("/courses") && "bg-slate-100 text-slate-900")}>
            <BookOpen className="h-4 w-4" />{t("nav.courses")}
          </Button>
        </Link>
      )}
      {profile?.role === "teacher" && (
        <Link href="/teacher/courses">
          <Button variant="ghost" size="sm" className={cn("gap-1.5 text-slate-600 w-full justify-start md:w-auto md:justify-center", pathname.startsWith("/teacher") && "bg-slate-100 text-slate-900")}>
            <BookOpen className="h-4 w-4" />{t("nav.courses")}
          </Button>
        </Link>
      )}
      <Link href="/leaderboard">
        <Button variant="ghost" size="sm" className={cn("gap-1.5 text-slate-600 w-full justify-start md:w-auto md:justify-center", pathname === "/leaderboard" && "bg-slate-100 text-slate-900")}>
          <Trophy className="h-4 w-4" />{t("nav.leaderboard")}
        </Button>
      </Link>
      {profile?.role === "admin" && (
        <Link href="/admin">
          <Button variant="ghost" size="sm" className={cn("gap-1.5 text-slate-600 w-full justify-start md:w-auto md:justify-center", pathname === "/admin" && "bg-slate-100 text-slate-900")}>
            <Shield className="h-4 w-4" />{t("nav.admin")}
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">Peak</span>
          </Link>

          {profile && (
            <nav className="hidden md:flex items-center gap-0.5">
              <NavLinks />
            </nav>
          )}

          <div className="flex items-center gap-1">
            {profile && (
              <div className="relative" ref={searchRef}>
                <Button variant="ghost" size="icon" className="text-slate-500 h-9 w-9" onClick={() => setSearchOpen(v => !v)}>
                  <Search className="h-4 w-4" />
                </Button>
                {searchOpen && (
                  <form onSubmit={handleSearch} className="absolute right-0 top-full mt-2 z-50">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-60">
                      <p className="text-xs text-slate-400 mb-2">Найти по @нику</p>
                      <div className="flex gap-1.5">
                        <input
                          autoFocus
                          value={searchVal}
                          onChange={e => setSearchVal(e.target.value)}
                          placeholder="@ник"
                          className="flex-1 text-sm px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition-colors"
                        />
                        <button type="submit" className="text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-400 transition-colors font-medium">→</button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            <LanguageSwitcher />

            {profile ? (
              <>
                <Link href="/messages">
                  <Button variant="ghost" size="icon" className="relative text-slate-500 h-9 w-9">
                    <MessageSquare className="h-4 w-4" />
                    {unreadMessages > 0 && <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px]">{unreadMessages > 9 ? "9+" : unreadMessages}</Badge>}
                  </Button>
                </Link>
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="relative text-slate-500 h-9 w-9">
                    <Bell className="h-4 w-4" />
                    {unreadNotifs > 0 && <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px]">{unreadNotifs > 9 ? "9+" : unreadNotifs}</Badge>}
                  </Button>
                </Link>

                <div className="relative" ref={menuRef}>
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center rounded-xl p-1 hover:bg-slate-50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[200px]">
                      <div className="px-3 py-2.5 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800 truncate">{profile.full_name}</p>
                        {profile.username && <p className="text-xs text-blue-500">@{profile.username}</p>}
                        <p className="text-xs text-slate-400 capitalize mt-0.5">{profile.role} · {profile.xp} XP</p>
                      </div>
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)}>
                        <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <User className="h-4 w-4" />{t("profile.title")}
                        </button>
                      </Link>
                      <button onClick={handleSignOut} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut className="h-4 w-4" />{t("nav.logout")}
                      </button>
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="icon" className="md:hidden text-slate-500 h-9 w-9" onClick={() => setMobileMenuOpen(v => !v)}>
                  {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
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

      {mobileMenuOpen && profile && (
        <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-3 space-y-1">
          <NavLinks />
        </div>
      )}
    </header>
  );
}
