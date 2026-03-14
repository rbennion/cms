import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/providers/session-provider";
import { MainContent } from "@/components/layout/main-content";

export const metadata = {
  title: "Fight Club CRM",
  description: "Contact relationship management for Fight Club programs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <MainContent>{children}</MainContent>
          </div>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
