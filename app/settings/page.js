"use client"

import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Tags, Settings, Database } from 'lucide-react'

const settingsLinks = [
  {
    href: '/settings/schools',
    title: 'Schools',
    description: 'Manage schools that can be associated with people',
    icon: GraduationCap,
  },
  {
    href: '/settings/person-types',
    title: 'Person Types',
    description: 'Configure types/categories for contacts',
    icon: Tags,
  },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Settings" description="Configure application options" />

      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {settingsLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <link.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                      <CardDescription>{link.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Database:</span> SQLite
              </p>
              <p>
                <span className="font-medium">Location:</span> database.sqlite
              </p>
              <p className="text-muted-foreground">
                Run <code className="bg-muted px-1 rounded">npm run init-db</code> to initialize the database,
                or <code className="bg-muted px-1 rounded">npm run seed</code> to populate sample data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
