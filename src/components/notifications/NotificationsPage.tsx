"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Bell, MessageSquare, BookOpen, Award, Calendar, CheckCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types";

interface Props { userId: string; }

const ICONS: Record<NotificationType, any> = {
  new_message: MessageSquare,
  new_comment: MessageSquare,
  new_lesson: BookOpen,
  badge_earned: Award,
  deadline_reminder: Calendar,
  course_completed: CheckCircle,
};

export function NotificationsPage({ userId }: Props) {
  const t = useTranslations();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifs();
    const supabase = createClient();
    const channel = supabase.channel(`notifs-page-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => fetchNotifs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAllRead = async () => {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("notifications.title")}</h1>
          {unreadCount > 0 && <p className="text-sm text-slate-500 mt-0.5">{unreadCount} непрочитанных</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
            <Check className="h-3.5 w-3.5" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center">
          <Bell className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400">{t("notifications.noNotifications")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {notifications.map(notif => {
            const Icon = ICONS[notif.type] || Bell;
            return (
              <div
                key={notif.id}
                className={cn(
                  "flex items-start gap-4 p-4 transition-colors cursor-pointer",
                  !notif.is_read ? "bg-blue-50/50 hover:bg-blue-50" : "hover:bg-slate-50"
                )}
                onClick={() => { if (!notif.is_read) markRead(notif.id); }}
              >
                <div className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  notif.type === "badge_earned" ? "bg-amber-50" :
                  notif.type === "new_message" ? "bg-blue-50" :
                  notif.type === "course_completed" ? "bg-emerald-50" :
                  "bg-slate-50"
                )}>
                  <Icon className={cn(
                    "h-4 w-4",
                    notif.type === "badge_earned" ? "text-amber-500" :
                    notif.type === "new_message" ? "text-blue-500" :
                    notif.type === "course_completed" ? "text-emerald-500" :
                    "text-slate-500"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", !notif.is_read ? "font-medium text-slate-800" : "text-slate-700")}>{notif.content}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(notif.created_at)}</p>
                </div>
                {!notif.is_read && <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />}
                {notif.link && (
                  <Link href={notif.link} onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="text-xs text-blue-500 h-7">Открыть</Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
