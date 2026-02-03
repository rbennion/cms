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
import { formatCurrency, formatDate } from "@/lib/utils";

export const createDonationsColumns = ({ onDelete }) => [
  {
    accessorKey: "date",
    header: ({ column }) => (
      <SortableHeader column={column}>Date</SortableHeader>
    ),
    cell: ({ row }) => formatDate(row.getValue("date")),
  },
  {
    id: "donor",
    accessorFn: (row) => {
      if (row.first_name) {
        return `${row.first_name} ${row.last_name}`;
      }
      return row.company_name || "";
    },
    header: ({ column }) => (
      <SortableHeader column={column}>Donor</SortableHeader>
    ),
    cell: ({ row }) => {
      const donation = row.original;
      if (donation.first_name) {
        return (
          <Link
            href={`/people/${donation.person_id}`}
            className="font-medium hover:underline"
          >
            {donation.first_name} {donation.last_name}
          </Link>
        );
      }
      return (
        <Link
          href={`/companies/${donation.company_id}`}
          className="font-medium hover:underline"
        >
          {donation.company_name}
        </Link>
      );
    },
  },
  {
    id: "type",
    header: "Type",
    cell: ({ row }) => {
      const donation = row.original;
      return (
        <Badge variant="outline">
          {donation.first_name ? "Individual" : "Company"}
        </Badge>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "note",
    header: "Note",
    cell: ({ row }) => {
      const note = row.getValue("note");
      return (
        <span className="max-w-[200px] truncate block">{note || "-"}</span>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader column={column}>Amount</SortableHeader>
      </div>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      return (
        <div className="text-right font-semibold text-green-600">
          {formatCurrency(amount)}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const donation = row.original;
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
              <Link href={`/donations/${donation.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(donation.id)}
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
