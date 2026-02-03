"use client";

import { usePathname } from "next/navigation";

const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

export function MainContent({ children }) {
  const pathname = usePathname();
  const isAuthPage = authRoutes.some(route => pathname?.startsWith(route));

  return (
    <main className={isAuthPage ? "flex-1" : "flex-1 md:pl-64"}>
      {children}
    </main>
  );
}
