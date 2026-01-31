"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  Bookmark,
  ChevronDown,
  Trash2,
  Users,
  User,
  Check,
} from "lucide-react";
import { SaveViewDialog } from "./save-view-dialog";

export function SavedViewsDropdown({
  entityType,
  currentFilters,
  onApplyView,
}) {
  const { toast } = useToast();
  const [views, setViews] = useState([]);
  const [selectedView, setSelectedView] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    fetchViews();
  }, [entityType]);

  const fetchViews = async () => {
    try {
      const res = await fetch(`/api/saved-views?entityType=${entityType}`);
      if (res.ok) {
        const data = await res.json();
        setViews(data);
      }
    } catch (error) {
      console.error("Error fetching views:", error);
    }
  };

  const handleApplyView = (view) => {
    setSelectedView(view);
    const filterState =
      typeof view.filter_state === "string"
        ? JSON.parse(view.filter_state)
        : view.filter_state;
    onApplyView(filterState);
  };

  const handleClearView = () => {
    setSelectedView(null);
    onApplyView({});
  };

  const handleDeleteView = async (e, viewId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/saved-views/${viewId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete view");
      toast({ title: "View deleted" });
      if (selectedView?.id === viewId) {
        setSelectedView(null);
      }
      fetchViews();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveSuccess = () => {
    fetchViews();
    setShowSaveDialog(false);
  };

  // Check if current filters differ from selected view
  const hasUnsavedChanges =
    selectedView &&
    JSON.stringify(currentFilters) !==
      JSON.stringify(
        typeof selectedView.filter_state === "string"
          ? JSON.parse(selectedView.filter_state)
          : selectedView.filter_state
      );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Bookmark className="h-4 w-4" />
            {selectedView ? selectedView.name : "Saved Views"}
            {hasUnsavedChanges && <span className="text-amber-500">*</span>}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {views.length > 0 ? (
            <>
              {views.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => handleApplyView(view)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {view.is_shared ? (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{view.name}</span>
                    {selectedView?.id === view.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleDeleteView(e, view.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
            <Bookmark className="mr-2 h-4 w-4" />
            Save Current View
          </DropdownMenuItem>
          {selectedView && (
            <DropdownMenuItem onClick={handleClearView}>
              Clear Selection
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveViewDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        entityType={entityType}
        filterState={currentFilters}
        onSuccess={handleSaveSuccess}
      />
    </>
  );
}
