"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [people, setPeople] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    school_id: "",
    gender: "Girls",
    year: "",
    status: "Active",
    meeting_location: "",
    notes: "",
    leader_ids: [],
    primary_leader_id: null,
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [schoolsRes, peopleRes] = await Promise.all([
        fetch("/api/schools"),
        fetch("/api/people?limit=1000"),
      ]);
      const schoolsData = await schoolsRes.json();
      const peopleData = await peopleRes.json();
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      setPeople(peopleData.data || peopleData || []);
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const sortedPeople = people.slice().sort((a, b) => {
    const nameA = (a.first_name || "").toLowerCase();
    const nameB = (b.first_name || "").toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return (a.last_name || "").localeCompare(b.last_name || "");
  });

  const selectedLeaders = sortedPeople.filter((p) =>
    formData.leader_ids.includes(p.id)
  );
  const selectedPrimaryLeader = formData.primary_leader_id
    ? sortedPeople.filter((p) => p.id === formData.primary_leader_id)
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.school_id) {
      toast({
        title: "Error",
        description: "Please select a school",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...formData,
        year: formData.year ? parseInt(formData.year, 10) : null,
      };
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create group");
      }
      const group = await res.json();
      toast({ title: "Group created successfully" });
      router.push(`/groups/${group.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="New Group" description="Create a new group" />
      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Link>
          </Button>
        </div>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Group Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school_id">School *</Label>
                  <Select
                    value={formData.school_id?.toString() || ""}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, school_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem
                          key={school.id}
                          value={school.id.toString()}
                        >
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, gender: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Girls">Girls</SelectItem>
                        <SelectItem value="Boys">Boys</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      min="2000"
                      max="2099"
                      value={formData.year}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          year: e.target.value,
                        }))
                      }
                      placeholder="e.g., 2026"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Alumni">Alumni</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meeting_location">Meeting Location</Label>
                  <Input
                    id="meeting_location"
                    value={formData.meeting_location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        meeting_location: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Primary Leader</Label>
                  <MultiSelectSearch
                    options={sortedPeople}
                    selected={selectedPrimaryLeader}
                    onChange={(selected) => {
                      setFormData((prev) => ({
                        ...prev,
                        primary_leader_id:
                          selected.length > 0 ? selected[0].id : null,
                      }));
                    }}
                    placeholder="Search for primary leader..."
                    renderOption={(p) => `${p.first_name} ${p.last_name}`}
                    singleSelect
                  />
                  {formData.primary_leader_id && (
                    <div className="text-sm text-muted-foreground">
                      Selected:{" "}
                      {
                        sortedPeople.find(
                          (p) => p.id === formData.primary_leader_id
                        )?.first_name
                      }{" "}
                      {
                        sortedPeople.find(
                          (p) => p.id === formData.primary_leader_id
                        )?.last_name
                      }
                      <button
                        type="button"
                        className="ml-2 text-destructive hover:underline"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            primary_leader_id: null,
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Additional Leaders</Label>
                  <MultiSelectSearch
                    options={sortedPeople.filter(
                      (p) => p.id !== formData.primary_leader_id
                    )}
                    selected={selectedLeaders}
                    onChange={(selected) => {
                      setFormData((prev) => ({
                        ...prev,
                        leader_ids: selected.map((s) => s.id),
                      }));
                    }}
                    placeholder="Search for leaders..."
                    renderOption={(p) => `${p.first_name} ${p.last_name}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Creating..." : "Create Group"}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/groups">Cancel</Link>
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
