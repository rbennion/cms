"use client";

import { Header } from "@/components/layout/header";
import { SchoolForm } from "@/components/schools/school-form";

export default function NewSchoolPage() {
  return (
    <div className="flex flex-col">
      <Header title="New School" description="Add a new school" />
      <div className="p-6">
        <SchoolForm />
      </div>
    </div>
  );
}
