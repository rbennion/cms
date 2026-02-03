"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import {
  UsersRound,
  Users,
  TrendingUp,
  Settings,
  ChevronRight,
} from "lucide-react";

const settingsLinks = [
  {
    href: "/settings/app",
    title: "App Settings",
    description: "Configure logo and application branding",
    icon: Settings,
    adminOnly: true,
  },
  {
    href: "/settings/users",
    title: "Users",
    description: "Manage system users and permissions",
    icon: UsersRound,
    adminOnly: true,
  },
  {
    href: "/settings/roles",
    title: "Roles",
    description: "Define relationship types (Board Member, Volunteer, etc.)",
    icon: Users,
  },
  {
    href: "/settings/engagement-stages",
    title: "Engagement Stages",
    description: "Configure pipeline stages (Lead, Prospect, Active, etc.)",
    icon: TrendingUp,
  },
];

export default function SettingsPage() {
  const { data: session } = useSession();

  const visibleLinks = settingsLinks.filter(
    (link) => !link.adminOnly || session?.user?.isAdmin
  );

  return (
    <div className="flex flex-col">
      <Header title="Settings" description="Configure application options" />

      <div className="p-6 max-w-2xl">
        <div className="rounded-lg border bg-card">
          {visibleLinks.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${
                index !== visibleLinks.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <link.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{link.title}</div>
                <div className="text-sm text-muted-foreground">
                  {link.description}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
