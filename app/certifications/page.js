"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import {
  Award,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Upload,
} from "lucide-react";

const statusConfig = {
  pending: { label: "Pending", variant: "warning", icon: Clock },
  approved: { label: "Approved", variant: "success", icon: CheckCircle },
  denied: { label: "Denied", variant: "destructive", icon: XCircle },
  expired: { label: "Expired", variant: "secondary", icon: AlertCircle },
};

export default function CertificationsPage() {
  const { toast } = useToast();
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", training: "" });
  const [editCert, setEditCert] = useState(null);
  const [uploadCert, setUploadCert] = useState(null);
  const [uploadType, setUploadType] = useState(null);

  useEffect(() => {
    fetchCertifications();
  }, [filter]);

  const fetchCertifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status)
        params.append("background_check_status", filter.status);
      if (filter.training) params.append("training_complete", filter.training);

      const res = await fetch(`/api/certifications?${params}`);
      const data = await res.json();
      setCertifications(data);
    } catch (error) {
      console.error("Error fetching certifications:", error);
      toast({
        title: "Error",
        description: "Failed to fetch certifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (certId, newStatus) => {
    try {
      const res = await fetch(`/api/certifications/${certId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background_check_status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast({ title: "Status updated successfully" });
      fetchCertifications();
      setEditCert(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleTraining = async (certId, currentValue) => {
    try {
      const res = await fetch(`/api/certifications/${certId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ training_complete: !currentValue }),
      });
      if (!res.ok) throw new Error("Failed to update training status");
      toast({ title: "Training status updated" });
      fetchCertifications();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const endpoint =
        uploadType === "application" ? "application" : "training";
      const res = await fetch(
        `/api/certifications/${uploadCert.id}/${endpoint}`,
        {
          method: "POST",
          body: formData,
        },
      );
      if (!res.ok) throw new Error("Failed to upload file");
      toast({ title: "File uploaded successfully" });
      fetchCertifications();
      setUploadCert(null);
      setUploadType(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Count by status
  const statusCounts = certifications.reduce((acc, cert) => {
    const status = cert.background_check_status || "pending";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col">
      <Header
        title="Certifications"
        description="Manage FC certification status"
      />

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {Object.entries(statusConfig).map(([status, config]) => {
            const IconComponent = config.icon;
            return (
              <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {config.label}
                  </CardTitle>
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statusCounts[status] || 0}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <Select
            value={filter.status || "all"}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                status: value === "all" ? "" : value,
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filter.training || "all"}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                training: value === "all" ? "" : value,
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Training Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Training Complete</SelectItem>
              <SelectItem value="false">Training Incomplete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Background Check</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>Training</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : certifications.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No certifications found
                  </TableCell>
                </TableRow>
              ) : (
                certifications.map((cert) => {
                  const status = cert.background_check_status || "pending";
                  const config = statusConfig[status];
                  return (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <Link
                          href={`/people/${cert.person_id}`}
                          className="font-medium hover:underline"
                        >
                          {cert.first_name} {cert.last_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {cert.email && <div>{cert.email}</div>}
                          {cert.phone && (
                            <div className="text-muted-foreground">
                              {cert.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={config.variant}
                          className="cursor-pointer"
                          onClick={() => setEditCert(cert)}
                        >
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              cert.application_received
                                ? "success"
                                : "secondary"
                            }
                          >
                            {cert.application_received
                              ? "Received"
                              : "Not Received"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setUploadCert(cert);
                              setUploadType("application");
                            }}
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              cert.training_complete ? "success" : "secondary"
                            }
                            className="cursor-pointer"
                            onClick={() =>
                              handleToggleTraining(
                                cert.id,
                                cert.training_complete,
                              )
                            }
                          >
                            {cert.training_complete ? "Complete" : "Incomplete"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setUploadCert(cert);
                              setUploadType("training");
                            }}
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/people/${cert.person_id}`}>
                            View Profile
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Status Dialog */}
      <Dialog open={!!editCert} onOpenChange={() => setEditCert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Background Check Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Status</Label>
            <Select
              defaultValue={editCert?.background_check_status || "pending"}
              onValueChange={(value) => handleStatusUpdate(editCert?.id, value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog
        open={!!uploadCert && !!uploadType}
        onOpenChange={() => {
          setUploadCert(null);
          setUploadType(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload {uploadType === "application" ? "Application" : "Training"}{" "}
              Document
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="file">Select File</Label>
            <input
              id="file"
              type="file"
              className="mt-2 block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
              onChange={handleFileUpload}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Maximum file size: 10MB
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
