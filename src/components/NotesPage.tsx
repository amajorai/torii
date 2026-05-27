import {
  Archive,
  FilePlus,
  Folder,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Note, useNotesStore } from "@/stores/use-notes-store";
import { useTrashStore } from "@/stores/use-trash-store";
import { useArchiveStore } from "@/stores/use-archive-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type View = "active" | "archived";

export function NotesPage() {
  const { notes, isLoaded, loadFromDb, createNote, updateNote, archiveNote, unarchiveNote } =
    useNotesStore();
  const { moveToTrash } = useTrashStore();
  const { loadFromDb: loadArchive } = useArchiveStore();
  const [view, setView] = useState<View>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      loadFromDb();
      loadArchive();
    }
  }, [isLoaded, loadFromDb, loadArchive]);

  const activeNotes = notes.filter((n) => !n.archivedAt);
  const archivedNotes = notes.filter((n) => n.archivedAt);
  const visibleNotes = view === "active" ? activeNotes : archivedNotes;
  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const selectNote = (note: Note) => {
    if (isDirty && selectedId) saveEdits();
    setSelectedId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsDirty(false);
  };

  const saveEdits = async () => {
    if (!selectedId) return;
    await updateNote(selectedId, editTitle, editContent);
    setIsDirty(false);
    toast.success("Saved");
  };

  const handleCreate = async () => {
    const note = await createNote("Untitled", "");
    selectNote(note);
    setView("active");
  };

  const handleDelete = async (note: Note) => {
    if (selectedId === note.id) {
      setSelectedId(null);
      setIsDirty(false);
    }
    await moveToTrash(note);
    toast.success("Moved to trash");
  };

  const handleArchive = async (note: Note) => {
    if (selectedId === note.id) {
      setSelectedId(null);
      setIsDirty(false);
    }
    await archiveNote(note.id);
    toast.success("Archived");
  };

  const handleUnarchive = async (note: Note) => {
    await unarchiveNote(note.id);
    toast.success("Restored from archive");
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="flex w-56 flex-col border-r border-border">
        {/* View toggle */}
        <div className="flex items-center gap-1 border-b border-border p-2">
          <button
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              view === "active"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setView("active")}
            type="button"
          >
            Notes
          </button>
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              view === "archived"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setView("archived")}
            type="button"
          >
            <Folder className="size-3" />
            Archive
          </button>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto p-1">
          {visibleNotes.length === 0 && (
            <p className="py-6 text-center text-muted-foreground text-xs">
              {view === "active" ? "No notes yet" : "Nothing archived"}
            </p>
          )}
          {visibleNotes.map((note) => (
            <button
              className={cn(
                "group flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                selectedId === note.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/60"
              )}
              key={note.id}
              onClick={() => selectNote(note)}
              type="button"
            >
              <span className="w-full truncate text-xs font-medium">
                {note.title || "Untitled"}
              </span>
              <span className="w-full truncate text-muted-foreground text-xs">
                {note.content.slice(0, 40) || "No content"}
              </span>

              {/* Actions on hover */}
              <div className="mt-1 hidden items-center gap-0.5 group-hover:flex">
                {view === "active" ? (
                  <>
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(note);
                      }}
                      title="Archive"
                      type="button"
                    >
                      <Archive className="size-3" />
                    </button>
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note);
                      }}
                      title="Delete"
                      type="button"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </>
                ) : (
                  <button
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnarchive(note);
                    }}
                    title="Restore"
                    type="button"
                  >
                    <MoreHorizontal className="size-3" />
                  </button>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Create button */}
        {view === "active" && (
          <div className="border-t border-border p-2">
            <Button className="w-full" onClick={handleCreate} size="sm" variant="ghost">
              <FilePlus className="mr-1.5 size-3.5" />
              New Note
            </Button>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <input
                className="flex-1 bg-transparent font-medium text-sm outline-none placeholder:text-muted-foreground"
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  setIsDirty(true);
                }}
                onBlur={saveEdits}
                placeholder="Note title"
                value={editTitle}
              />
              {isDirty && (
                <Button onClick={saveEdits} size="sm" variant="ghost">
                  Save
                </Button>
              )}
            </div>
            <textarea
              className="flex-1 resize-none bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              disabled={view === "archived"}
              onChange={(e) => {
                setEditContent(e.target.value);
                setIsDirty(true);
              }}
              onBlur={saveEdits}
              placeholder="Start typing your note..."
              value={editContent}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground text-sm">Select a note to edit</p>
            {view === "active" && (
              <Button onClick={handleCreate} size="sm" variant="ghost">
                <FilePlus className="mr-1.5 size-3.5" />
                New Note
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
