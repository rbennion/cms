"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ExternalLink,
} from "lucide-react";
import { SortableHeader } from "@/components/ui/data-table";

export const createCompaniesColumns = ({ onDelete }) => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Name</SortableHeader>
    ),
    cell: ({ row }) => {
      const company = row.original;
      return (
        <Link
          href={`/companies/${company.id}`}
          className="font-medium hover:underline"
        >
          {company.name}
        </Link>
      );
    },
  },
  {
    id: "location",
    accessorFn: (row) => {
      if (row.city && row.state) return `${row.city}, ${row.state}`;
      return row.city || row.state || "";
    },
    header: ({ column }) => (
      <SortableHeader column={column}>Location</SortableHeader>
    ),
    cell: ({ row }) => row.getValue("location") || "-",
  },
  {
    accessorKey: "website",
    header: "Website",
    cell: ({ row }) => {
      const website = row.getValue("website");
      if (!website) return "-";
      return (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm hover:underline"
        >
          Visit
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "is_donor",
    header: "Status",
    cell: ({ row }) => {
      const isDonor = row.getValue("is_donor");
      return isDonor ? <Badge variant="success">Donor</Badge> : null;
    },
    enableSorting: false,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const company = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <span className="sr-only">Open menu</span>
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
              onClick={() => onDelete(company.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
