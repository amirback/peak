import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatPage } from "@/components/chat/ChatPage";

function ChatLoading() {
  return (
    <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-white rounded-2xl border border-slate-200">
      <div className="text-sm text-slate-400">Загрузка...</div>
    </div>
  );
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  return (
    <AppShell profile={profile}>
      <Suspense fallback={<ChatLoading />}>
        <ChatPage currentUser={profile} />
      </Suspense>
    </AppShell>
  );
}
