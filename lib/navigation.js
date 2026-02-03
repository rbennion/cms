import {
  LayoutDashboard,
  Users,
  Building2,
  DollarSign,
  Award,
  Settings,
  GraduationCap,
} from "lucide-react";

export const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/people", label: "People", icon: Users },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/schools", label: "Schools", icon: GraduationCap },
  { href: "/donations", label: "Donations", icon: DollarSign },
  { href: "/certifications", label: "Certifications", icon: Award },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const quickAddItems = [
  { href: "/people/new", label: "New Person", icon: Users },
  { href: "/companies/new", label: "New Company", icon: Building2 },
  { href: "/schools/new", label: "New School", icon: GraduationCap },
  { href: "/donations/new", label: "New Donation", icon: DollarSign },
];
