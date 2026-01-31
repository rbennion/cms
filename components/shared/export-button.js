"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Download, FileSpreadsheet, Mail } from "lucide-react";

export function ExportButton({ entityType, filters = {} }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async (format) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        entityType,
        format,
        filters: JSON.stringify(filters),
      });

      const res = await fetch(`/api/export?${params}`);

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const filename =
        format === "email"
          ? `${entityType}-emails.txt`
          : `${entityType}-export.csv`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export to CSV
        </DropdownMenuItem>
        {entityType === "people" && (
          <DropdownMenuItem onClick={() => handleExport("email")}>
            <Mail className="mr-2 h-4 w-4" />
            Export Email List
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
