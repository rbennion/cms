"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { Plus, X } from "lucide-react";
import { useState } from "react";

export function AssociationManager({
  title,
  icon: Icon,
  associations = [],
  allOptions = [],
  onAdd,
  onRemove,
  renderItem,
  renderSubtext,
  linkPath,
  emptyMessage = "No items associated",
  addButtonLabel = "Add",
  searchPlaceholder = "Search...",
  showCreateButton = false,
  onCreateNew,
  createButtonLabel = "New",
}) {
  const [showAdd, setShowAdd] = useState(false);

  const availableOptions = allOptions.filter(
    (option) => !associations?.some((a) => a.id === option.id)
  );

  const handleAdd = (selected) => {
    if (selected.length > 0) {
      onAdd(selected[0]);
      setShowAdd(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5" />}
          {title}
        </CardTitle>
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            {addButtonLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showAdd && (
          <div className="mb-4 p-3 border rounded-lg bg-muted/50">
            <Label className="text-xs mb-2 block">{searchPlaceholder}</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <MultiSelectSearch
                  options={availableOptions}
                  selected={[]}
                  onChange={handleAdd}
                  placeholder={searchPlaceholder}
                  renderOption={renderItem}
                  singleSelect
                />
              </div>
              <div className="flex gap-2 sm:flex-shrink-0">
                {showCreateButton && onCreateNew && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCreateNew}
                    title={createButtonLabel}
                    className="flex-1 sm:flex-none"
                  >
                    <Plus className="h-4 w-4 mr-1 sm:mr-0" />
                    <span className="sm:hidden">{createButtonLabel}</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAdd(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        {associations?.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-2">
            {associations?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div>
                  {linkPath ? (
                    <Link
                      href={`${linkPath}/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {renderItem(item)}
                    </Link>
                  ) : (
                    <span className="font-medium">{renderItem(item)}</span>
                  )}
                  {renderSubtext && (
                    <p className="text-sm text-muted-foreground">
                      {renderSubtext(item)}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(item.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
