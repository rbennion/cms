"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { SchoolForm } from "@/components/schools/school-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

export default function EditSchoolPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchool();
  }, [params.id]);

  const fetchSchool = async () => {
    try {
      const res = await fetch(`/api/schools/${params.id}`);
      if (!res.ok) throw new Error("School not found");
      const data = await res.json();
      setSchool(data);
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

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Loading..." />
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!school) return null;

  return (
    <div className="flex flex-col">
      <Header
        title={`Edit ${school.name}`}
        description="Update school information"
      />
      <div className="p-6">
        <SchoolForm school={school} isEdit />
      </div>
    </div>
  );
}
