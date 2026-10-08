"use client";

import Link from "next/link";
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

// Shown when the server refuses or questions a person as a duplicate (a 409
// from the people or group routes). A taken email can only be resolved by
// using the existing record; a possible duplicate can be created anyway.
// Records open in a new tab so nothing typed into the form is lost.
export function DuplicatePersonDialog({ conflict, onCancel, onCreateAnyway }) {
  const emailTaken = conflict?.code === "email_taken";
  const people = emailTaken ? [conflict.existing] : conflict?.matches || [];

  return (
    <AlertDialog open={Boolean(conflict)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {emailTaken ? "This email is already in use" : "This person may already exist"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {emailTaken
              ? "Each email can belong to only one person."
              : "Someone with the same name or phone number is already in the CRM. Check before creating another record."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id} className="text-sm">
              <Link
                href={`/people/${p.id}`}
                target="_blank"
                className="font-medium hover:underline"
              >
                {p.first_name?.trim()} {p.last_name?.trim()}
              </Link>
              {(p.email || p.phone) && (
                <span className="text-muted-foreground">
                  {" · "}
                  {[p.email, p.phone].filter(Boolean).join(" · ")}
                </span>
              )}
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {emailTaken ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {!emailTaken && (
            <AlertDialogAction onClick={onCreateAnyway}>Create anyway</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
