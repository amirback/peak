"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { MessageSquare, Send, Search, AtSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import type { Profile, Message } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Conversation {
  partner: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

interface Props { currentUser: Profile; }

export function ChatPage({ currentUser }: Props) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult] = useState<Profile | null | "not_found">(null);
  const [searching, setSearching] = useState(false);
  const [connections, setConnections] = useState<Profile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    fetchConversations();
    fetchConnections();
  }, []);

  useEffect(() => {
    if (!withUserId || connections.length === 0) return;
    const found = connections.find(c => c.id === withUserId);
    if (found) { setSelectedPartner(found); fetchMessages(found.id); }
  }, [withUserId, connections]);

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

  const fetchConnections = async () => {
    const supabase = createClient();
    // People I follow (accepted) OR who follow me (accepted)
    const [{ data: iFollow }, { data: followMe }] = await Promise.all([
      supabase.from("follows").select("following:profiles!following_id(*)").eq("follower_id", currentUser.id).eq("status", "accepted"),
      supabase.from("follows").select("follower:profiles!follower_id(*)").eq("following_id", currentUser.id).eq("status", "accepted"),
    ]);
    const map = new Map<string, Profile>();
    (iFollow || []).forEach((r: any) => r.following && map.set(r.following.id, r.following));
    (followMe || []).forEach((r: any) => r.follower && map.set(r.follower.id, r.follower));
    setConnections(Array.from(map.values()));
  };

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

  const fetchMessages = async (partnerId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
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

  const searchByUsername = async () => {
    if (!searchUsername.trim()) return;
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").ilike("username", searchUsername.replace("@", "")).neq("id", currentUser.id).maybeSingle();
    setSearchResult(data || "not_found");
    setSearching(false);
  };

  const isConnection = (userId: string) => connections.some(c => c.id === userId);
  const conversationPartnerIds = new Set(conversations.map(c => c.partner.id));
  const newConnections = connections.filter(c => !conversationPartnerIds.has(c.id));

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-0 bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <h2 className="font-semibold text-slate-800">{t("chat.title")}</h2>
          {/* Search by username */}
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="юзернейм"
                value={searchUsername}
                onChange={e => { setSearchUsername(e.target.value); setSearchResult(null); }}
                onKeyDown={e => e.key === "Enter" && searchByUsername()}
                className="pl-7 h-8 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={searchByUsername} disabled={searching} className="h-8 px-2.5 text-xs">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
          {searchResult === "not_found" && (
            <p className="text-xs text-slate-400 px-1">Пользователь не найден</p>
          )}
          {searchResult && searchResult !== "not_found" && (
            <div className="rounded-lg border border-slate-200 p-2.5">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={(searchResult as Profile).avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{(searchResult as Profile).full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{(searchResult as Profile).full_name}</p>
                  <p className="text-xs text-blue-500">@{(searchResult as Profile).username}</p>
                </div>
                <Link href={`/u/${(searchResult as Profile).username}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2">Профиль</Button>
                </Link>
              </div>
              {isConnection((searchResult as Profile).id) && (
                <Button size="sm" className="w-full mt-2 h-7 text-xs" onClick={() => { setSelectedPartner(searchResult as Profile); setMessages([]); setSearchResult(null); setSearchUsername(""); }}>
                  Написать
                </Button>
              )}
              {!isConnection((searchResult as Profile).id) && (
                <p className="text-xs text-slate-400 mt-1.5 text-center">Нужно подписаться, чтобы писать</p>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv.partner.id}
              onClick={() => { setSelectedPartner(conv.partner); fetchMessages(conv.partner.id); }}
              className={cn("w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left", selectedPartner?.id === conv.partner.id && "bg-blue-50")}
            >
              <div className="relative">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={conv.partner.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{conv.partner.full_name?.[0]}</AvatarFallback>
                </Avatar>
                {conv.unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] text-white font-bold">{conv.unreadCount}</span>}
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

          {newConnections.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide">Контакты</div>
              {newConnections.map(user => (
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
                    {user.username && <p className="text-xs text-blue-400">@{user.username}</p>}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedPartner ? (
          <>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <Link href={selectedPartner.username ? `/u/${selectedPartner.username}` : "#"}>
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarImage src={selectedPartner.avatar_url || undefined} />
                  <AvatarFallback className="text-sm">{selectedPartner.full_name?.[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <p className="font-semibold text-slate-800">{selectedPartner.full_name}</p>
                {selectedPartner.username && <p className="text-xs text-blue-400">@{selectedPartner.username}</p>}
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
                    <div className={cn("max-w-[70%] rounded-2xl px-4 py-2.5 text-sm", isMine ? "bg-blue-500 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm")}>
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
              <Button onClick={handleSend} disabled={!newMessage.trim()} size="icon"><Send className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-8">
            <MessageSquare className="h-12 w-12 text-slate-200 mb-4" />
            <p className="text-sm font-medium text-slate-500">Выберите диалог</p>
            <p className="text-xs mt-1">или найдите пользователя по @нику</p>
          </div>
        )}
      </div>
    </div>
  );
}
