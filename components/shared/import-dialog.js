"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Download,
} from "lucide-react";

const FIELD_OPTIONS = {
  people: [
    { value: "first_name", label: "First Name", required: true },
    { value: "last_name", label: "Last Name", required: true },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "title", label: "Title" },
    { value: "address", label: "Address" },
    { value: "city", label: "City" },
    { value: "state", label: "State" },
    { value: "zip", label: "Zip" },
  ],
  companies: [
    { value: "name", label: "Company Name", required: true },
    { value: "address", label: "Address" },
    { value: "city", label: "City" },
    { value: "state", label: "State" },
    { value: "zip", label: "Zip" },
    { value: "website", label: "Website" },
  ],
  schools: [
    { value: "name", label: "School Name", required: true },
    { value: "address", label: "Address" },
    { value: "city", label: "City" },
    { value: "state", label: "State" },
    { value: "zip", label: "Zip" },
  ],
};

// CSV templates with sample data for each entity type
const CSV_TEMPLATES = {
  people: {
    headers: [
      "first_name",
      "last_name",
      "email",
      "phone",
      "title",
      "address",
      "city",
      "state",
      "zip",
    ],
    sampleRows: [
      [
        "John",
        "Doe",
        "john.doe@example.com",
        "555-123-4567",
        "Manager",
        "123 Main St",
        "Austin",
        "TX",
        "78701",
      ],
      [
        "Jane",
        "Smith",
        "jane.smith@example.com",
        "555-987-6543",
        "Director",
        "456 Oak Ave",
        "Dallas",
        "TX",
        "75201",
      ],
    ],
  },
  companies: {
    headers: ["name", "address", "city", "state", "zip", "website"],
    sampleRows: [
      [
        "Acme Corporation",
        "100 Business Blvd",
        "Houston",
        "TX",
        "77001",
        "https://acme.example.com",
      ],
      [
        "Tech Solutions Inc",
        "200 Innovation Dr",
        "San Antonio",
        "TX",
        "78201",
        "https://techsolutions.example.com",
      ],
    ],
  },
  schools: {
    headers: ["name", "address", "city", "state", "zip"],
    sampleRows: [
      ["Lincoln Elementary", "500 School Rd", "Austin", "TX", "78702"],
      [
        "Washington Middle School",
        "600 Education Ave",
        "Round Rock",
        "TX",
        "78664",
      ],
    ],
  },
};

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export function ImportDialog({ open, onOpenChange, entityType, onSuccess }) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fieldOptions = FIELD_OPTIONS[entityType] || [];

  const handleDownloadTemplate = () => {
    const template = CSV_TEMPLATES[entityType];
    if (!template) return;

    const csvContent = [
      template.headers.join(","),
      ...template.sampleRows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${entityType}-import-template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    try {
      const content = await selectedFile.text();
      const lines = content.split("\n");
      const csvHeaders = parseCSVLine(lines[0]);
      setHeaders(csvHeaders);

      // Get first 3 data rows for preview
      const preview = [];
      for (let i = 1; i < Math.min(4, lines.length); i++) {
        const line = lines[i].trim();
        if (line) {
          const values = parseCSVLine(line);
          const row = {};
          csvHeaders.forEach((header, index) => {
            row[header] = values[index] || "";
          });
          preview.push(row);
        }
      }
      setPreviewRows(preview);

      // Auto-map columns based on similar names
      const autoMapping = {};
      for (const field of fieldOptions) {
        const matchingHeader = csvHeaders.find(
          (h) =>
            h.toLowerCase().replace(/[_\s]/g, "") ===
            field.value.toLowerCase().replace(/[_\s]/g, "")
        );
        if (matchingHeader) {
          autoMapping[field.value] = matchingHeader;
        }
      }
      setMapping(autoMapping);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse CSV file",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    // Check required fields are mapped
    const missingRequired = fieldOptions
      .filter((f) => f.required && !mapping[f.value])
      .map((f) => f.label);

    if (missingRequired.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please map: ${missingRequired.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("mapping", JSON.stringify(mapping));

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data);

      if (data.imported > 0) {
        toast({
          title: "Import complete",
          description: `Imported ${data.imported} records, skipped ${data.skipped}`,
        });
        onSuccess?.();
      }
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

  const handleClose = () => {
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setMapping({});
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Import {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download & Help */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Need a template?</p>
                <p className="text-xs text-muted-foreground">
                  Download a sample CSV with the correct column format
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Expected columns:</p>
              <p>
                {fieldOptions.map((f, i) => (
                  <span key={f.value}>
                    {i > 0 && ", "}
                    <span className={f.required ? "font-semibold" : ""}>
                      {f.value}
                      {f.required && "*"}
                    </span>
                  </span>
                ))}
              </p>
              <p className="mt-1 italic">* Required fields</p>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-5 w-5" />
                  {file.name}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to select a CSV file
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Column Mapping */}
          {headers.length > 0 && (
            <div className="space-y-4">
              <Label>Column Mapping</Label>
              <div className="grid grid-cols-2 gap-4">
                {fieldOptions.map((field) => (
                  <div key={field.value} className="space-y-1">
                    <Label className="text-sm">
                      {field.label}
                      {field.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    <Select
                      value={mapping[field.value] || ""}
                      onValueChange={(value) =>
                        setMapping((m) => ({ ...m, [field.value]: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (first 3 rows)</Label>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {fieldOptions
                        .filter((f) => mapping[f.value])
                        .map((field) => (
                          <th key={field.value} className="px-3 py-2 text-left">
                            {field.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        {fieldOptions
                          .filter((f) => mapping[f.value])
                          .map((field) => (
                            <td key={field.value} className="px-3 py-2">
                              {row[mapping[field.value]] || "-"}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`p-4 rounded-lg ${
                result.imported > 0
                  ? "bg-green-50 border border-green-200"
                  : "bg-amber-50 border border-amber-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.imported > 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <p className="font-medium">
                    Imported {result.imported} of {result.total} records
                  </p>
                  {result.skipped > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {result.skipped} duplicates skipped
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={loading || !file}>
              {loading ? "Importing..." : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
