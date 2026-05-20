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
import { Plus, X, Filter, RotateCcw } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { createGroupsColumns } from "@/components/groups/columns";
import { SearchableSelect } from "@/components/ui/searchable-select";

function GroupsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    school_id: searchParams.get("school_id") || "",
    gender: searchParams.get("gender") || "",
    status: searchParams.get("status") || "",
    year: searchParams.get("year") || "",
  });

  const columns = useMemo(
    () => createGroupsColumns({ onDelete: setDeleteId }),
    []
  );

  // Count active filters (excluding search)
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === "search") return false;
      return value;
    }).length;
  }, [filters]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [filters]);

  const fetchOptions = async () => {
    try {
      const schoolsRes = await fetch("/api/schools");
      setSchools(await schoolsRes.json());
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const res = await fetch(`/api/groups?${params}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setGroups(data);
      } else {
        setGroups(data.data || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch groups",
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
      router.push(`/groups?${params}`);
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
      school_id: "",
      gender: "",
      status: "",
      year: "",
    };
    setFilters(clearedFilters);
    router.push("/groups");
  }, [router]);

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/groups/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete group");
      toast({ title: "Group deleted" });
      setDeleteId(null);
      fetchGroups();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSchoolName = (id) =>
    schools.find((s) => s.id.toString() === id)?.name || id;

  // Build unique year options from groups data
  const yearOptions = useMemo(() => {
    const years = [...new Set(groups.map((g) => g.year).filter(Boolean))];
    return years.sort((a, b) => b - a);
  }, [groups]);

  return (
    <div className="flex flex-col">
      <Header title="Groups" description="Manage groups">
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/groups/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Group
            </Link>
          </Button>
        </div>
      </Header>

      <div className="p-6">
        {/* Search and Filter Row */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Search by group name, school, or leader..."
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            className="w-80"
          />

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>

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

          <Select
            value={filters.gender || "_all"}
            onValueChange={(value) =>
              handleFilterChange("gender", value === "_all" ? "" : value)
            }
          >
            <SelectTrigger
              className={`w-36 ${
                filters.gender ? "border-primary bg-primary/5" : ""
              }`}
            >
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Genders</SelectItem>
              <SelectItem value="Girls">Girls</SelectItem>
              <SelectItem value="Boys">Boys</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || "_all"}
            onValueChange={(value) =>
              handleFilterChange("status", value === "_all" ? "" : value)
            }
          >
            <SelectTrigger
              className={`w-36 ${
                filters.status ? "border-primary bg-primary/5" : ""
              }`}
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Alumni">Alumni</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.year || "_all"}
            onValueChange={(value) =>
              handleFilterChange("year", value === "_all" ? "" : value)
            }
          >
            <SelectTrigger
              className={`w-36 ${
                filters.year ? "border-primary bg-primary/5" : ""
              }`}
            >
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Years</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
                Search: &quot;{filters.search}&quot;
                <button
                  onClick={() => handleFilterChange("search", "")}
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
            {filters.gender && (
              <Badge variant="secondary" className="gap-1">
                Gender: {filters.gender}
                <button
                  onClick={() => handleFilterChange("gender", "")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="gap-1">
                Status: {filters.status}
                <button
                  onClick={() => handleFilterChange("status", "")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.year && (
              <Badge variant="secondary" className="gap-1">
                Year: {filters.year}
                <button
                  onClick={() => handleFilterChange("year", "")}
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
          data={groups}
          loading={loading}
          emptyMessage="No groups found matching your filters"
          onRowClick={(group) => router.push(`/groups/${group.id}`)}
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Group"
        description="Are you sure you want to delete this group? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function GroupsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col">
          <Header title="Groups" description="Manage groups" />
          <div className="p-6">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      }
    >
      <GroupsPageContent />
    </Suspense>
  );
}
