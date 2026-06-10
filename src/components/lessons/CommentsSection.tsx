"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import type { Comment } from "@/types";

interface Props { lessonId: string; userId: string; }

export function CommentsSection({ lessonId, userId }: Props) {
  const t = useTranslations();
  const [comments, setComments] = useState<(Comment & { user: any })[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const fetchComments = async () => {
      const { data } = await supabase
        .from("comments")
        .select("*, user:profiles!user_id(full_name, avatar_url)")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: true });
      setComments(data || []);
    };

    fetchComments();

    const channel = supabase.channel(`comments-${lessonId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `lesson_id=eq.${lessonId}` }, () => {
        fetchComments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lessonId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("comments").insert({ lesson_id: lessonId, user_id: userId, content: newComment.trim() });
    setNewComment("");
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-blue-500" />
        {t("lessons.discussion")}
        {comments.length > 0 && <span className="text-sm font-normal text-slate-500">({comments.length})</span>}
      </h3>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">{t("lessons.noComments")}</p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.user?.avatar_url} />
                <AvatarFallback className="text-xs">{comment.user?.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-800">{comment.user?.full_name}</span>
                  <span className="text-xs text-slate-400">{formatRelativeTime(comment.created_at)}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Textarea
          placeholder={t("lessons.addComment")}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          rows={2}
          className="flex-1 min-h-0 resize-none"
          onKeyDown={e => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <Button onClick={handleSubmit} disabled={loading || !newComment.trim()} size="icon" className="h-auto self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
