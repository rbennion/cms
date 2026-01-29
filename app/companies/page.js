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
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ExternalLink,
} from "lucide-react";

function CompaniesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    is_donor: searchParams.get("is_donor") || "",
  });

  useEffect(() => {
    fetchCompanies();
  }, [filters, searchParams]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const page = searchParams.get("page") || 1;
      const params = new URLSearchParams({
        page,
        limit: "20",
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });

      const res = await fetch(`/api/companies?${params}`);
      const data = await res.json();
      setCompanies(data.data || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
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
    router.push(`/companies?${params}`);
  };

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(`/companies?${params}`);
  };

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
        <Button asChild>
          <Link href="/companies/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Link>
        </Button>
      </Header>

      <div className="p-6">
        <div className="mb-6 flex flex-wrap gap-4">
          <SearchInput
            placeholder="Search companies..."
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            className="w-64"
          />

          <Select
            value={filters.is_donor || "all"}
            onValueChange={(value) => handleFilterChange("is_donor", value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Donor Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Donors</SelectItem>
              <SelectItem value="false">Non-donors</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No companies found
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Link
                        href={`/companies/${company.id}`}
                        className="font-medium hover:underline"
                      >
                        {company.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {company.city && company.state
                        ? `${company.city}, ${company.state}`
                        : company.city || company.state || "-"}
                    </TableCell>
                    <TableCell>
                      {company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm hover:underline"
                        >
                          Visit
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {company.is_donor ? (
                        <Badge variant="success">Donor</Badge>
                      ) : null}
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
                            <Link href={`/companies/${company.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/companies/${company.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(company.id)}
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
        title="Delete Company"
        description="Are you sure you want to delete this company? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CompaniesPageContent />
    </Suspense>
  );
}
