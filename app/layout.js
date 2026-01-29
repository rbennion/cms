import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/toaster'

export const metadata = {
  title: 'Non-Profit School CRM',
  description: 'Contact relationship management for non-profit school programs',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 pl-64">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
