"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { AddressFields } from "@/components/shared/address-fields";
import { FormActions } from "@/components/shared/form-actions";

export function PersonForm({ person, isEdit = false }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [engagementStages, setEngagementStages] = useState([]);

  const [formData, setFormData] = useState({
    first_name: person?.first_name || "",
    middle_name: person?.middle_name || "",
    last_name: person?.last_name || "",
    email: person?.email || "",
    phone: person?.phone || "",
    title: person?.title || "",
    address: person?.address || "",
    city: person?.city || "",
    state: person?.state || "",
    zip: person?.zip || "",
    is_donor: person?.is_donor || false,
    is_fc_certified: person?.is_fc_certified || false,
    certification_status:
      person?.certification?.background_check_status || "pending",
    stage_id: person?.stage_id || null,
    children: person?.children || "",
    role_ids: person?.roles?.map((r) => r.id) || [],
  });

  const [selectedCompanies, setSelectedCompanies] = useState(
    person?.companies || []
  );
  const [selectedSchools, setSelectedSchools] = useState(person?.schools || []);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [schoolsRes, companiesRes, rolesRes, stagesRes] = await Promise.all(
        [
          fetch("/api/schools"),
          fetch("/api/companies?limit=1000"),
          fetch("/api/roles"),
          fetch("/api/engagement-stages"),
        ]
      );
      const schoolsData = await schoolsRes.json();
      const companiesData = await companiesRes.json();
      const rolesData = await rolesRes.json();
      const stagesData = await stagesRes.json();
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      setCompanies(companiesData.data || companiesData || []);
      setRoles(rolesData);
      setEngagementStages(stagesData);
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/people/${person.id}` : "/api/people";
      const method = isEdit ? "PUT" : "POST";

      const submitData = {
        ...formData,
        company_ids: selectedCompanies.map((c) => c.id),
        school_ids: selectedSchools.map((s) => s.id),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save person");
      }

      const data = await res.json();
      toast({
        title: isEdit
          ? "Person updated successfully"
          : "Person created successfully",
      });
      router.push(`/people/${data.id}`);
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

  const toggleArrayValue = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="middle_name">Middle Name</Label>
            <Input
              id="middle_name"
              value={formData.middle_name}
              onChange={(e) =>
                setFormData({ ...formData, middle_name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      <AddressFields formData={formData} onChange={setFormData} />

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            What is this person&apos;s relationship with your organization?
          </p>
          <div className="flex flex-wrap gap-4">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={formData.role_ids.includes(role.id)}
                  onCheckedChange={() => toggleArrayValue("role_ids", role.id)}
                />
                <Label htmlFor={`role-${role.id}`}>{role.name}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Where is this person in your engagement pipeline?
          </p>
          <Select
            value={formData.stage_id?.toString() || "_none"}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                stage_id: value === "_none" ? null : parseInt(value),
              })
            }
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No stage selected</SelectItem>
              {engagementStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id.toString()}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_donor"
              checked={formData.is_donor}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_donor: checked })
              }
            />
            <Label htmlFor="is_donor">Donor</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_fc_certified"
              checked={formData.is_fc_certified}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_fc_certified: checked })
              }
            />
            <Label htmlFor="is_fc_certified">FC Certified</Label>
          </div>
          {formData.is_fc_certified && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="space-y-2">
                <Label>Certification Status</Label>
                <Select
                  value={formData.certification_status || "pending"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, certification_status: value })
                  }
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiSelectSearch
            options={companies}
            selected={selectedCompanies}
            onChange={setSelectedCompanies}
            placeholder="Search companies..."
            renderOption={(c) => c.name}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schools</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiSelectSearch
            options={schools}
            selected={selectedSchools}
            onChange={setSelectedSchools}
            placeholder="Search schools..."
            renderOption={(s) => s.name}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="children">Children (names, ages)</Label>
            <Textarea
              id="children"
              value={formData.children}
              onChange={(e) =>
                setFormData({ ...formData, children: e.target.value })
              }
              placeholder="e.g., Emma (8), Jack (12)"
            />
          </div>
        </CardContent>
      </Card>

      <FormActions
        loading={loading}
        isEdit={isEdit}
        onCancel={() => router.back()}
        submitLabel={isEdit ? "Update Person" : "Create Person"}
      />
    </form>
  );
}
