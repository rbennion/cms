"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/navigation";
import { GraduationCap, LogOut, User, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [logoUrl, setLogoUrl] = useState(null);
  const [appName, setAppName] = useState("Fight Club CRM");

  useEffect(() => {
    fetch("/api/settings/logo")
      .then((res) => res.json())
      .then((data) => {
        if (data.logo_url) setLogoUrl(data.logo_url);
        if (data.app_name) setAppName(data.app_name);
      })
      .catch(() => {});
  }, []);

  // Don't render sidebar on login/register pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground hidden md:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-sidebar-border px-6 py-4">
          <Link href="/" className="flex flex-col items-center text-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-[200px] h-[200px] object-contain mb-2"
              />
            ) : (
              <div className="flex w-[200px] h-[200px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground mb-2">
                <GraduationCap className="h-24 w-24" />
              </div>
            )}
            <span className="text-lg font-semibold">{appName}</span>
            <span className="text-xs text-muted-foreground">v0.4.0</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {session?.user && (
          <div className="border-t border-sidebar-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 hover:bg-sidebar-accent"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">
                      {session.user.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {session.user.email}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled>
                  <User className="mr-2 h-4 w-4" />
                  {session.user.isAdmin ? "Admin" : "User"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <Settings className="mr-2 h-4 w-4" />
                    My Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </aside>
  );
}
