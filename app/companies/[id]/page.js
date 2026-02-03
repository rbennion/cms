"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { NotesList } from "@/components/notes/notes-list";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Pencil,
  Trash2,
  MapPin,
  Globe,
  Users,
  DollarSign,
  ExternalLink,
  Save,
  X,
  ArrowLeft,
} from "lucide-react";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [allPeople, setAllPeople] = useState([]);
  const [showPersonAdd, setShowPersonAdd] = useState(false);

  useEffect(() => {
    fetchCompany();
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

  const fetchCompany = async () => {
    try {
      const res = await fetch(`/api/companies/${params.id}`);
      if (!res.ok) throw new Error("Company not found");
      const data = await res.json();
      setCompany(data);
      setCompanyData({
        name: data.name || "",
        website: data.website || "",
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
      router.push("/companies");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/companies/${params.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Company deleted successfully" });
      router.push("/companies");
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
      const res = await fetch(`/api/companies/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyData),
      });
      if (!res.ok) throw new Error("Failed to update company");
      toast({ title: "Company updated successfully" });
      setIsEditingInfo(false);
      fetchCompany();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setCompanyData({
      name: company.name || "",
      website: company.website || "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      zip: company.zip || "",
    });
    setIsEditingInfo(false);
  };

  const handleAddPerson = async (person) => {
    try {
      const res = await fetch(`/api/companies/${params.id}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: person.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to add person");
      toast({ title: "Person added successfully" });
      setShowPersonAdd(false);
      fetchCompany();
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
      const res = await fetch(`/api/companies/${params.id}/people`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: personId,
        }),
      });
      if (!res.ok) throw new Error("Failed to remove person");
      toast({ title: "Person removed successfully" });
      fetchCompany();
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

  if (!company) return null;

  return (
    <div className="flex flex-col">
      <Header title={company.name}>
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
            <Link href="/companies">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Companies
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Company Info Card */}
          <Card
            className={`lg:col-span-1 ${
              isEditingInfo ? "ring-2 ring-primary/20" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Company Information</CardTitle>
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
                    {company.name[0].toUpperCase()}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold">{company.name}</h2>

                {company.is_donor && (
                  <Badge variant="success" className="mt-2">
                    Donor Organization
                  </Badge>
                )}
              </div>

              {!isEditingInfo ? (
                <div className="mt-6 space-y-4">
                  {company.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline flex items-center gap-1"
                      >
                        {company.website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {(company.address || company.city) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        {company.address && <div>{company.address}</div>}
                        {(company.city || company.state || company.zip) && (
                          <div>
                            {company.city}
                            {company.city && company.state ? ", " : ""}
                            {company.state} {company.zip}
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
                      Company Name
                    </Label>
                    <Input
                      id="name"
                      value={companyData.name}
                      onChange={(e) =>
                        setCompanyData({ ...companyData, name: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-xs">
                      Website
                    </Label>
                    <Input
                      id="website"
                      value={companyData.website}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          website: e.target.value,
                        })
                      }
                      className="h-8 text-sm"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs">
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={companyData.address}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
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
                        value={companyData.city}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
                            city: e.target.value,
                          })
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
                        value={companyData.state}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
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
                        value={companyData.zip}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
                            zip: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details Section */}
          <div className="lg:col-span-2 space-y-6">
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
                          (p) => !company.people?.some((cp) => cp.id === p.id)
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
                {company.people?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No people associated
                  </p>
                ) : (
                  <div className="space-y-2">
                    {company.people?.map((person) => (
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
                          {person.is_primary ? (
                            <Badge variant="outline" className="ml-2">
                              Primary Contact
                            </Badge>
                          ) : null}
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

            {/* Donations Card */}
            {company.is_donor && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Donations
                  </CardTitle>
                  <Button size="sm" asChild>
                    <Link href={`/donations/new?company_id=${company.id}`}>
                      Add Donation
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {company.donations?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No donations yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {company.donations?.map((donation) => (
                        <div
                          key={donation.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(donation.date)}
                            </p>
                            {donation.note && (
                              <p className="text-sm">{donation.note}</p>
                            )}
                          </div>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(donation.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes Section */}
            <div>
              <NotesList
                notes={company.notes || []}
                entityType="company"
                entityId={company.id}
                onRefresh={fetchCompany}
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Company"
        description="Are you sure you want to delete this company? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
