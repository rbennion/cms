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
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { NotesList } from "@/components/notes/notes-list";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Pencil, Trash2, MapPin, Users, Save, X } from "lucide-react";

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

  useEffect(() => {
    fetchSchool();
    fetchPeople();
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
        <Button variant="destructive" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </Header>

      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="md:col-span-1">
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
    </div>
  );
}
