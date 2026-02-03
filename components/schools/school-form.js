"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { AddressFields } from "@/components/shared/address-fields";
import { FormActions } from "@/components/shared/form-actions";

export function SchoolForm({ school, isEdit = false }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: school?.name || "",
    address: school?.address || "",
    city: school?.city || "",
    state: school?.state || "",
    zip: school?.zip || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/schools/${school.id}` : "/api/schools";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save school");
      }

      const data = await res.json();
      toast({
        title: isEdit
          ? "School updated successfully"
          : "School created successfully",
      });
      router.push(`/schools/${data.id}`);
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
          <CardTitle>School Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">School Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
        </CardContent>
      </Card>

      <AddressFields formData={formData} onChange={setFormData} />

      <FormActions
        loading={loading}
        isEdit={isEdit}
        onCancel={() => router.back()}
        submitLabel={isEdit ? "Update School" : "Create School"}
      />
    </form>
  );
}
