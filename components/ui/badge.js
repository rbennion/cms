"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        warning:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        info: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
        purple:
          "border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        pink: "border-transparent bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
        indigo:
          "border-transparent bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
        teal: "border-transparent bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
        orange:
          "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        rose: "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
        cyan: "border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
