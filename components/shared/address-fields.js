"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AddressFields({
  formData,
  onChange,
  showCard = true,
  className = "",
}) {
  const handleChange = (field) => (e) => {
    onChange({ ...formData, [field]: e.target.value });
  };

  const content = (
    <div className={`grid gap-4 md:grid-cols-2 ${className}`}>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="address">Street Address</Label>
        <Input
          id="address"
          value={formData.address || ""}
          onChange={handleChange("address")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          value={formData.city || ""}
          onChange={handleChange("city")}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state || ""}
            onChange={handleChange("state")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">ZIP</Label>
          <Input
            id="zip"
            value={formData.zip || ""}
            onChange={handleChange("zip")}
          />
        </div>
      </div>
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Address</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
