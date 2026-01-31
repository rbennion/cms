"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

export function SaveViewDialog({
  open,
  onOpenChange,
  entityType,
  filterState,
  onSuccess,
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for this view",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          entity_type: entityType,
          filter_state: filterState,
          is_shared: isShared,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save view");
      }

      toast({ title: "View saved successfully" });
      setName("");
      setIsShared(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setIsShared(false);
    onOpenChange(false);
  };

  // Show which filters are being saved
  const activeFilters = Object.entries(filterState || {})
    .filter(([_, value]) => value)
    .map(([key]) => key.replace(/_/g, " "));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save View</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">View Name</Label>
            <Input
              id="view-name"
              placeholder="e.g., Active Donors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {activeFilters.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Filters included:</p>
              <ul className="list-disc list-inside mt-1">
                {activeFilters.map((filter) => (
                  <li key={filter} className="capitalize">
                    {filter}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="is-shared"
              checked={isShared}
              onCheckedChange={setIsShared}
            />
            <Label htmlFor="is-shared" className="font-normal">
              Share with all users
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save View"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
