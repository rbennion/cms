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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { NotesList } from "@/components/notes/notes-list";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Plus,
  Users,
  TrendingUp,
  ArrowLeft,
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
  const [allRoles, setAllRoles] = useState([]);
  const [allStages, setAllStages] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [showCompanyAdd, setShowCompanyAdd] = useState(false);
  const [showSchoolAdd, setShowSchoolAdd] = useState(false);
  const [showRoleEdit, setShowRoleEdit] = useState(false);
  const [showStageEdit, setShowStageEdit] = useState(false);
  const [showFamilyAdd, setShowFamilyAdd] = useState(false);
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    website: "",
    is_donor: false,
  });
  const [savingNewCompany, setSavingNewCompany] = useState(false);
  const [isEditingCertification, setIsEditingCertification] = useState(false);
  const [certificationData, setCertificationData] = useState({
    background_check_status: "pending",
    application_received: false,
    training_complete: false,
  });
  const [showAddCertification, setShowAddCertification] = useState(false);

  useEffect(() => {
    fetchPerson();
    fetchOptions();
  }, [params.id]);

  const fetchOptions = async () => {
    try {
      const [companiesRes, schoolsRes, rolesRes, stagesRes, peopleRes] = await Promise.all([
        fetch("/api/companies?limit=1000"),
        fetch("/api/schools"),
        fetch("/api/roles"),
        fetch("/api/engagement-stages"),
        fetch("/api/people?limit=1000"),
      ]);
      const companiesData = await companiesRes.json();
      const schoolsData = await schoolsRes.json();
      const rolesData = await rolesRes.json();
      const stagesData = await stagesRes.json();
      const peopleData = await peopleRes.json();
      setAllCompanies(companiesData.data || companiesData || []);
      setAllSchools(Array.isArray(schoolsData) ? schoolsData : []);
      setAllRoles(Array.isArray(rolesData) ? rolesData : []);
      setAllStages(Array.isArray(stagesData) ? stagesData : []);
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

  const handleToggleRole = async (roleId) => {
    try {
      const currentRoleIds = person.roles?.map((r) => r.id) || [];
      const isSelected = currentRoleIds.includes(roleId);
      const newRoleIds = isSelected
        ? currentRoleIds.filter((id) => id !== roleId)
        : [...currentRoleIds, roleId];

      const res = await fetch(`/api/people/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_ids: newRoleIds }),
      });
      if (!res.ok) throw new Error("Failed to update roles");
      toast({ title: "Roles updated successfully" });
      fetchPerson();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStageChange = async (stageId) => {
    try {
      const res = await fetch(`/api/people/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_id: stageId === "_none" ? null : parseInt(stageId),
        }),
      });
      if (!res.ok) throw new Error("Failed to update stage");
      toast({ title: "Stage updated successfully" });
      setShowStageEdit(false);
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

  const handleSaveCertification = async () => {
    try {
      if (person.certification) {
        // Update existing certification
        const res = await fetch(
          `/api/certifications/${person.certification.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(certificationData),
          }
        );
        if (!res.ok) throw new Error("Failed to update certification");
      } else {
        // Create new certification
        const res = await fetch("/api/certifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            person_id: person.id,
            ...certificationData,
          }),
        });
        if (!res.ok) throw new Error("Failed to create certification");
      }
      toast({ title: "Certification updated successfully" });
      setIsEditingCertification(false);
      fetchPerson();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStartEditCertification = () => {
    if (person.certification) {
      setCertificationData({
        background_check_status:
          person.certification.background_check_status || "pending",
        application_received: !!person.certification.application_received,
        training_complete: !!person.certification.training_complete,
      });
    } else {
      setCertificationData({
        background_check_status: "pending",
        application_received: false,
        training_complete: false,
      });
    }
    setIsEditingCertification(true);
  };

  const handleCreateNewCompany = async () => {
    if (!newCompanyData.name.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }

    setSavingNewCompany(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompanyData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create company");
      }
      const newCompany = await res.json();

      // Add the new company to this person
      const currentCompanyIds = person.companies?.map((c) => c.id) || [];
      const addRes = await fetch(`/api/people/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_ids: [...currentCompanyIds, newCompany.id],
        }),
      });
      if (!addRes.ok) throw new Error("Failed to add company to person");

      toast({ title: "Company created and added successfully" });
      setShowNewCompanyDialog(false);
      setNewCompanyData({
        name: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        website: "",
        is_donor: false,
      });
      fetchOptions();
      fetchPerson();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingNewCompany(false);
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
            <Link href="/people">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to People
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card
            className={`lg:col-span-1 ${
              isEditingProfile ? "ring-2 ring-primary/20" : ""
            }`}
          >
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
                </div>

                {person.stage && (
                  <div className="mt-3">
                    {(() => {
                      const stage = person.stage.name.toLowerCase();
                      let variant = "secondary";
                      if (stage === "lead") variant = "warning";
                      else if (stage === "prospect") variant = "info";
                      else if (stage === "active") variant = "success";
                      return (
                        <Badge variant={variant}>{person.stage.name}</Badge>
                      );
                    })()}
                  </div>
                )}

                {person.roles?.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {person.roles.map((role) => {
                      const getRoleVariant = (name) => {
                        const n = name.toLowerCase();
                        if (n.includes("board")) return "purple";
                        if (n.includes("volunteer")) return "teal";
                        if (n.includes("parent")) return "pink";
                        if (n.includes("fc leader")) return "indigo";
                        if (n.includes("potential")) return "warning";
                        if (n.includes("vendor")) return "orange";
                        if (n.includes("partner")) return "cyan";
                        if (n.includes("staff")) return "info";
                        if (n.includes("teacher")) return "rose";
                        return "secondary";
                      };
                      return (
                        <Badge
                          key={role.id}
                          variant={getRoleVariant(role.name)}
                        >
                          {role.name}
                        </Badge>
                      );
                    })}
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
            {/* Roles Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Roles
                </CardTitle>
                {!showRoleEdit ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRoleEdit(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRoleEdit(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  What is this person&apos;s relationship with your
                  organization?
                </p>
                {showRoleEdit ? (
                  <div className="flex flex-wrap gap-3">
                    {allRoles.map((role) => {
                      const isSelected = person.roles?.some(
                        (r) => r.id === role.id
                      );
                      return (
                        <div
                          key={role.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`role-edit-${role.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleToggleRole(role.id)}
                          />
                          <Label htmlFor={`role-edit-${role.id}`}>
                            {role.name}
                          </Label>
                        </div>
                      );
                    })}
                    {allRoles.length === 0 && (
                      <p className="text-muted-foreground text-sm">
                        No roles available. Create roles in Settings.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {person.roles?.length > 0 ? (
                      person.roles.map((role) => (
                        <Badge key={role.id} variant="outline">
                          {role.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No roles assigned
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Engagement Stage Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Engagement Stage
                </CardTitle>
                {!showStageEdit ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowStageEdit(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowStageEdit(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Where is this person in your engagement pipeline?
                </p>
                {showStageEdit ? (
                  <Select
                    value={person.stage_id?.toString() || "_none"}
                    onValueChange={handleStageChange}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No stage selected</SelectItem>
                      {allStages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id.toString()}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>
                    {person.stage ? (
                      <Badge variant="secondary">{person.stage.name}</Badge>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No stage selected
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

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
                      Search and select company or create new
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <MultiSelectSearch
                          options={allCompanies.filter(
                            (c) =>
                              !person.companies?.some((pc) => pc.id === c.id)
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
                      </div>
                      <div className="flex gap-2 sm:flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowNewCompanyDialog(true)}
                          title="Create new company"
                          className="flex-1 sm:flex-none"
                        >
                          <Plus className="h-4 w-4 mr-1 sm:mr-0" />
                          <span className="sm:hidden">New</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowCompanyAdd(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
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
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSchoolAdd(false)}
                        className="self-end sm:self-auto"
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
                    No certification record. Click &quot;Add Certification&quot; to create one.
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

      {/* New Company Dialog */}
      <Dialog
        open={showNewCompanyDialog}
        onOpenChange={setShowNewCompanyDialog}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-company-name">Company Name *</Label>
              <Input
                id="new-company-name"
                value={newCompanyData.name}
                onChange={(e) =>
                  setNewCompanyData({ ...newCompanyData, name: e.target.value })
                }
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-company-website">Website</Label>
              <Input
                id="new-company-website"
                type="url"
                value={newCompanyData.website}
                onChange={(e) =>
                  setNewCompanyData({
                    ...newCompanyData,
                    website: e.target.value,
                  })
                }
                placeholder="https://"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-company-address">Address</Label>
              <Input
                id="new-company-address"
                value={newCompanyData.address}
                onChange={(e) =>
                  setNewCompanyData({
                    ...newCompanyData,
                    address: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="new-company-city">City</Label>
                <Input
                  id="new-company-city"
                  value={newCompanyData.city}
                  onChange={(e) =>
                    setNewCompanyData({
                      ...newCompanyData,
                      city: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-company-state">State</Label>
                <Input
                  id="new-company-state"
                  value={newCompanyData.state}
                  onChange={(e) =>
                    setNewCompanyData({
                      ...newCompanyData,
                      state: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-company-zip">ZIP</Label>
                <Input
                  id="new-company-zip"
                  value={newCompanyData.zip}
                  onChange={(e) =>
                    setNewCompanyData({
                      ...newCompanyData,
                      zip: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-company-donor"
                checked={newCompanyData.is_donor}
                onCheckedChange={(checked) =>
                  setNewCompanyData({ ...newCompanyData, is_donor: checked })
                }
              />
              <Label htmlFor="new-company-donor">Donor Organization</Label>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewCompanyDialog(false)}
              disabled={savingNewCompany}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewCompany}
              disabled={savingNewCompany}
              className="w-full sm:w-auto"
            >
              {savingNewCompany ? "Creating..." : "Create Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
