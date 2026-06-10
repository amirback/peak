"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { MessageSquare, Send, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import type { Profile, Message } from "@/types";
import { cn } from "@/lib/utils";

interface Conversation {
  partner: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

interface Props { currentUser: Profile; }

export function ChatPage({ currentUser }: Props) {
  const t = useTranslations();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    fetchConversations();
    fetchAvailableUsers();
  }, []);

  useEffect(() => {
    if (!selectedPartner) return;
    fetchMessages(selectedPartner.id);

    const supabase = createClient();
    const channel = supabase.channel(`messages-${currentUser.id}-${selectedPartner.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if ((msg.sender_id === currentUser.id && msg.receiver_id === selectedPartner.id) ||
            (msg.sender_id === selectedPartner.id && msg.receiver_id === currentUser.id)) {
          setMessages(prev => [...prev, msg]);
          scrollToBottom();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedPartner?.id]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchConversations = async () => {
    const supabase = createClient();
    const { data: msgs } = await supabase
      .from("messages")
      .select("*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)")
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order("created_at", { ascending: false });

    if (!msgs) { setLoading(false); return; }

    const partnerMap = new Map<string, Conversation>();
    for (const msg of msgs) {
      const partner = msg.sender_id === currentUser.id ? msg.receiver : msg.sender;
      if (!partner) continue;
      if (!partnerMap.has(partner.id)) {
        const unread = msgs.filter(m => m.sender_id === partner.id && m.receiver_id === currentUser.id && !m.is_read).length;
        partnerMap.set(partner.id, { partner, lastMessage: msg, unreadCount: unread });
      }
    }
    setConversations(Array.from(partnerMap.values()));
    setLoading(false);
  };

  const fetchAvailableUsers = async () => {
    const supabase = createClient();
    let query = supabase.from("profiles").select("*").neq("id", currentUser.id);

    // Teacher sees their students, student sees their teachers
    if (currentUser.role === "teacher") {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .in("course_id", (await supabase.from("courses").select("id").eq("teacher_id", currentUser.id)).data?.map((c: any) => c.id) || []);
      const studentIds = (enrollments || []).map((e: any) => e.student_id);
      if (studentIds.length > 0) {
        const { data } = await supabase.from("profiles").select("*").in("id", studentIds);
        setAvailableUsers(data || []);
      }
    } else {
      const { data: enrollments } = await supabase.from("enrollments").select("course:courses!course_id(teacher_id)").eq("student_id", currentUser.id);
      const teacherIds = [...new Set((enrollments || []).map((e: any) => e.course?.teacher_id).filter(Boolean))];
      if (teacherIds.length > 0) {
        const { data } = await supabase.from("profiles").select("*").in("id", teacherIds);
        setAvailableUsers(data || []);
      }
    }
  };

  const fetchMessages = async (partnerId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Mark as read
    await supabase.from("messages").update({ is_read: true }).eq("sender_id", partnerId).eq("receiver_id", currentUser.id).eq("is_read", false);
    fetchConversations();
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPartner) return;
    const supabase = createClient();
    const content = newMessage.trim();
    setNewMessage("");
    await supabase.from("messages").insert({ sender_id: currentUser.id, receiver_id: selectedPartner.id, content });
    await supabase.from("notifications").insert({ user_id: selectedPartner.id, type: "new_message", content: `${currentUser.full_name}: ${content.slice(0, 50)}`, link: "/messages" });
  };

  const selectConversation = (partner: Profile) => {
    setSelectedPartner(partner);
    fetchMessages(partner.id);
  };

  const filteredUsers = availableUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const conversationPartnerIds = new Set(conversations.map(c => c.partner.id));
  const newUsers = filteredUsers.filter(u => !conversationPartnerIds.has(u.id));

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-0 bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 shrink-0 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 mb-3">{t("chat.title")}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Поиск..." value={searchUsers} onChange={e => setSearchUsers(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv.partner.id}
              onClick={() => selectConversation(conv.partner)}
              className={cn(
                "w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left",
                selectedPartner?.id === conv.partner.id && "bg-blue-50"
              )}
            >
              <div className="relative">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={conv.partner.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{conv.partner.full_name?.[0]}</AvatarFallback>
                </Avatar>
                {conv.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] text-white font-bold">{conv.unreadCount}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800 truncate">{conv.partner.full_name}</p>
                  {conv.lastMessage && <span className="text-[10px] text-slate-400">{formatRelativeTime(conv.lastMessage.created_at)}</span>}
                </div>
                {conv.lastMessage && <p className="text-xs text-slate-500 truncate">{conv.lastMessage.content}</p>}
              </div>
            </button>
          ))}

          {newUsers.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide">Новый диалог</div>
              {newUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => { setSelectedPartner(user); setMessages([]); }}
                  className={cn("w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left", selectedPartner?.id === user.id && "bg-blue-50")}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{user.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{user.full_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedPartner ? (
          <>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedPartner.avatar_url || undefined} />
                <AvatarFallback className="text-sm">{selectedPartner.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-800">{selectedPartner.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{selectedPartner.role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">{t("chat.noMessages")}</div>
              )}
              {messages.map(msg => {
                const isMine = msg.sender_id === currentUser.id;
                return (
                  <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                      isMine ? "bg-blue-500 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    )}>
                      <p>{msg.content}</p>
                      <p className={cn("text-[10px] mt-0.5", isMine ? "text-blue-100" : "text-slate-400")}>
                        {formatRelativeTime(msg.created_at)}
                        {isMine && msg.is_read && <span className="ml-1">✓✓</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100">
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder={t("chat.typeMessage")}
                className="flex-1"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <Button onClick={handleSend} disabled={!newMessage.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-8">
            <MessageSquare className="h-12 w-12 text-slate-200 mb-4" />
            <p className="text-sm">{t("chat.selectChat")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
