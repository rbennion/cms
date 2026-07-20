"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { useToast } from "@/components/ui/use-toast";
import { SearchInput } from "@/components/shared/search-input";
import { CertificationPanel } from "@/components/certifications/certification-panel";
import { bgCheckExpired, deriveCertStatus, STATUS_GROUPS } from "@/lib/certifications";
import { CheckCircle, Minus } from "lucide-react";

function RequirementIcon({ done }) {
  return done ? (
    <CheckCircle className="h-4 w-4 text-green-600" />
  ) : (
    <Minus className="h-4 w-4 text-muted-foreground" />
  );
}

export default function CertificationsPage() {
  const { toast } = useToast();
  const [certifications, setCertifications] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState(null);
  const [activePerson, setActivePerson] = useState(null);

  useEffect(() => {
    fetchCertifications();
    fetchPeople();
  }, []);

  const fetchCertifications = async () => {
    try {
      const res = await fetch("/api/certifications");
      const data = await res.json();
      setCertifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching certifications:", error);
      toast({
        title: "Error",
        description: "Failed to fetch certifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPeople = async () => {
    try {
      const res = await fetch("/api/people?limit=1000");
      const data = await res.json();
      setPeople(data.data || []);
    } catch (error) {
      console.error("Error fetching people:", error);
    }
  };

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return certifications
      .map((cert) => ({ cert, status: deriveCertStatus(cert) }))
      .filter(({ cert }) => {
        if (!term) return true;
        const name = `${cert.first_name} ${cert.last_name}`.toLowerCase();
        return name.includes(term) || cert.email?.toLowerCase().includes(term);
      })
      .filter(({ status }) => !groupFilter || status.group === groupFilter);
  }, [certifications, search, groupFilter]);

  const groupCounts = useMemo(() => {
    return certifications.reduce((acc, cert) => {
      const group = deriveCertStatus(cert).group;
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
  }, [certifications]);

  const activeCert = activePerson
    ? certifications.find((c) => c.person_id === activePerson.id) || null
    : null;

  const openPerson = (person) => {
    setActivePerson({
      id: person.person_id ?? person.id,
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
    });
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Certifications"
        description="Readiness checklist for every person — application, background check, QPR training"
      />

      <div className="p-6">
        {/* Summary Cards (click to filter) */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
          {STATUS_GROUPS.map((group) => (
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
                <div className="text-2xl font-bold">{groupCounts[group.key] || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search within the roster + open anyone's checklist */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <SearchInput
            placeholder="Search by name or email..."
            value={search}
            onChange={setSearch}
            className="w-full sm:w-80"
          />
          <div className="w-full sm:w-80">
            <MultiSelectSearch
              options={people}
              selected={[]}
              onChange={(selected) => selected[0] && openPerson(selected[0])}
              placeholder="Open anyone's checklist..."
              renderOption={(p) => `${p.first_name} ${p.last_name}`}
              singleSelect
            />
          </div>
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
              No certifications found
            </div>
          ) : (
            rows.map(({ cert, status }) => (
              <Card
                key={cert.id}
                className="cursor-pointer"
                onClick={() => openPerson(cert)}
              >
                <CardContent className="pt-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium">
                      {cert.first_name} {cert.last_name}
                    </div>
                    {cert.email && (
                      <div className="text-sm text-muted-foreground">{cert.email}</div>
                    )}
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
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
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Application</TableHead>
                <TableHead className="text-center">Background</TableHead>
                <TableHead className="text-center">QPR Training</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No certifications found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ cert, status }) => (
                  <TableRow
                    key={cert.id}
                    className="cursor-pointer"
                    onClick={() => openPerson(cert)}
                  >
                    <TableCell>
                      <Link
                        href={`/people/${cert.person_id}`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {cert.first_name} {cert.last_name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">
                        {cert.email && <div>{cert.email}</div>}
                        {cert.phone && (
                          <div className="text-muted-foreground">{cert.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <RequirementIcon done={!!cert.application_received} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <RequirementIcon
                          done={
                            cert.background_check_status === "approved" &&
                            !bgCheckExpired(cert)
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <RequirementIcon done={!!cert.qpr_gatekeeper_training} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Checklist Panel */}
      <Sheet open={!!activePerson} onOpenChange={(open) => !open && setActivePerson(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {activePerson && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>
                  {activePerson.first_name} {activePerson.last_name}
                </SheetTitle>
                <div className="text-sm text-muted-foreground text-left">
                  {activePerson.email}
                  <Button size="sm" variant="outline" asChild className="ml-3">
                    <Link href={`/people/${activePerson.id}`}>Open Profile</Link>
                  </Button>
                </div>
              </SheetHeader>
              <CertificationPanel
                personId={activePerson.id}
                cert={activeCert}
                onSaved={fetchCertifications}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
