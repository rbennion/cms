"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Upload, X, Filter } from "lucide-react";
import { ImportDialog } from "@/components/shared/import-dialog";
import { ExportButton } from "@/components/shared/export-button";
import { SavedViewsDropdown } from "@/components/shared/saved-views-dropdown";
import { DataTable } from "@/components/ui/data-table";
import { createCompaniesColumns } from "@/components/companies/columns";

function CompaniesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    is_donor: searchParams.get("is_donor") || "",
  });

  const columns = useMemo(
    () => createCompaniesColumns({ onDelete: setDeleteId }),
    []
  );

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(
      ([key, value]) => key !== "search" && value
    ).length;
  }, [filters]);

  useEffect(() => {
    fetchCompanies();
  }, [filters]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const res = await fetch(`/api/companies?${params}`);
      const data = await res.json();
      setCompanies(data.data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Error",
        description: "Failed to fetch companies",
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
      router.push(`/companies?${params}`);
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
    const clearedFilters = { search: "", is_donor: "" };
    setFilters(clearedFilters);
    router.push("/companies");
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
      const res = await fetch(`/api/companies/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Company deleted successfully" });
      setDeleteId(null);
      fetchCompanies();
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
      <Header
        title="Companies"
        description="Manage organizations and businesses"
      >
        <div className="flex gap-2">
          <ExportButton entityType="companies" filters={filters} />
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button asChild>
            <Link href="/companies/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Link>
          </Button>
        </div>
      </Header>

      <div className="p-6">
        {/* Search and Filter Row */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SavedViewsDropdown
            entityType="companies"
            currentFilters={filters}
            onApplyView={handleApplyView}
          />
          <SearchInput
            placeholder="Search by company name..."
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            className="w-80"
          />

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>

          <Select
            value={filters.is_donor || "_all"}
            onValueChange={(value) =>
              handleFilterChange("is_donor", value === "_all" ? "" : value)
            }
          >
            <SelectTrigger
              className={`w-40 ${
                filters.is_donor ? "border-primary bg-primary/5" : ""
              }`}
            >
              <SelectValue placeholder="Donor Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Donor Status</SelectItem>
              <SelectItem value="true">Donors Only</SelectItem>
              <SelectItem value="false">Non-Donors Only</SelectItem>
            </SelectContent>
          </Select>
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
            {filters.is_donor && (
              <Badge variant="secondary" className="gap-1">
                {filters.is_donor === "true" ? "Donors" : "Non-Donors"}
                <button
                  onClick={() => handleFilterChange("is_donor", "")}
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
          data={companies}
          loading={loading}
          emptyMessage="No companies found matching your filters"
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Company"
        description="Are you sure you want to delete this company? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        entityType="companies"
        onSuccess={fetchCompanies}
      />
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <CompaniesPageContent />
    </Suspense>
  );
}
