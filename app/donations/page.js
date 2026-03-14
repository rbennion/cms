"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/shared/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, TrendingUp, DollarSign, Users, X, Filter } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { SavedViewsDropdown } from "@/components/shared/saved-views-dropdown";
import { DataTable } from "@/components/ui/data-table";
import { createDonationsColumns } from "@/components/donations/columns";

function DonationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    donor_type: searchParams.get("donor_type") || "",
    start_date: searchParams.get("start_date") || "",
    end_date: searchParams.get("end_date") || "",
  });

  const columns = useMemo(
    () => createDonationsColumns({ onDelete: setDeleteId }),
    []
  );

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(
      ([key, value]) => key !== "search" && value
    ).length;
  }, [filters]);

  useEffect(() => {
    fetchDonations();
    fetchStats();
  }, [filters]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/donations/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const res = await fetch(`/api/donations?${params}`);
      const data = await res.json();
      setDonations(data.data || []);
    } catch (error) {
      console.error("Error fetching donations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch donations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateURL = useCallback(
    (newFilters) => {
      const params = new URLSearchParams();
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      router.push(`/donations?${params}`);
    },
    [router]
  );

  const handleFilterChange = useCallback(
    (key, value) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      updateURL(newFilters);
    },
    [filters, updateURL]
  );

  const handleClearFilters = useCallback(() => {
    const clearedFilters = {
      search: "",
      donor_type: "",
      start_date: "",
      end_date: "",
    };
    setFilters(clearedFilters);
    router.push("/donations");
  }, [router]);

  const handleApplyView = useCallback(
    (filterState) => {
      setFilters(filterState);
      updateURL(filterState);
    },
    [updateURL]
  );

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/donations/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Donation deleted successfully" });
      setDeleteId(null);
      fetchDonations();
      fetchStats();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="Donations" description="Track and manage contributions">
        <div className="flex gap-2">
          <ExportButton entityType="donations" filters={filters} />
          <Button asChild>
            <Link href="/donations/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Donation
            </Link>
          </Button>
        </div>
      </Header>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total YTD</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.totalYtd || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.countYtd || 0} donations this year
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                All-Time Total
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.totalAll || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.countAll || 0} total donations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Donors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                {stats?.topPeopleDonors?.slice(0, 3).map((donor, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate">
                      {donor.first_name} {donor.last_name}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(donor.total_donated)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Row */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SavedViewsDropdown
            entityType="donations"
            currentFilters={filters}
            onApplyView={handleApplyView}
          />
          <SearchInput
            placeholder="Search by donor name or note..."
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            className="w-80"
          />

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>

          <Select
            value={filters.donor_type || "_all"}
            onValueChange={(value) =>
              handleFilterChange("donor_type", value === "_all" ? "" : value)
            }
          >
            <SelectTrigger
              className={`w-40 ${
                filters.donor_type ? "border-primary bg-primary/5" : ""
              }`}
            >
              <SelectValue placeholder="Donor Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Donor Types</SelectItem>
              <SelectItem value="person">Individuals Only</SelectItem>
              <SelectItem value="company">Companies Only</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Date range:</span>
            <DatePicker
              date={filters.start_date}
              onDateChange={(date) =>
                handleFilterChange("start_date", date || "")
              }
              placeholder="From"
            />
            <span className="text-muted-foreground">-</span>
            <DatePicker
              date={filters.end_date}
              onDateChange={(date) =>
                handleFilterChange("end_date", date || "")
              }
              placeholder="To"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {(activeFilterCount > 0 || filters.search) && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active:</span>
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                Search: &quot;{filters.search}&quot;
                <button
                  onClick={() => handleFilterChange("search", "")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.donor_type && (
              <Badge variant="secondary" className="gap-1">
                {filters.donor_type === "person" ? "Individuals" : "Companies"}
                <button
                  onClick={() => handleFilterChange("donor_type", "")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.start_date && (
              <Badge variant="secondary" className="gap-1">
                From: {formatDate(filters.start_date)}
                <button
                  onClick={() => handleFilterChange("start_date", "")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.end_date && (
              <Badge variant="secondary" className="gap-1">
                To: {formatDate(filters.end_date)}
                <button
                  onClick={() => handleFilterChange("end_date", "")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}

        <DataTable
          columns={columns}
          data={donations}
          loading={loading}
          emptyMessage="No donations found matching your filters"
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Donation"
        description="Are you sure you want to delete this donation? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function DonationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <DonationsPageContent />
    </Suspense>
  );
}
