"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function EngagementStagesSettingsPage() {
  const { toast } = useToast();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editStage, setEditStage] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const res = await fetch("/api/engagement-stages");
      const data = await res.json();
      setStages(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch engagement stages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editStage
        ? `/api/engagement-stages/${editStage.id}`
        : "/api/engagement-stages";
      const method = editStage ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save engagement stage");
      }

      toast({ title: editStage ? "Stage updated" : "Stage created" });
      resetForm();
      fetchStages();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/engagement-stages/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete engagement stage");
      toast({ title: "Stage deleted" });
      setDeleteId(null);
      fetchStages();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setName("");
    setEditStage(null);
    setShowForm(false);
  };

  const openEdit = (stage) => {
    setEditStage(stage);
    setName(stage.name);
    setShowForm(true);
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Engagement Stages"
        description="Manage pipeline stages for tracking contact engagement"
      >
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Stage
        </Button>
      </Header>

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>All Engagement Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Engagement stages represent where a person is in your pipeline.
              Each person can have one stage at a time.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : stages.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No engagement stages found
                    </TableCell>
                  </TableRow>
                ) : (
                  stages.map((stage) => (
                    <TableRow key={stage.id}>
                      <TableCell className="font-medium">
                        {stage.name}
                      </TableCell>
                      <TableCell>{stage.sort_order}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(stage)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(stage.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={() => resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editStage ? "Edit Engagement Stage" : "Add Engagement Stage"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="py-4">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Lead, Prospect, Active, Inactive"
                className="mt-2"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">{editStage ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Engagement Stage"
        description="Are you sure you want to delete this stage? People assigned to this stage will have their stage cleared."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
