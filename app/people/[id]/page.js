"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { NotesList } from "@/components/notes/notes-list";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building2,
  GraduationCap,
  DollarSign,
  Award,
  Save,
  X,
  Users,
  Plus,
} from "lucide-react";
import { AddCertificationDialog } from "@/components/certifications/add-certification-dialog";

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    children: "",
  });
  const [allCompanies, setAllCompanies] = useState([]);
  const [allSchools, setAllSchools] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [showCompanyAdd, setShowCompanyAdd] = useState(false);
  const [showSchoolAdd, setShowSchoolAdd] = useState(false);
  const [showFamilyAdd, setShowFamilyAdd] = useState(false);
  const [showAddCertification, setShowAddCertification] = useState(false);

  useEffect(() => {
    fetchPerson();
    fetchOptions();
  }, [params.id]);

  const fetchOptions = async () => {
    try {
      const [companiesRes, schoolsRes, peopleRes] = await Promise.all([
        fetch("/api/companies?limit=1000"),
        fetch("/api/schools"),
        fetch("/api/people?limit=1000"),
      ]);
      const companiesData = await companiesRes.json();
      const schoolsData = await schoolsRes.json();
      const peopleData = await peopleRes.json();
      setAllCompanies(companiesData.data || companiesData || []);
      setAllSchools(Array.isArray(schoolsData) ? schoolsData : []);
      setAllPeople(peopleData.data || peopleData || []);
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const fetchPerson = async () => {
    try {
      const res = await fetch(`/api/people/${params.id}`);
      if (!res.ok) throw new Error("Person not found");
      const data = await res.json();
      setPerson(data);
      setProfileData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        phone: data.phone || "",
        children: data.children || "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      router.push("/people");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/people/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Person deleted successfully" });
      router.push("/people");
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`/api/people/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      toast({ title: "Profile updated successfully" });
      setIsEditingProfile(false);
      fetchPerson();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setProfileData({
      first_name: person.first_name || "",
      last_name: person.last_name || "",
      email: person.email || "",
      phone: person.phone || "",
      children: person.children || "",
    });
    setIsEditingProfile(false);
  };

  const handleAddCompany = async (company) => {
    try {
      const currentCompanyIds = person.companies?.map((c) => c.id) || [];
      const res = await fetch(`/api/people/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_ids: [...currentCompanyIds, company.id],
        }),
      });
      if (!res.ok) throw new Error("Failed to add company");
      toast({ title: "Company added successfully" });
      setShowCompanyAdd(false);
      fetchPerson();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveCompany = async (companyId) => {
    try {
      const currentCompanyIds = person.companies?.map((c) => c.id) || [];
      const res = await fetch(`/api/people/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_ids: currentCompanyIds.filter((id) => id !== companyId),
        }),
      });
      if (!res.ok) throw new Error("Failed to remove company");
      toast({ title: "Company removed successfully" });
      fetchPerson();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddSchool = async (school) => {
    try {
      const currentSchoolIds = person.schools?.map((s) => s.id) || [];
      const res = await fetch(`/api/people/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_ids: [...currentSchoolIds, school.id],
        }),
      });
      if (!res.ok) throw new Error("Failed to add school");
      toast({ title: "School added successfully" });
      setShowSchoolAdd(false);
      fetchPerson();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveSchool = async (schoolId) => {
    try {
      const currentSchoolIds = person.schools?.map((s) => s.id) || [];
      const res = await fetch(`/api/people/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_ids: currentSchoolIds.filter((id) => id !== schoolId),
        }),
      });
      if (!res.ok) throw new Error("Failed to remove school");
      toast({ title: "School removed successfully" });
      fetchPerson();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddFamilyMember = async (familyMember) => {
    try {
      const currentFamilyIds = person.family_members?.map((f) => f.id) || [];
      const res = await fetch(`/api/people/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_member_ids: [...currentFamilyIds, familyMember.id],
        }),
      });
      if (!res.ok) throw new Error("Failed to add family member");
      toast({ title: "Family member added successfully" });
      setShowFamilyAdd(false);
      fetchPerson();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveFamilyMember = async (memberId) => {
    try {
      const currentFamilyIds = person.family_members?.map((f) => f.id) || [];
      const res = await fetch(`/api/people/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_member_ids: currentFamilyIds.filter((id) => id !== memberId),
        }),
      });
      if (!res.ok) throw new Error("Failed to remove family member");
      toast({ title: "Family member removed successfully" });
      fetchPerson();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCertificationCreated = () => {
    setShowAddCertification(false);
    fetchPerson();
    toast({ title: "Certification created successfully" });
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

  if (!person) return null;

  const initials =
    `${person.first_name[0]}${person.last_name[0]}`.toUpperCase();

  return (
    <div className="flex flex-col">
      <Header
        title={`${person.first_name} ${person.last_name}`}
        description={person.title}
      >
        <Button variant="destructive" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </Header>

      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Contact Information</CardTitle>
              {!isEditingProfile ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={handleSaveProfile}>
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
                <Avatar className="h-24 w-24">
                  <AvatarImage src={person.picture_path} />
                  <AvatarFallback className="text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-4 text-xl font-semibold">
                  {person.first_name} {person.middle_name} {person.last_name}
                </h2>
                {person.title && (
                  <p className="text-muted-foreground">{person.title}</p>
                )}

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {person.is_donor ? (
                    <Badge variant="success">Donor</Badge>
                  ) : null}
                  {person.is_fc_certified ? (
                    <Badge variant="info">FC Certified</Badge>
                  ) : null}
                  {person.is_board_member ? <Badge>Board Member</Badge> : null}
                </div>

                {person.types?.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {person.types.map((type) => (
                      <Badge key={type.id} variant="secondary">
                        {type.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {!isEditingProfile ? (
                <div className="mt-6 space-y-4">
                  {person.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${person.email}`}
                        className="text-sm hover:underline"
                      >
                        {person.email}
                      </a>
                    </div>
                  )}
                  {person.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${person.phone}`}
                        className="text-sm hover:underline"
                      >
                        {person.phone}
                      </a>
                    </div>
                  )}
                  {(person.address || person.city) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        {person.address && <div>{person.address}</div>}
                        {(person.city || person.state || person.zip) && (
                          <div>
                            {person.city}
                            {person.city && person.state ? ", " : ""}
                            {person.state} {person.zip}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {person.children && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-2">Children</h4>
                      <p className="text-sm text-muted-foreground">
                        {person.children}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-xs">
                      First Name
                    </Label>
                    <Input
                      id="first_name"
                      value={profileData.first_name}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          first_name: e.target.value,
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-xs">
                      Last Name
                    </Label>
                    <Input
                      id="last_name"
                      value={profileData.last_name}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          last_name: e.target.value,
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          email: e.target.value,
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="children" className="text-xs">
                      Children
                    </Label>
                    <Textarea
                      id="children"
                      value={profileData.children}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          children: e.target.value,
                        })
                      }
                      className="text-sm min-h-[60px]"
                      placeholder="e.g., Emma (8), Jack (12)"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Companies Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Companies
                </CardTitle>
                {!showCompanyAdd && (
                  <Button size="sm" onClick={() => setShowCompanyAdd(true)}>
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showCompanyAdd && (
                  <div className="mb-4 p-3 border rounded-lg bg-muted/50">
                    <Label className="text-xs mb-2 block">
                      Search and select company
                    </Label>
                    <div className="flex gap-2">
                      <MultiSelectSearch
                        options={allCompanies.filter(
                          (c) => !person.companies?.some((pc) => pc.id === c.id)
                        )}
                        selected={[]}
                        onChange={(selected) => {
                          if (selected.length > 0) {
                            handleAddCompany(selected[0]);
                          }
                        }}
                        placeholder="Search companies..."
                        renderOption={(c) => c.name}
                        singleSelect
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowCompanyAdd(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {person.companies?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No companies associated
                  </p>
                ) : (
                  <div className="space-y-2">
                    {person.companies?.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <Link
                            href={`/companies/${company.id}`}
                            className="font-medium hover:underline"
                          >
                            {company.name}
                          </Link>
                          {company.is_primary ? (
                            <Badge variant="outline" className="ml-2">
                              Primary
                            </Badge>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveCompany(company.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schools Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Schools
                </CardTitle>
                {!showSchoolAdd && (
                  <Button size="sm" onClick={() => setShowSchoolAdd(true)}>
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showSchoolAdd && (
                  <div className="mb-4 p-3 border rounded-lg bg-muted/50">
                    <Label className="text-xs mb-2 block">
                      Search and select school
                    </Label>
                    <div className="flex gap-2">
                      <MultiSelectSearch
                        options={allSchools.filter(
                          (s) => !person.schools?.some((ps) => ps.id === s.id)
                        )}
                        selected={[]}
                        onChange={(selected) => {
                          if (selected.length > 0) {
                            handleAddSchool(selected[0]);
                          }
                        }}
                        placeholder="Search schools..."
                        renderOption={(s) => s.name}
                        singleSelect
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSchoolAdd(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {person.schools?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No schools associated
                  </p>
                ) : (
                  <div className="space-y-2">
                    {person.schools?.map((school) => (
                      <div
                        key={school.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <Link
                            href={`/schools/${school.id}`}
                            className="font-medium hover:underline"
                          >
                            {school.name}
                          </Link>
                          {school.city && (
                            <p className="text-sm text-muted-foreground">
                              {school.city}, {school.state}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveSchool(school.id)}
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
            {person.is_donor && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Donations
                  </CardTitle>
                  <Button size="sm" asChild>
                    <Link href={`/donations/new?person_id=${person.id}`}>
                      Add Donation
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {person.donations?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No donations yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {person.donations?.map((donation) => (
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

            {/* Family Members Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Family Members
                </CardTitle>
                {!showFamilyAdd && (
                  <Button size="sm" onClick={() => setShowFamilyAdd(true)}>
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showFamilyAdd && (
                  <div className="mb-4 p-3 border rounded-lg bg-muted/50">
                    <Label className="text-xs mb-2 block">
                      Search and select family member
                    </Label>
                    <div className="flex gap-2">
                      <MultiSelectSearch
                        options={allPeople.filter(
                          (p) =>
                            p.id !== person.id &&
                            !person.family_members?.some((fm) => fm.id === p.id)
                        )}
                        selected={[]}
                        onChange={(selected) => {
                          if (selected.length > 0) {
                            handleAddFamilyMember(selected[0]);
                          }
                        }}
                        placeholder="Search people..."
                        renderOption={(p) => `${p.first_name} ${p.last_name}`}
                        singleSelect
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowFamilyAdd(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {person.family_members?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No family members linked
                  </p>
                ) : (
                  <div className="space-y-2">
                    {person.family_members?.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <Link
                            href={`/people/${member.id}`}
                            className="font-medium hover:underline"
                          >
                            {member.first_name} {member.last_name}
                          </Link>
                          {member.email && (
                            <p className="text-sm text-muted-foreground">
                              {member.email}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFamilyMember(member.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Certification Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certification Status
                </CardTitle>
                {!person.certification && (
                  <Button size="sm" onClick={() => setShowAddCertification(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Certification
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {person.certification ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>Background Check</span>
                      <Badge
                        variant={
                          person.certification.background_check_status ===
                          "approved"
                            ? "success"
                            : person.certification.background_check_status ===
                              "pending"
                            ? "warning"
                            : person.certification.background_check_status ===
                              "denied"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {person.certification.background_check_status ||
                          "Not Started"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>Application Received</span>
                      <Badge
                        variant={
                          person.certification.application_received
                            ? "success"
                            : "secondary"
                        }
                      >
                        {person.certification.application_received
                          ? "Yes"
                          : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>QPR Gatekeeper Training</span>
                      <Badge
                        variant={
                          person.certification.qpr_gatekeeper_training
                            ? "success"
                            : "secondary"
                        }
                      >
                        {person.certification.qpr_gatekeeper_training
                          ? "Complete"
                          : "Not Complete"}
                      </Badge>
                    </div>
                    {person.certification.qpr_training_date && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span>Training Date</span>
                        <span className="text-sm">
                          {formatDate(person.certification.qpr_training_date)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No certification record. Click "Add Certification" to create one.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notes Section */}
            <div>
              <NotesList
                notes={person.notes || []}
                entityType="person"
                entityId={person.id}
                onRefresh={fetchPerson}
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Person"
        description="Are you sure you want to delete this person? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />

      <AddCertificationDialog
        open={showAddCertification}
        onOpenChange={setShowAddCertification}
        personId={person.id}
        personName={`${person.first_name} ${person.last_name}`}
        onSaved={handleCertificationCreated}
      />
    </div>
  );
}
