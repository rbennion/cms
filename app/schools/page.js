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
import { useToast } from "@/components/ui/use-toast";
import { Plus, Upload, X } from "lucide-react";
import { ImportDialog } from "@/components/shared/import-dialog";
import { ExportButton } from "@/components/shared/export-button";
import { SavedViewsDropdown } from "@/components/shared/saved-views-dropdown";
import { DataTable } from "@/components/ui/data-table";
import { createSchoolsColumns } from "@/components/schools/columns";

function SchoolsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
  });

  const columns = useMemo(
    () => createSchoolsColumns({ onDelete: setDeleteId }),
    []
  );

  useEffect(() => {
    fetchSchools();
  }, [filters]);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const res = await fetch(`/api/schools?${params}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setSchools(data);
      } else {
        setSchools(data.data || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch schools",
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
      router.push(`/schools?${params}`);
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
    const clearedFilters = { search: "" };
    setFilters(clearedFilters);
    router.push("/schools");
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
      const res = await fetch(`/api/schools/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete school");
      toast({ title: "School deleted" });
      setDeleteId(null);
      fetchSchools();
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
      <Header title="Schools" description="Manage schools">
        <div className="flex gap-2">
          <ExportButton entityType="schools" filters={filters} />
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button asChild>
            <Link href="/schools/new">
              <Plus className="mr-2 h-4 w-4" />
              Add School
            </Link>
          </Button>
        </div>
      </Header>

      <div className="p-6">
        {/* Search Row */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SavedViewsDropdown
            entityType="schools"
            currentFilters={filters}
            onApplyView={handleApplyView}
          />
          <SearchInput
            placeholder="Search by school name..."
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            className="w-80"
          />
        </div>

        {/* Active Filters Display */}
        {filters.search && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active:</span>
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.search}"
              <button
                onClick={() => handleFilterChange("search", "")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
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
          data={schools}
          loading={loading}
          emptyMessage="No schools found matching your search"
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete School"
        description="Are you sure you want to delete this school? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        entityType="schools"
        onSuccess={fetchSchools}
      />
    </div>
  );
}

export default function SchoolsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col">
          <Header title="Schools" description="Manage schools" />
          <div className="p-6">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      }
    >
      <SchoolsPageContent />
    </Suspense>
  );
}
