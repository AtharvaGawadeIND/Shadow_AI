"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Bell, LayoutDashboard, LogOut, Shield, Users, UploadCloud } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import axios from "axios";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: UploadCloud },
  { href: "/events", label: "Live Events", icon: Activity },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/alerts", label: "Alerts", icon: Bell }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await axios.post("/api/auth/logout");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-grid bg-[size:32px_32px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800 bg-slate-950/80 p-5 backdrop-blur lg:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-400 text-slate-950">
            <Shield size={22} />
          </span>
          <span>
            <span className="block text-lg font-black">ShadowShield</span>
            <span className="text-xs text-cyan-300">AI Exposure Command</span>
          </span>
        </Link>
        <nav className="mt-10 space-y-2">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800/70 hover:text-white",
                  active && "bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/20"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button variant="ghost" className="absolute bottom-5 left-5 right-5 w-[calc(100%-2.5rem)] justify-start" onClick={logout}>
          <LogOut size={16} /> Logout
        </Button>
      </aside>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
