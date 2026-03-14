"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { NotesList } from "@/components/notes/notes-list";
import { GroupForm } from "@/components/groups/group-form";
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
} from "lucide-react";

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [schoolData, setSchoolData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [allPeople, setAllPeople] = useState([]);
  const [showPersonAdd, setShowPersonAdd] = useState(false);
  const [groups, setGroups] = useState([]);
  const [genderFilter, setGenderFilter] = useState("all");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteGroup, setDeleteGroup] = useState(null);

  useEffect(() => {
    fetchSchool();
    fetchPeople();
    fetchGroups();
  }, [params.id]);

  const fetchPeople = async () => {
    try {
      const res = await fetch("/api/people?limit=1000");
      const data = await res.json();
      setAllPeople(data.data || data || []);
    } catch (error) {
      console.error("Error fetching people:", error);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch(`/api/schools/${params.id}/groups`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroup) return;
    try {
      const res = await fetch(`/api/groups/${deleteGroup.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteGroup(null);
        fetchGroups();
        toast({ title: "Group deleted successfully" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGroupSaved = () => {
    setShowGroupForm(false);
    setEditingGroup(null);
    fetchGroups();
    toast({ title: "Group saved successfully" });
  };

  const fetchSchool = async () => {
    try {
      const res = await fetch(`/api/schools/${params.id}`);
      if (!res.ok) throw new Error("School not found");
      const data = await res.json();
      setSchool(data);
      setSchoolData({
        name: data.name || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      router.push("/schools");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/schools/${params.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "School deleted successfully" });
      router.push("/schools");
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
      const res = await fetch(`/api/schools/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolData),
      });
      if (!res.ok) throw new Error("Failed to update school");
      toast({ title: "School updated successfully" });
      setIsEditingInfo(false);
      fetchSchool();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setSchoolData({
      name: school.name || "",
      address: school.address || "",
      city: school.city || "",
      state: school.state || "",
      zip: school.zip || "",
    });
    setIsEditingInfo(false);
  };

  const handleAddPerson = async (person) => {
    try {
      const res = await fetch(`/api/schools/${params.id}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: person.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to add person");
      toast({ title: "Person added successfully" });
      setShowPersonAdd(false);
      fetchSchool();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemovePerson = async (personId) => {
    try {
      const res = await fetch(`/api/schools/${params.id}/people`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: personId,
        }),
      });
      if (!res.ok) throw new Error("Failed to remove person");
      toast({ title: "Person removed successfully" });
      fetchSchool();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  if (!school) return null;

  return (
    <div className="flex flex-col">
      <Header title={school.name}>
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
            <Link href="/schools">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Schools
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card
            className={`lg:col-span-1 ${
              isEditingInfo ? "ring-2 ring-primary/20" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">School Information</CardTitle>
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
                  <span className="text-2xl font-bold text-primary">
                    {school.name[0].toUpperCase()}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold">{school.name}</h2>
              </div>

              {!isEditingInfo ? (
                <div className="mt-6 space-y-4">
                  {(school.address || school.city) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        {school.address && <div>{school.address}</div>}
                        {(school.city || school.state || school.zip) && (
                          <div>
                            {school.city}
                            {school.city && school.state ? ", " : ""}
                            {school.state} {school.zip}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs">
                      School Name
                    </Label>
                    <Input
                      id="name"
                      value={schoolData.name}
                      onChange={(e) =>
                        setSchoolData({ ...schoolData, name: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs">
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={schoolData.address}
                      onChange={(e) =>
                        setSchoolData({
                          ...schoolData,
                          address: e.target.value,
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-xs">
                        City
                      </Label>
                      <Input
                        id="city"
                        value={schoolData.city}
                        onChange={(e) =>
                          setSchoolData({ ...schoolData, city: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-xs">
                        State
                      </Label>
                      <Input
                        id="state"
                        value={schoolData.state}
                        onChange={(e) =>
                          setSchoolData({
                            ...schoolData,
                            state: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip" className="text-xs">
                        ZIP
                      </Label>
                      <Input
                        id="zip"
                        value={schoolData.zip}
                        onChange={(e) =>
                          setSchoolData({ ...schoolData, zip: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            {/* People Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  People
                </CardTitle>
                {!showPersonAdd && (
                  <Button size="sm" onClick={() => setShowPersonAdd(true)}>
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showPersonAdd && (
                  <div className="mb-4 p-3 border rounded-lg bg-muted/50">
                    <Label className="text-xs mb-2 block">
                      Search and select person
                    </Label>
                    <div className="flex gap-2">
                      <MultiSelectSearch
                        options={allPeople.filter(
                          (p) => !school.people?.some((sp) => sp.id === p.id)
                        )}
                        selected={[]}
                        onChange={(selected) => {
                          if (selected.length > 0) {
                            handleAddPerson(selected[0]);
                          }
                        }}
                        placeholder="Search people..."
                        renderOption={(p) => `${p.first_name} ${p.last_name}`}
                        singleSelect
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPersonAdd(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {school.people?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No people associated
                  </p>
                ) : (
                  <div className="space-y-2">
                    {school.people?.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <Link
                            href={`/people/${person.id}`}
                            className="font-medium hover:underline"
                          >
                            {person.first_name} {person.last_name}
                          </Link>
                          {person.title && (
                            <p className="text-sm text-muted-foreground">
                              {person.title}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemovePerson(person.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Groups Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Groups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{groups.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Girls Groups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{groups.filter(g => g.gender === "Girls").length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Boys Groups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{groups.filter(g => g.gender === "Boys").length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Groups Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Groups
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <Select value={genderFilter} onValueChange={setGenderFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Girls">Girls</SelectItem>
                        <SelectItem value="Boys">Boys</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => setShowGroupForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Group
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredGroups = genderFilter === "all"
                    ? groups
                    : groups.filter(g => g.gender === genderFilter);
                  return filteredGroups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No groups found. Create your first group to get started.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>Year</TableHead>
                          <TableHead>Leaders</TableHead>
                          <TableHead>Meeting Location</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGroups.map((group) => (
                          <TableRow key={group.id}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell>
                              <Badge variant={group.gender === "Girls" ? "default" : "secondary"}>
                                {group.gender}
                              </Badge>
                            </TableCell>
                            <TableCell>{group.year || "-"}</TableCell>
                            <TableCell>
                              {group.leaders && group.leaders.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {group.leaders.map((leader, i) => (
                                    <span key={leader.id}>
                                      <Link
                                        href={`/people/${leader.id}`}
                                        className="text-sm text-primary hover:underline"
                                      >
                                        {leader.first_name} {leader.last_name}
                                      </Link>
                                      {i < group.leaders.length - 1 && (
                                        <span className="text-muted-foreground">, </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{group.meeting_location || "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingGroup(group);
                                    setShowGroupForm(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteGroup(group)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Notes Section */}
            <div>
              <NotesList
                notes={school.notes || []}
                entityType="school"
                entityId={school.id}
                onRefresh={fetchSchool}
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete School"
        description="Are you sure you want to delete this school? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />

      <GroupForm
        open={showGroupForm}
        onOpenChange={(open) => {
          setShowGroupForm(open);
          if (!open) setEditingGroup(null);
        }}
        schoolId={params.id}
        group={editingGroup}
        people={allPeople}
        onSaved={handleGroupSaved}
      />

      <AlertDialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteGroup?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
