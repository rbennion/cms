"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { SearchInput } from "@/components/shared/search-input";
import {
  Award,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Upload,
  Plus,
  Pencil,
  Save,
  X,
  FileText,
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
  const [filter, setFilter] = useState({ search: "", status: "", training: "" });
  const [editCert, setEditCert] = useState(null);
  const [uploadCert, setUploadCert] = useState(null);
  const [uploadType, setUploadType] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [allPeople, setAllPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [newCertData, setNewCertData] = useState({
    background_check_status: "pending",
    background_check_passed: false,
    application_received: false,
    qpr_gatekeeper_training: false,
    qpr_training_date: "",
    qpr_training_renewal_date: "",
  });
  const [creatingCert, setCreatingCert] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [savingRow, setSavingRow] = useState(false);

  useEffect(() => {
    fetchCertifications();
  }, [filter]);

  useEffect(() => {
    if (showAddDialog) {
      fetchPeopleWithoutCertifications();
    }
  }, [showAddDialog]);

  const fetchCertifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.search) params.append("search", filter.search);
      if (filter.status)
        params.append("background_check_status", filter.status);
      if (filter.training) params.append("qpr_gatekeeper_training", filter.training);

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

  const fetchPeopleWithoutCertifications = async () => {
    try {
      const res = await fetch("/api/people?limit=1000");
      const data = await res.json();
      const people = data.data || [];
      // Filter out people who already have certifications
      const certifiedPersonIds = new Set(
        certifications.map((c) => c.person_id)
      );
      const availablePeople = people.filter(
        (p) => !certifiedPersonIds.has(p.id)
      );
      setAllPeople(availablePeople);
    } catch (error) {
      console.error("Error fetching people:", error);
    }
  };

  const handleCreateCertification = async () => {
    if (!selectedPerson) {
      toast({
        title: "Error",
        description: "Please select a person",
        variant: "destructive",
      });
      return;
    }

    setCreatingCert(true);
    try {
      const res = await fetch("/api/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: selectedPerson.id,
          ...newCertData,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create certification");
      }

      toast({ title: "Certification created successfully" });
      setShowAddDialog(false);
      setSelectedPerson(null);
      setNewCertData({
        background_check_status: "pending",
        background_check_passed: false,
        application_received: false,
        qpr_gatekeeper_training: false,
        qpr_training_date: "",
        qpr_training_renewal_date: "",
      });
      fetchCertifications();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingCert(false);
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
        body: JSON.stringify({ qpr_gatekeeper_training: !currentValue }),
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

  const handleToggleApplicationReceived = async (certId, currentValue) => {
    try {
      const res = await fetch(`/api/certifications/${certId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_received: !currentValue }),
      });
      if (!res.ok) throw new Error("Failed to update application status");
      toast({ title: "Application status updated" });
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
      const res = await fetch(
        `/api/certifications/${uploadCert.id}/${uploadType}`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (!res.ok) {
        let serverMessage = `Upload failed (HTTP ${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) serverMessage = body.error;
        } catch {}
        throw new Error(serverMessage);
      }
      toast({ title: "File uploaded successfully" });
      fetchCertifications();
      setUploadCert(null);
      setUploadType(null);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStartEditRow = (cert) => {
    setEditingRowId(cert.id);
    setEditRowData({
      background_check_status: cert.background_check_status || "pending",
      background_check_passed: !!cert.background_check_passed,
      application_received: !!cert.application_received,
      qpr_gatekeeper_training: !!cert.qpr_gatekeeper_training,
      qpr_training_date: cert.qpr_training_date || "",
      qpr_training_renewal_date: cert.qpr_training_renewal_date || "",
    });
  };

  const handleSaveRow = async () => {
    setSavingRow(true);
    try {
      const res = await fetch(`/api/certifications/${editingRowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRowData),
      });
      if (!res.ok) throw new Error("Failed to update certification");
      toast({ title: "Certification updated successfully" });
      setEditingRowId(null);
      setEditRowData({});
      fetchCertifications();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingRow(false);
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
      >
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Certification
        </Button>
      </Header>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
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

        {/* Search and Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <SearchInput
            placeholder="Search by name or email..."
            value={filter.search}
            onChange={(value) =>
              setFilter((prev) => ({ ...prev, search: value }))
            }
            className="w-full sm:w-80"
          />
          <Select
            value={filter.status || "all"}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                status: value === "all" ? "" : value,
              }))
            }
          >
            <SelectTrigger className="w-full sm:w-40">
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
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="QPR Training" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">QPR Training Complete</SelectItem>
              <SelectItem value="false">QPR Training Incomplete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          ) : certifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No certifications found
            </div>
          ) : (
            certifications.map((cert) => {
              const status = cert.background_check_status || "pending";
              const config = statusConfig[status];
              return (
                <Card key={cert.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Link
                          href={`/people/${cert.person_id}`}
                          className="font-medium hover:underline"
                        >
                          {cert.first_name} {cert.last_name}
                        </Link>
                        {cert.email && (
                          <div className="text-sm text-muted-foreground">
                            {cert.email}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/people/${cert.person_id}`}>View</Link>
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={config.variant}
                        className="cursor-pointer"
                        onClick={() => setEditCert(cert)}
                      >
                        {config.label}
                      </Badge>
                      <Badge
                        variant={
                          cert.application_received ? "success" : "secondary"
                        }
                        className="cursor-pointer"
                        onClick={() =>
                          handleToggleApplicationReceived(
                            cert.id,
                            cert.application_received
                          )
                        }
                      >
                        App: {cert.application_received ? "Yes" : "No"}
                      </Badge>
                      <Badge
                        variant={
                          cert.qpr_gatekeeper_training ? "success" : "secondary"
                        }
                        className="cursor-pointer"
                        onClick={() =>
                          handleToggleTraining(cert.id, cert.qpr_gatekeeper_training)
                        }
                      >
                        QPR: {cert.qpr_gatekeeper_training ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead>Background Check</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>QPR Training</TableHead>
                <TableHead>QPR Certificate</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : certifications.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No certifications found
                  </TableCell>
                </TableRow>
              ) : (
                certifications.map((cert) => {
                  const status = cert.background_check_status || "pending";
                  const config = statusConfig[status];
                  const isEditing = editingRowId === cert.id;
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
                      <TableCell className="hidden lg:table-cell">
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
                        {isEditing ? (
                          <div className="space-y-2">
                            <Select
                              value={editRowData.background_check_status}
                              onValueChange={(value) =>
                                setEditRowData({ ...editRowData, background_check_status: value })
                              }
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="denied">Denied</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={editRowData.background_check_passed}
                                onCheckedChange={(checked) =>
                                  setEditRowData({ ...editRowData, background_check_passed: checked })
                                }
                              />
                              <span className="text-sm">Passed</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={config.variant}
                              className="cursor-pointer"
                              onClick={() => setEditCert(cert)}
                            >
                              {config.label}
                            </Badge>
                            <Badge
                              variant={cert.background_check_passed ? "success" : "secondary"}
                            >
                              {cert.background_check_passed ? "Passed" : "Not Passed"}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={editRowData.application_received}
                              onCheckedChange={(checked) =>
                                setEditRowData({ ...editRowData, application_received: checked })
                              }
                            />
                            <span className="text-sm">Received</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                cert.application_received
                                  ? "success"
                                  : "secondary"
                              }
                              className="cursor-pointer"
                              onClick={() =>
                                handleToggleApplicationReceived(
                                  cert.id,
                                  cert.application_received
                                )
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
                            {cert.application_attachment_path && (
                              <a href={`/api/certifications/${cert.id}/application`} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-3 w-3 text-primary" />
                              </a>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={editRowData.qpr_gatekeeper_training}
                                onCheckedChange={(checked) =>
                                  setEditRowData({ ...editRowData, qpr_gatekeeper_training: checked })
                                }
                              />
                              <span className="text-sm">Complete</span>
                            </div>
                            <Input
                              type="date"
                              value={editRowData.qpr_training_date}
                              onChange={(e) =>
                                setEditRowData({ ...editRowData, qpr_training_date: e.target.value })
                              }
                              className="h-8 text-xs w-36"
                              placeholder="Training date"
                            />
                            <Input
                              type="date"
                              value={editRowData.qpr_training_renewal_date}
                              onChange={(e) =>
                                setEditRowData({ ...editRowData, qpr_training_renewal_date: e.target.value })
                              }
                              className="h-8 text-xs w-36"
                              placeholder="Renewal date"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                cert.qpr_gatekeeper_training ? "success" : "secondary"
                              }
                              className="cursor-pointer"
                              onClick={() =>
                                handleToggleTraining(
                                  cert.id,
                                  cert.qpr_gatekeeper_training
                                )
                              }
                            >
                              {cert.qpr_gatekeeper_training ? "Complete" : "Incomplete"}
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
                            {cert.qpr_training_attachment_path && (
                              <a href={`/api/certifications/${cert.id}/training`} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-3 w-3 text-primary" />
                              </a>
                            )}
                            {cert.qpr_training_date && (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(cert.qpr_training_date)}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={cert.qpr_certificate_attachment_path ? "success" : "secondary"}
                          >
                            {cert.qpr_certificate_attachment_path ? "Uploaded" : "Not Uploaded"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setUploadCert(cert);
                              setUploadType("qpr-certificate");
                            }}
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                          {cert.qpr_certificate_attachment_path && (
                            <a href={`/api/certifications/${cert.id}/qpr-certificate`} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-3 w-3 text-primary" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={handleSaveRow} disabled={savingRow}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingRowId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleStartEditRow(cert)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/people/${cert.person_id}`}>
                                View
                              </Link>
                            </Button>
                          </div>
                        )}
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
              Upload {
                uploadType === "application" ? "Application"
                  : uploadType === "training" ? "QPR Training"
                  : uploadType === "qpr-certificate" ? "QPR Certificate"
                  : "Background Check"
              }{" "}
              Document
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="file">Select File</Label>
            <input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="mt-2 block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
              onChange={handleFileUpload}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Accepted: PDF, JPG, PNG, DOC, DOCX · Max 10MB
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Certification Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Certification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Person *</Label>
              <MultiSelectSearch
                options={allPeople}
                selected={selectedPerson ? [selectedPerson] : []}
                onChange={(selected) => setSelectedPerson(selected[0] || null)}
                placeholder="Search for a person..."
                renderOption={(p) => `${p.first_name} ${p.last_name}`}
                singleSelect
              />
              {allPeople.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  All people already have certifications, or loading...
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Background Check Status</Label>
              <Select
                value={newCertData.background_check_status}
                onValueChange={(value) =>
                  setNewCertData({
                    ...newCertData,
                    background_check_status: value,
                  })
                }
              >
                <SelectTrigger className="w-full">
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-cert-bg-passed"
                checked={newCertData.background_check_passed}
                onCheckedChange={(checked) =>
                  setNewCertData({
                    ...newCertData,
                    background_check_passed: checked,
                  })
                }
              />
              <Label htmlFor="add-cert-bg-passed">Background Check Passed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-cert-application"
                checked={newCertData.application_received}
                onCheckedChange={(checked) =>
                  setNewCertData({
                    ...newCertData,
                    application_received: checked,
                  })
                }
              />
              <Label htmlFor="add-cert-application">Application Received</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-cert-training"
                checked={newCertData.qpr_gatekeeper_training}
                onCheckedChange={(checked) =>
                  setNewCertData({ ...newCertData, qpr_gatekeeper_training: checked })
                }
              />
              <Label htmlFor="add-cert-training">QPR Training Complete</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-cert-training-date">QPR Training Date</Label>
              <Input
                type="date"
                id="add-cert-training-date"
                value={newCertData.qpr_training_date}
                onChange={(e) =>
                  setNewCertData({ ...newCertData, qpr_training_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-cert-renewal-date">QPR Training Renewal Date</Label>
              <Input
                type="date"
                id="add-cert-renewal-date"
                value={newCertData.qpr_training_renewal_date}
                onChange={(e) =>
                  setNewCertData({ ...newCertData, qpr_training_renewal_date: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={creatingCert}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCertification}
              disabled={creatingCert}
              className="w-full sm:w-auto"
            >
              {creatingCert ? "Creating..." : "Create Certification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
