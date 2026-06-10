import { Navbar } from "./Navbar";
import type { Profile } from "@/types";

interface AppShellProps {
  profile: Profile | null;
  children: React.ReactNode;
}

export function AppShell({ profile, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar profile={profile} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
