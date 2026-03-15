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
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { SortableHeader } from "@/components/ui/data-table";

const getStatusVariant = (status) => {
  switch (status) {
    case "Active":
      return "success";
    case "Inactive":
      return "secondary";
    case "Alumni":
      return "info";
    default:
      return "secondary";
  }
};

export const createGroupsColumns = ({ onDelete }) => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Name</SortableHeader>
    ),
    cell: ({ row }) => {
      const group = row.original;
      return (
        <Link
          href={`/groups/${group.id}`}
          className="font-medium hover:underline"
        >
          {group.name}
        </Link>
      );
    },
  },
  {
    accessorKey: "school_name",
    header: ({ column }) => (
      <SortableHeader column={column}>School</SortableHeader>
    ),
    cell: ({ row }) => row.getValue("school_name") || "-",
  },
  {
    accessorKey: "gender",
    header: ({ column }) => (
      <SortableHeader column={column}>Gender</SortableHeader>
    ),
    cell: ({ row }) => {
      const gender = row.getValue("gender");
      return (
        <Badge variant={gender === "Girls" ? "default" : "secondary"}>
          {gender}
        </Badge>
      );
    },
  },
  {
    accessorKey: "year",
    header: ({ column }) => (
      <SortableHeader column={column}>Year</SortableHeader>
    ),
    cell: ({ row }) => row.getValue("year") || "-",
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <SortableHeader column={column}>Status</SortableHeader>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") || "Active";
      return <Badge variant={getStatusVariant(status)}>{status}</Badge>;
    },
  },
  {
    id: "primary_leader",
    header: "Primary Leader",
    cell: ({ row }) => {
      const group = row.original;
      if (group.primary_leader_first_name) {
        return (
          <span className="text-sm">
            {group.primary_leader_first_name} {group.primary_leader_last_name}
          </span>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    },
    enableSorting: false,
  },
  {
    accessorKey: "leader_count",
    header: "Leaders",
    cell: ({ row }) => {
      const count = row.getValue("leader_count") || 0;
      return <span>{count}</span>;
    },
    enableSorting: false,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const group = row.original;
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
              <Link href={`/groups/${group.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(group.id)}
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
