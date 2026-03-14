"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { AddressFields } from "@/components/shared/address-fields";
import { FormActions } from "@/components/shared/form-actions";

export function CompanyForm({ company, isEdit = false }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: company?.name || "",
    address: company?.address || "",
    city: company?.city || "",
    state: company?.state || "",
    zip: company?.zip || "",
    website: company?.website || "",
    is_donor: company?.is_donor || false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/companies/${company.id}` : "/api/companies";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save company");
      }

      const data = await res.json();
      toast({
        title: isEdit
          ? "Company updated successfully"
          : "Company created successfully",
      });
      router.push(`/companies/${data.id}`);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
              placeholder="https://"
            />
          </div>
        </CardContent>
      </Card>

      <AddressFields formData={formData} onChange={setFormData} />

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_donor"
              checked={formData.is_donor}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_donor: checked })
              }
            />
            <Label htmlFor="is_donor">Donor Organization</Label>
          </div>
        </CardContent>
      </Card>

      <FormActions
        loading={loading}
        isEdit={isEdit}
        onCancel={() => router.back()}
        submitLabel={isEdit ? "Update Company" : "Create Company"}
      />
    </form>
  );
}
