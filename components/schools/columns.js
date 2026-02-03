"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { SortableHeader } from "@/components/ui/data-table";

export const createSchoolsColumns = ({ onDelete }) => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Name</SortableHeader>
    ),
    cell: ({ row }) => {
      const school = row.original;
      return (
        <Link
          href={`/schools/${school.id}`}
          className="font-medium hover:underline"
        >
          {school.name}
        </Link>
      );
    },
  },
  {
    accessorKey: "address",
    header: ({ column }) => (
      <SortableHeader column={column}>Address</SortableHeader>
    ),
    cell: ({ row }) => row.getValue("address") || "-",
  },
  {
    accessorKey: "city",
    header: ({ column }) => (
      <SortableHeader column={column}>City</SortableHeader>
    ),
    cell: ({ row }) => row.getValue("city") || "-",
  },
  {
    accessorKey: "state",
    header: ({ column }) => (
      <SortableHeader column={column}>State</SortableHeader>
    ),
    cell: ({ row }) => row.getValue("state") || "-",
  },
  {
    accessorKey: "zip",
    header: "ZIP",
    cell: ({ row }) => row.getValue("zip") || "-",
    enableSorting: false,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const school = row.original;
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
              <Link href={`/schools/${school.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(school.id)}
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
