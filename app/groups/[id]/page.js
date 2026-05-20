"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Pencil,
  Trash2,
  MapPin,
  Users,
  Save,
  X,
  ArrowLeft,
  Plus,
  Crown,
  Building2,
} from "lucide-react";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [groupData, setGroupData] = useState({
    name: "",
    gender: "Girls",
    year: "",
    status: "Active",
    meeting_location: "",
    notes: "",
  });
  const [allPeople, setAllPeople] = useState([]);

  // Primary leader state
  const [showPrimaryLeaderAdd, setShowPrimaryLeaderAdd] = useState(false);

  // Support leaders state
  const [showLeaderAdd, setShowLeaderAdd] = useState(false);

  // Students state
  const [showStudentAdd, setShowStudentAdd] = useState(false);

  // Parents state
  const [showParentAdd, setShowParentAdd] = useState(false);

  // Meeting locations state
  const [showLocationAdd, setShowLocationAdd] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    is_primary: false,
  });

  useEffect(() => {
    fetchGroup();
    fetchPeople();
  }, [params.id]);

  const fetchPeople = async () => {
    try {
      const res = await fetch("/api/people?limit=1000");
      const data = await res.json();
      const peopleList = data.data || data || [];
      setAllPeople(
        peopleList.sort((a, b) => {
          const nameA = (a.first_name || "").toLowerCase();
          const nameB = (b.first_name || "").toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return (a.last_name || "").localeCompare(b.last_name || "");
        })
      );
    } catch (error) {
      console.error("Error fetching people:", error);
    }
  };

  const fetchGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${params.id}`);
      if (!res.ok) throw new Error("Group not found");
      const data = await res.json();
      setGroup(data);
      setGroupData({
        name: data.name || "",
        gender: data.gender || "Girls",
        year: data.year || "",
        status: data.status || "Active",
        meeting_location: data.meeting_location || "",
        notes: data.notes || "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      router.push("/groups");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/groups/${params.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Group deleted successfully" });
      router.push("/groups");
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveInfo = async () => {
    try {
      const body = {
        ...groupData,
        year: groupData.year ? parseInt(groupData.year, 10) : null,
      };
      const res = await fetch(`/api/groups/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update group");
      toast({ title: "Group updated successfully" });
      setIsEditingInfo(false);
      fetchGroup();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setGroupData({
      name: group.name || "",
      gender: group.gender || "Girls",
      year: group.year || "",
      status: group.status || "Active",
      meeting_location: group.meeting_location || "",
      notes: group.notes || "",
    });
    setIsEditingInfo(false);
  };

  // Primary leader handlers
  const handleSetPrimaryLeader = async (person) => {
    try {
      const res = await fetch(`/api/groups/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_leader_id: person.id }),
      });
      if (!res.ok) throw new Error("Failed to set primary leader");
      toast({ title: "Primary leader updated" });
      setShowPrimaryLeaderAdd(false);
      fetchGroup();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemovePrimaryLeader = async () => {
    try {
      const res = await fetch(`/api/groups/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_leader_id: null }),
      });
      if (!res.ok) throw new Error("Failed to remove primary leader");
      toast({ title: "Primary leader removed" });
      fetchGroup();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Additional leaders handlers
  const handleAddLeader = async (person) => {
    try {
      const currentLeaderIds = group.leaders?.map((l) => l.id) || [];
      if (currentLeaderIds.includes(person.id)) {
        toast({ title: "Person is already a leader" });
        return;
      }
      const res = await fetch(`/api/groups/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leader_ids: [...currentLeaderIds, person.id],
        }),
      });
      if (!res.ok) throw new Error("Failed to add leader");
      toast({ title: "Leader added" });
      setShowLeaderAdd(false);
      fetchGroup();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveLeader = async (personId) => {
    try {
      const currentLeaderIds = group.leaders?.map((l) => l.id) || [];
      const res = await fetch(`/api/groups/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leader_ids: currentLeaderIds.filter((id) => id !== personId),
        }),
      });
      if (!res.ok) throw new Error("Failed to remove leader");
      toast({ title: "Leader removed" });
      fetchGroup();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Student handlers
  const handleAddStudent = async (person) => {
    try {
      const res = await fetch(`/api/groups/${params.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: person.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add student");
      }
      toast({ title: "Student added" });
      setShowStudentAdd(false);
      fetchGroup();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveStudent = async (personId) => {
    try {
      const res = await fetch(`/api/groups/${params.id}/students/${personId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove student");
      toast({ title: "Student removed" });
      fetchGroup();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Parent handlers
  const handleAddParent = async (person) => {
    try {
      const res = await fetch(`/api/groups/${params.id}/parents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: person.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add parent");
      }
      toast({ title: "Parent added" });
      setShowParentAdd(false);
      fetchGroup();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveParent = async (personId) => {
    try {
      const res = await fetch(`/api/groups/${params.id}/parents/${personId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove parent");
      toast({ title: "Parent removed" });
      fetchGroup();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Meeting location handlers
  const handleAddLocation = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `/api/groups/${params.id}/meeting-locations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newLocation),
        }
      );
      if (!res.ok) throw new Error("Failed to add location");
      toast({ title: "Meeting location added" });
      setShowLocationAdd(false);
      setNewLocation({
        name: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        is_primary: false,
      });
      fetchGroup();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveLocation = async (locationId) => {
    try {
      const res = await fetch(
        `/api/groups/${params.id}/meeting-locations?location_id=${locationId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove location");
      toast({ title: "Meeting location removed" });
      fetchGroup();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "Active":
        return "success";
      case "Inactive":
        return "secondary";
      case "Alumni":
        return "info";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Loading..." />
        <div className="p-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="flex flex-col">
      <Header title={group.name}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowDelete(true)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </Header>

      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Group Info Card */}
          <Card
            className={`lg:col-span-1 ${
              isEditingInfo ? "ring-2 ring-primary/20" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Group Information</CardTitle>
              {!isEditingInfo ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingInfo(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={handleSaveInfo}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">{group.name}</h2>
                <div className="mt-2 flex gap-2">
                  <Badge
                    variant={
                      group.gender === "Girls" ? "default" : "secondary"
                    }
                  >
                    {group.gender}
                  </Badge>
                  <Badge variant={getStatusVariant(group.status || "Active")}>
                    {group.status || "Active"}
                  </Badge>
                </div>
              </div>

              {!isEditingInfo ? (
                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <Link
                        href={`/schools/${group.school_id}`}
                        className="text-primary hover:underline"
                      >
                        {group.school_name}
                      </Link>
                    </div>
                  </div>
                  {group.year && (
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-muted-foreground font-medium">
                        Year:
                      </span>
                      <span className="text-sm">{group.year}</span>
                    </div>
                  )}
                  {group.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {group.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs">
                      Group Name
                    </Label>
                    <Input
                      id="name"
                      value={groupData.name}
                      onChange={(e) =>
                        setGroupData({ ...groupData, name: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-xs">
                      Gender
                    </Label>
                    <Select
                      value={groupData.gender}
                      onValueChange={(value) =>
                        setGroupData({ ...groupData, gender: value })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Girls">Girls</SelectItem>
                        <SelectItem value="Boys">Boys</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-xs">
                      Year
                    </Label>
                    <Input
                      id="year"
                      type="number"
                      min="2000"
                      max="2099"
                      value={groupData.year}
                      onChange={(e) =>
                        setGroupData({ ...groupData, year: e.target.value })
                      }
                      className="h-8 text-sm"
                      placeholder="e.g., 2026"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-xs">
                      Status
                    </Label>
                    <Select
                      value={groupData.status}
                      onValueChange={(value) =>
                        setGroupData({ ...groupData, status: value })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
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
                    <Label htmlFor="notes" className="text-xs">
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      value={groupData.notes}
                      onChange={(e) =>
                        setGroupData({ ...groupData, notes: e.target.value })
                      }
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Leader Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Primary Leader
                </CardTitle>
                {!showPrimaryLeaderAdd && !group.primary_leader_id && (
                  <Button
                    size="sm"
                    onClick={() => setShowPrimaryLeaderAdd(true)}
                  >
                    Set Leader
                  </Button>
                )}
                {group.primary_leader_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPrimaryLeaderAdd(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showPrimaryLeaderAdd && (
                  <div className="mb-4 p-3 border rounded-lg bg-muted/50">
                    <Label className="text-xs mb-2 block">
                      Search and select primary leader
                    </Label>
                    <div className="flex gap-2">
                      <MultiSelectSearch
                        options={allPeople}
                        selected={[]}
                        onChange={(selected) => {
                          if (selected.length > 0) {
                            handleSetPrimaryLeader(selected[0]);
                          }
                        }}
                        placeholder="Search people..."
                        renderOption={(p) =>
                          `${p.first_name} ${p.last_name}`
                        }
                        singleSelect
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPrimaryLeaderAdd(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {group.primary_leader_id ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <Link
                        href={`/people/${group.primary_leader_id}`}
                        className="font-medium hover:underline"
                      >
                        {group.primary_leader_first_name}{" "}
                        {group.primary_leader_last_name}
                      </Link>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRemovePrimaryLeader}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  !showPrimaryLeaderAdd && (
                    <p className="text-muted-foreground text-center py-4">
                      No primary leader assigned
                    </p>
                  )
                )}
              </CardContent>
            </Card>

            {/* Support Leaders Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Support Leaders
                </CardTitle>
                {!showLeaderAdd && (
                  <Button size="sm" onClick={() => setShowLeaderAdd(true)}>
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showLeaderAdd && (
                  <div className="mb-4 p-3 border rounded-lg bg-muted/50">
                    <Label className="text-xs mb-2 block">
                      Search and select leader
                    </Label>
                    <div className="flex gap-2">
                      <MultiSelectSearch
                        options={allPeople.filter(
                          (p) =>
                            !group.leaders?.some((l) => l.id === p.id) &&
                            p.id !== group.primary_leader_id
                        )}
                        selected={[]}
                        onChange={(selected) => {
                          if (selected.length > 0) {
                            handleAddLeader(selected[0]);
                          }
                        }}
                        placeholder="Search people..."
                        renderOption={(p) =>
                          `${p.first_name} ${p.last_name}`
                        }
                        singleSelect
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowLeaderAdd(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {group.leaders?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No support leaders assigned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.leaders?.map((leader) => (
                      <div
                        key={leader.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <Link
                            href={`/people/${leader.id}`}
                            className="font-medium hover:underline"
                          >
                            {leader.first_name} {leader.last_name}
                          </Link>
                          {leader.email && (
                            <p className="text-sm text-muted-foreground">
                              {leader.email}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveLeader(leader.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Students Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Students
                </CardTitle>
                {!showStudentAdd && (
                  <Button size="sm" onClick={() => setShowStudentAdd(true)}>
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showStudentAdd && (
                  <div className="mb-4 p-3 border rounded-lg bg-muted/50">
                    <Label className="text-xs mb-2 block">
                      Search and select student
                    </Label>
                    <div className="flex gap-2">
                      <MultiSelectSearch
                        options={allPeople.filter(
                          (p) => !group.students?.some((s) => s.id === p.id)
                        )}
                        selected={[]}
                        onChange={(selected) => {
                          if (selected.length > 0) {
                            handleAddStudent(selected[0]);
                          }
                        }}
                        placeholder="Search people..."
                        renderOption={(p) =>
                          `${p.first_name} ${p.last_name}`
                        }
                        singleSelect
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowStudentAdd(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {!group.students || group.students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No students assigned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <Link
                            href={`/people/${student.id}`}
                            className="font-medium hover:underline"
                          >
                            {student.first_name} {student.last_name}
                          </Link>
                          {student.email && (
                            <p className="text-sm text-muted-foreground">
                              {student.email}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parents Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Parents
                </CardTitle>
                {!showParentAdd && (
                  <Button size="sm" onClick={() => setShowParentAdd(true)}>
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showParentAdd && (
                  <div className="mb-4 p-3 border rounded-lg bg-muted/50">
                    <Label className="text-xs mb-2 block">
                      Search and select parent
                    </Label>
                    <div className="flex gap-2">
                      <MultiSelectSearch
                        options={allPeople.filter(
                          (p) => !group.parents?.some((par) => par.id === p.id)
                        )}
                        selected={[]}
                        onChange={(selected) => {
                          if (selected.length > 0) {
                            handleAddParent(selected[0]);
                          }
                        }}
                        placeholder="Search people..."
                        renderOption={(p) =>
                          `${p.first_name} ${p.last_name}`
                        }
                        singleSelect
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowParentAdd(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {!group.parents || group.parents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No parents assigned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.parents.map((parent) => (
                      <div
                        key={parent.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <Link
                            href={`/people/${parent.id}`}
                            className="font-medium hover:underline"
                          >
                            {parent.first_name} {parent.last_name}
                          </Link>
                          {parent.email && (
                            <p className="text-sm text-muted-foreground">
                              {parent.email}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveParent(parent.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meeting Locations Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Meeting Locations
                </CardTitle>
                {!showLocationAdd && (
                  <Button
                    size="sm"
                    onClick={() => setShowLocationAdd(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showLocationAdd && (
                  <div className="mb-4 p-3 border rounded-lg bg-muted/50">
                    <form onSubmit={handleAddLocation}>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Location Name</Label>
                          <Input
                            value={newLocation.name}
                            onChange={(e) =>
                              setNewLocation({
                                ...newLocation,
                                name: e.target.value,
                              })
                            }
                            className="h-8 text-sm"
                            placeholder="e.g., Main Building"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Address</Label>
                          <Input
                            value={newLocation.address}
                            onChange={(e) =>
                              setNewLocation({
                                ...newLocation,
                                address: e.target.value,
                              })
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">City</Label>
                            <Input
                              value={newLocation.city}
                              onChange={(e) =>
                                setNewLocation({
                                  ...newLocation,
                                  city: e.target.value,
                                })
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">State</Label>
                            <Input
                              value={newLocation.state}
                              onChange={(e) =>
                                setNewLocation({
                                  ...newLocation,
                                  state: e.target.value,
                                })
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">ZIP</Label>
                            <Input
                              value={newLocation.zip}
                              onChange={(e) =>
                                setNewLocation({
                                  ...newLocation,
                                  zip: e.target.value,
                                })
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="is_primary"
                            checked={newLocation.is_primary}
                            onChange={(e) =>
                              setNewLocation({
                                ...newLocation,
                                is_primary: e.target.checked,
                              })
                            }
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="is_primary" className="text-xs">
                            Primary location
                          </Label>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm">
                            Add Location
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowLocationAdd(false);
                              setNewLocation({
                                name: "",
                                address: "",
                                city: "",
                                state: "",
                                zip: "",
                                is_primary: false,
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
                {(!group.meeting_locations ||
                  group.meeting_locations.length === 0) ? (
                  <p className="text-muted-foreground text-center py-4">
                    No meeting locations added
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.meeting_locations.map((location) => (
                      <div
                        key={location.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {location.name || "Unnamed Location"}
                            </span>
                            {location.is_primary && (
                              <Badge variant="success" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          {(location.address || location.city) && (
                            <p className="text-sm text-muted-foreground">
                              {location.address}
                              {location.address &&
                                (location.city || location.state) &&
                                ", "}
                              {location.city}
                              {location.city && location.state && ", "}
                              {location.state} {location.zip}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveLocation(location.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Group"
        description="Are you sure you want to delete this group? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
