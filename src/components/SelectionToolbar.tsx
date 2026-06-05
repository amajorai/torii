import { Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import * as sounds from "@/lib/sounds";

interface SelectionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete?: () => void;
  /** App-specific extra actions (e.g. move-to-folder), rendered after Delete. */
  children?: ReactNode;
}

/**
 * Generic floating action bar shown while items are selected. Domain-agnostic:
 * it knows about a count, clearing, and deleting. Anything app-specific is
 * passed in via `children`.
 */
export function SelectionToolbar({
  selectedCount,
  onClearSelection,
  onDelete,
  children,
}: SelectionToolbarProps) {
  return (
    <div className="-translate-x-1/2 absolute bottom-4 left-1/2 z-50 flex items-center gap-3 rounded-xl border-2 border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => {
            sounds.click();
            onClearSelection();
          }}
          size="icon-sm"
          title="Clear selection"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
        <span className="font-medium text-sm tabular-nums">
          {selectedCount} selected
        </span>
      </div>

      {onDelete && (
        <>
          <div className="h-4 w-px bg-border" />
          <Button
            className="text-destructive hover:text-destructive"
            onClick={() => {
              sounds.delete_();
              onDelete();
            }}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="mr-1.5 size-4" />
            Remove
          </Button>
        </>
      )}

      {children && (
        <>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1">{children}</div>
        </>
      )}
    </div>
  );
}
