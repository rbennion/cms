"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Plus, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";

function PeoplePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [people, setPeople] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [personTypes, setPersonTypes] = useState([]);
  const [schools, setSchools] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    type: searchParams.get("type") || "",
    is_donor: searchParams.get("is_donor") || "",
    is_fc_certified: searchParams.get("is_fc_certified") || "",
    is_board_member: searchParams.get("is_board_member") || "",
    school_id: searchParams.get("school_id") || "",
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [filters, searchParams]);

  const fetchOptions = async () => {
    try {
      const [typesRes, schoolsRes] = await Promise.all([
        fetch("/api/person-types"),
        fetch("/api/schools"),
      ]);
      setPersonTypes(await typesRes.json());
      setSchools(await schoolsRes.json());
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const fetchPeople = async () => {
    setLoading(true);
    try {
      const page = searchParams.get("page") || 1;
      const params = new URLSearchParams({
        page,
        limit: "20",
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });

      const res = await fetch(`/api/people?${params}`);
      const data = await res.json();
      setPeople(data.data || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
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

  const handleFilterChange = (key, value) => {
    const actualValue = value === "all" ? "" : value;
    setFilters((prev) => ({ ...prev, [key]: actualValue }));
    const params = new URLSearchParams(searchParams);
    if (actualValue) {
      params.set(key, actualValue);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/people?${params}`);
  };

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(`/people?${params}`);
  };

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

  return (
    <div className="flex flex-col">
      <Header title="People" description="Manage contacts and relationships">
        <Button asChild>
          <Link href="/people/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Person
          </Link>
        </Button>
      </Header>

      <div className="p-6">
        <div className="mb-6 flex flex-wrap gap-4">
          <SearchInput
            placeholder="Search people..."
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            className="w-64"
          />

          <Select
            value={filters.type || "all"}
            onValueChange={(value) => handleFilterChange("type", value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {personTypes.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.is_donor || "all"}
            onValueChange={(value) => handleFilterChange("is_donor", value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Donor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Donors</SelectItem>
              <SelectItem value="false">Non-donors</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.is_fc_certified || "all"}
            onValueChange={(value) =>
              handleFilterChange("is_fc_certified", value)
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Certified" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Certified</SelectItem>
              <SelectItem value="false">Not Certified</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.school_id || "all"}
            onValueChange={(value) => handleFilterChange("school_id", value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="School" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id.toString()}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Types</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : people.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No people found
                  </TableCell>
                </TableRow>
              ) : (
                people.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <Link
                        href={`/people/${person.id}`}
                        className="font-medium hover:underline"
                      >
                        {person.first_name} {person.last_name}
                      </Link>
                      {person.title && (
                        <p className="text-sm text-muted-foreground">
                          {person.title}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell>{person.phone}</TableCell>
                    <TableCell>
                      {person.types && (
                        <div className="flex flex-wrap gap-1">
                          {person.types.split(",").map((type, i) => (
                            <Badge key={i} variant="secondary">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {person.is_donor ? (
                          <Badge variant="success">Donor</Badge>
                        ) : null}
                        {person.is_fc_certified ? (
                          <Badge variant="info">Certified</Badge>
                        ) : null}
                        {person.is_board_member ? <Badge>Board</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/people/${person.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/people/${person.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(person.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={handlePageChange}
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
    </div>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PeoplePageContent />
    </Suspense>
  );
}
