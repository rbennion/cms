"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";

// Inline "create a new student / parent from the group page" form, laid out
// like the Meeting Locations add form on the same page. Creates the person,
// adds them to the group, and ties them to the chosen family members in one
// save. `kind` is what the new person is; `relatedOptions` are the people
// they can be tied to (parents for a student, students for a parent).
export function NewMemberForm({ kind, relatedOptions, onSubmit, onCancel }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [related, setRelated] = useState([]);
  const [saving, setSaving] = useState(false);

  const label = kind === "student" ? "Student" : "Parent";
  const relatedLabel = kind === "student" ? "Parent(s)" : "Student(s)";
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form, related.map((p) => p.id));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">First Name</Label>
            <Input
              value={form.first_name}
              onChange={set("first_name")}
              className="h-8 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Last Name</Label>
            <Input
              value={form.last_name}
              onChange={set("last_name")}
              className="h-8 text-sm"
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={set("email")}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{relatedLabel}</Label>
          <MultiSelectSearch
            options={relatedOptions}
            selected={related}
            onChange={setRelated}
            placeholder="Search people..."
            renderOption={(p) => `${p.first_name} ${p.last_name}`}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            Add {label}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
