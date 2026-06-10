"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, UserX, Clock } from "lucide-react";
import type { FollowStatus } from "@/types";

interface Props {
  currentUserId: string;
  targetUserId: string;
  initialStatus: FollowStatus | null;
  onStatusChange?: (status: FollowStatus | null) => void;
}

export function FollowButton({ currentUserId, targetUserId, initialStatus, onStatusChange }: Props) {
  const [status, setStatus] = useState<FollowStatus | null>(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("follows").insert({
      follower_id: currentUserId,
      following_id: targetUserId,
      status: "pending",
    });
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        type: "new_message",
        content: "Новый запрос на подписку",
        link: "/profile",
      });
      setStatus("pending");
      onStatusChange?.("pending");
    }
    setLoading(false);
  };

  const handleUnfollow = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("follows")
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId);
    setStatus(null);
    onStatusChange?.(null);
    setLoading(false);
  };

  if (status === "accepted") {
    return (
      <Button variant="outline" size="sm" onClick={handleUnfollow} disabled={loading} className="gap-1.5">
        <UserCheck className="h-4 w-4 text-emerald-500" />
        Подписан
      </Button>
    );
  }

  if (status === "pending") {
    return (
      <Button variant="outline" size="sm" onClick={handleUnfollow} disabled={loading} className="gap-1.5 text-slate-500">
        <Clock className="h-4 w-4" />
        Запрос отправлен
      </Button>
    );
  }

  if (status === "declined") {
    return (
      <Button size="sm" onClick={handleFollow} disabled={loading} className="gap-1.5">
        <UserPlus className="h-4 w-4" />
        Подписаться
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={handleFollow} disabled={loading} className="gap-1.5">
      <UserPlus className="h-4 w-4" />
      Подписаться
    </Button>
  );
}
