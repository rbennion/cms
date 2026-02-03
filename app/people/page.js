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
import { Plus, Upload, X, Filter, RotateCcw } from "lucide-react";
import { ImportDialog } from "@/components/shared/import-dialog";
import { ExportButton } from "@/components/shared/export-button";
import { SavedViewsDropdown } from "@/components/shared/saved-views-dropdown";
import { DataTable } from "@/components/ui/data-table";
import { createPeopleColumns } from "@/components/people/columns";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";

function PeoplePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [engagementStages, setEngagementStages] = useState([]);
  const [schools, setSchools] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    role_ids: searchParams.get("role_ids")
      ? searchParams.get("role_ids").split(",")
      : [],
    stage_id: searchParams.get("stage_id") || "",
    is_donor: searchParams.get("is_donor") || "",
    is_fc_certified: searchParams.get("is_fc_certified") || "",
    school_id: searchParams.get("school_id") || "",
  });

  // Memoize columns to prevent re-creation on every render
  const columns = useMemo(
    () => createPeopleColumns({ onDelete: setDeleteId }),
    []
  );

  // Count active filters (excluding search)
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === "search") return false;
      if (key === "role_ids") return Array.isArray(value) && value.length > 0;
      return value;
    }).length;
  }, [filters]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [filters]);

  const fetchOptions = async () => {
    try {
      const [rolesRes, stagesRes, schoolsRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/engagement-stages"),
        fetch("/api/schools"),
      ]);
      setRoles(await rolesRes.json());
      setEngagementStages(await stagesRes.json());
      setSchools(await schoolsRes.json());
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const fetchPeople = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      Object.entries(filters).forEach(([key, value]) => {
        if (key === "role_ids" && Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(","));
        } else if (value && !Array.isArray(value)) {
          params.set(key, value);
        }
      });

      const res = await fetch(`/api/people?${params}`);
      const data = await res.json();
      setPeople(data.data || []);
    } catch (error) {
      console.error("Error fetching people:", error);
      toast({
        title: "Error",
        description: "Failed to fetch people",
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
        if (key === "role_ids" && Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(","));
        } else if (value && !Array.isArray(value)) {
          params.set(key, value);
        }
      });
      router.push(`/people?${params}`);
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
      role_ids: [],
      stage_id: "",
      is_donor: "",
      is_fc_certified: "",
      school_id: "",
    };
    setFilters(clearedFilters);
    router.push("/people");
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
      const res = await fetch(`/api/people/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Person deleted successfully" });
      setDeleteId(null);
      fetchPeople();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Helper to get display name for filter values
  const getRoleName = (id) =>
    roles.find((r) => r.id.toString() === id)?.name || id;
  const getStageName = (id) =>
    engagementStages.find((s) => s.id.toString() === id)?.name || id;
  const getSchoolName = (id) =>
    schools.find((s) => s.id.toString() === id)?.name || id;

  return (
    <div className="flex flex-col">
      <Header title="People" description="Manage contacts and relationships">
        <div className="flex gap-2">
          <ExportButton entityType="people" filters={filters} />
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button asChild>
            <Link href="/people/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Person
            </Link>
          </Button>
        </div>
      </Header>

      <div className="p-6">
        {/* Search and Filter Row */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SavedViewsDropdown
            entityType="people"
            currentFilters={filters}
            onApplyView={handleApplyView}
          />
          <SearchInput
            placeholder="Search by name, email, or phone..."
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            className="w-80"
          />

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>

          <MultiSelectFilter
            options={roles}
            value={filters.role_ids}
            onChange={(value) => handleFilterChange("role_ids", value)}
            placeholder="Roles"
            showSearch={false}
            renderOption={(role) => role.name}
            getBadgeVariant={(name) => {
              const n = name.toLowerCase();
              if (n.includes("board")) return "purple";
              if (n.includes("volunteer")) return "teal";
              if (n.includes("parent")) return "pink";
              if (n.includes("fc leader")) return "indigo";
              if (n.includes("potential")) return "warning";
              if (n.includes("vendor")) return "orange";
              if (n.includes("partner")) return "cyan";
              return "secondary";
            }}
          />

          <Select
            value={filters.stage_id || "_all"}
            onValueChange={(value) =>
              handleFilterChange("stage_id", value === "_all" ? "" : value)
            }
          >
            <SelectTrigger
              className={`w-36 ${
                filters.stage_id ? "border-primary bg-primary/5" : ""
              }`}
            >
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Stages</SelectItem>
              {engagementStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id.toString()}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.is_donor || "_all"}
            onValueChange={(value) =>
              handleFilterChange("is_donor", value === "_all" ? "" : value)
            }
          >
            <SelectTrigger
              className={`w-36 ${
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

          <Select
            value={filters.is_fc_certified || "_all"}
            onValueChange={(value) =>
              handleFilterChange(
                "is_fc_certified",
                value === "_all" ? "" : value
              )
            }
          >
            <SelectTrigger
              className={`w-40 ${
                filters.is_fc_certified ? "border-primary bg-primary/5" : ""
              }`}
            >
              <SelectValue placeholder="Certification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Certification</SelectItem>
              <SelectItem value="true">Certified Only</SelectItem>
              <SelectItem value="false">Not Certified Only</SelectItem>
            </SelectContent>
          </Select>

          <SearchableSelect
            options={schools}
            value={filters.school_id}
            onChange={(value) => handleFilterChange("school_id", value)}
            placeholder="School"
            allLabel="All Schools"
            className="w-48"
            renderOption={(school) => school.name}
            showSearch={false}
          />

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 px-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {(activeFilterCount > 0 || filters.search) && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active:</span>
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                Search: "{filters.search}"
                <button
                  onClick={() => handleFilterChange("search", "")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.role_ids?.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                Roles:{" "}
                {filters.role_ids.map((id) => getRoleName(id)).join(", ")}
                <button
                  onClick={() => handleFilterChange("role_ids", [])}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.stage_id && (
              <Badge variant="secondary" className="gap-1">
                Stage: {getStageName(filters.stage_id)}
                <button
                  onClick={() => handleFilterChange("stage_id", "")}
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
            {filters.is_fc_certified && (
              <Badge variant="secondary" className="gap-1">
                {filters.is_fc_certified === "true"
                  ? "Certified"
                  : "Not Certified"}
                <button
                  onClick={() => handleFilterChange("is_fc_certified", "")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.school_id && (
              <Badge variant="secondary" className="gap-1">
                School: {getSchoolName(filters.school_id)}
                <button
                  onClick={() => handleFilterChange("school_id", "")}
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
          data={people}
          loading={loading}
          emptyMessage="No people found matching your filters"
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Person"
        description="Are you sure you want to delete this person? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        entityType="people"
        onSuccess={fetchPeople}
      />
    </div>
  );
}

export default function PeoplePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <PeoplePageContent />
    </Suspense>
  );
}
