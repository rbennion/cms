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

export const createPeopleColumns = ({ onDelete }) => [
  {
    accessorKey: "name",
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    header: ({ column }) => (
      <SortableHeader column={column}>Name</SortableHeader>
    ),
    cell: ({ row }) => {
      const person = row.original;
      return (
        <div>
          <Link
            href={`/people/${person.id}`}
            className="font-medium hover:underline"
          >
            {person.first_name} {person.last_name}
          </Link>
          {person.title && (
            <p className="text-sm text-muted-foreground">{person.title}</p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <SortableHeader column={column}>Email</SortableHeader>
    ),
    cell: ({ row }) => row.getValue("email") || "-",
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <SortableHeader column={column}>Phone</SortableHeader>
    ),
    cell: ({ row }) => row.getValue("phone") || "-",
  },
  {
    accessorKey: "roles",
    header: "Roles",
    cell: ({ row }) => {
      const roles = row.getValue("roles");
      if (!roles) return <span className="text-muted-foreground">-</span>;

      // Map role names to colors
      const getRoleVariant = (roleName) => {
        const name = roleName.trim().toLowerCase();
        if (name.includes("board")) return "purple";
        if (name.includes("volunteer")) return "teal";
        if (name.includes("parent")) return "pink";
        if (name.includes("fc leader")) return "indigo";
        if (name.includes("potential")) return "warning";
        if (name.includes("vendor")) return "orange";
        if (name.includes("partner")) return "cyan";
        if (name.includes("staff")) return "info";
        if (name.includes("teacher")) return "rose";
        return "secondary";
      };

      return (
        <div className="flex flex-wrap gap-1">
          {roles.split(",").map((role, i) => (
            <Badge key={i} variant={getRoleVariant(role)}>
              {role.trim()}
            </Badge>
          ))}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "stage_name",
    header: "Stage",
    cell: ({ row }) => {
      const stageName = row.getValue("stage_name");
      if (!stageName) return <span className="text-muted-foreground">-</span>;

      // Map stage names to colors
      const getStageVariant = (name) => {
        const stage = name.toLowerCase();
        if (stage === "lead") return "warning";
        if (stage === "prospect") return "info";
        if (stage === "active") return "success";
        if (stage === "inactive") return "secondary";
        return "secondary";
      };

      return <Badge variant={getStageVariant(stageName)}>{stageName}</Badge>;
    },
    enableSorting: false,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const person = row.original;
      const isDonor = person.is_donor === true || person.is_donor === 1;
      const isCertified =
        person.is_fc_certified === true || person.is_fc_certified === 1;

      if (!isDonor && !isCertified)
        return <span className="text-muted-foreground">-</span>;

      return (
        <div className="flex flex-wrap gap-1">
          {isDonor && <Badge variant="success">Donor</Badge>}
          {isCertified && <Badge variant="info">Certified</Badge>}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const person = row.original;
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
              <Link href={`/people/${person.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(person.id)}
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
