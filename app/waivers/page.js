"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { SearchInput } from "@/components/shared/search-input";
import { deriveWaiverStatus } from "@/lib/waivers";
import { WaiverStatusLine, WaiverSteps } from "@/components/waivers/waiver-status";
import { FileText, RotateCw } from "lucide-react";

const GROUPS = [
  { key: "waiting", label: "Waiting for Signature" },
  { key: "expired", label: "Link Expired" },
  { key: "signed", label: "Signed" },
];

export default function WaiversPage() {
  const { toast } = useToast();
  const [waivers, setWaivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await fetch("/api/waivers");
      const data = await res.json();
      setWaivers(data.waivers || []);
    } catch (error) {
      console.error("Error fetching waivers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch waivers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resend = async (id) => {
    const res = await fetch(`/api/waivers/${id}/resend`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Resend failed", description: data.error, variant: "destructive" });
    } else {
      toast({ title: "Waiver resent", description: data.warning || "New link sent" });
      load();
    }
  };

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return waivers
      .map((w) => ({ waiver: w, status: deriveWaiverStatus(w) }))
      .filter(({ waiver }) => {
        if (!term) return true;
        const name = `${waiver.first_name} ${waiver.last_name}`.toLowerCase();
        return name.includes(term) || waiver.sent_to_email?.toLowerCase().includes(term);
      })
      .filter(({ status }) => !groupFilter || status.key === groupFilter);
  }, [waivers, search, groupFilter]);

  const counts = useMemo(() => {
    return waivers.reduce((acc, w) => {
      const key = deriveWaiverStatus(w).key;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [waivers]);

  return (
    <div className="flex flex-col">
      <Header
        title="Waivers"
        description="Every parental waiver request and what step it's in"
      />

      <div className="p-6">
        {/* Summary Cards (click to filter) */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
          {GROUPS.map((group) => (
            <Card
              key={group.key}
              onClick={() =>
                setGroupFilter(groupFilter === group.key ? null : group.key)
              }
              className={
                "cursor-pointer transition-colors " +
                (groupFilter === group.key ? "border-primary" : "hover:bg-accent/50")
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{group.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{counts[group.key] || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-6">
          <SearchInput
            placeholder="Search by name or email..."
            value={search}
            onChange={setSearch}
            className="w-full sm:w-80"
          />
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No waivers found
            </div>
          ) : (
            rows.map(({ waiver }) => (
              <Card key={waiver.id}>
                <CardContent className="pt-4 space-y-2">
                  <Link
                    href={`/people/${waiver.person_id}`}
                    className="font-medium hover:underline"
                  >
                    {waiver.first_name} {waiver.last_name}
                  </Link>
                  <WaiverStatusLine waiver={waiver} />
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No waivers found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ waiver, status }) => (
                  <TableRow key={waiver.id}>
                    <TableCell>
                      <Link
                        href={`/people/${waiver.person_id}`}
                        className="font-medium hover:underline"
                      >
                        {waiver.first_name} {waiver.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <WaiverStatusLine waiver={waiver} />
                    </TableCell>
                    <TableCell>
                      <WaiverSteps waiver={waiver} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {waiver.status === "signed" && (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={`/api/waivers/${waiver.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileText className="mr-1 h-3 w-3" /> View signed waiver
                            </a>
                          </Button>
                        )}
                        {(status.key === "waiting" || status.key === "expired") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resend(waiver.id)}
                          >
                            <RotateCw className="mr-1 h-3 w-3" />
                            {status.key === "expired" ? "Send new link" : "Resend"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
