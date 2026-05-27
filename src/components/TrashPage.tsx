import { RotateCcw, Trash2, Trash } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useTrashStore } from "@/stores/use-trash-store";
import { useNotesStore } from "@/stores/use-notes-store";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export function TrashPage() {
  const { trashItems, isLoaded, loadFromDb, restoreFromTrash, deletePermanently, emptyTrash } =
    useTrashStore();
  const { loadFromDb: reloadNotes } = useNotesStore();

  useEffect(() => {
    if (!isLoaded) loadFromDb();
  }, [isLoaded, loadFromDb]);

  const handleRestore = async (id: string) => {
    const item = await restoreFromTrash(id);
    if (item) {
      await reloadNotes();
      toast.success(`Restored "${item.title || "Untitled"}"`);
    }
  };

  const handleDeletePermanently = async (id: string) => {
    await deletePermanently(id);
    toast.success("Permanently deleted");
  };

  const handleEmptyTrash = async () => {
    await emptyTrash();
    toast.success("Trash emptied");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Trash className="size-4 text-muted-foreground" />
          <h2 className="font-medium text-sm">Trash</h2>
          <span className="text-muted-foreground text-xs">
            ({trashItems.length} {trashItems.length === 1 ? "item" : "items"})
          </span>
        </div>
        {trashItems.length > 0 && (
          <Button
            onClick={handleEmptyTrash}
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Empty Trash
          </Button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {trashItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Trash className="size-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Trash is empty</p>
              <p className="text-muted-foreground text-xs">
                Items deleted from Notes appear here. Auto-deleted after 30 days.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {trashItems.map((item) => (
              <div
                className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-muted/30"
                key={item.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{item.title || "Untitled"}</p>
                  <p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
                    {item.content || "No content"}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Deleted{" "}
                    {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    onClick={() => handleRestore(item.id)}
                    size="icon-sm"
                    title="Restore"
                    variant="ghost"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                  <Button
                    onClick={() => handleDeletePermanently(item.id)}
                    size="icon-sm"
                    title="Delete permanently"
                    variant="ghost"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {trashItems.length > 0 && (
        <p className="border-t border-border px-4 py-2 text-center text-muted-foreground text-xs">
          Items are automatically deleted after 30 days
        </p>
      )}
    </div>
  );
}
