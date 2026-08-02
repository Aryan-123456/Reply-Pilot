"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageSquare, LayoutDashboard, Settings, LogOut, Store } from "lucide-react";

interface NavigationProps {
  organizationName: string;
  userEmail: string;
}

export function Navigation({ organizationName, userEmail }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reviews", label: "Reviews", icon: MessageSquare },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center space-x-8">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2857f5] text-sm text-white font-bold shadow-md shadow-blue-600/20">
              R
            </div>
            <span className="text-lg font-bold tracking-[-.04em] text-slate-950">
              Reply Pilot
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-[#2857f5] font-semibold"
                      : "text-slate-500 hover:text-[#2857f5] hover:bg-blue-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-500">
            <Store className="h-3.5 w-3.5 text-[#2857f5]" />
            <span className="font-medium text-slate-700">{organizationName}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
