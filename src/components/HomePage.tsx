import { Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useDragSelection } from "@/hooks/use-drag-selection";
import { cn } from "@/lib/utils";
import type { GalleryFile } from "@/App";
import type { ViewMode } from "@/components/GalleryToolbar";

const VIEW_COLS: Record<ViewMode, string> = {
  "grid-sm": "repeat(auto-fill, minmax(80px, 1fr))",
  "grid-md": "repeat(auto-fill, minmax(120px, 1fr))",
  "grid-lg": "repeat(auto-fill, minmax(180px, 1fr))",
  list: "1fr",
};

interface HomePageProps {
  files: GalleryFile[];
  searchQuery: string;
  viewMode: ViewMode;
  onAddFiles: (paths: string[]) => void;
  onRemoveFiles: (ids: Set<string>) => void;
}

export function HomePage({ files, searchQuery, viewMode, onAddFiles, onRemoveFiles }: HomePageProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    const dropped = listen<{ paths: string[] }>("tauri://drag-drop", (e) => {
      setIsDragOver(false);
      onAddFiles(e.payload.paths);
    });
    const entered = listen("tauri://drag-enter", () => setIsDragOver(true));
    const left = listen("tauri://drag-leave", () => setIsDragOver(false));

    return () => {
      dropped.then((fn) => fn());
      entered.then((fn) => fn());
      left.then((fn) => fn());
    };
  }, [onAddFiles]);

  const filteredFiles = searchQuery.trim()
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const toggleSelect = (id: string) => {
    setIsSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeSelected = () => {
    onRemoveFiles(selectedIds);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const { selectionBox, containerRef, scrollerRef, handleMouseDown, justEnteredSelectionMode } =
    useDragSelection({
      dataAttribute: "data-file-id",
      isSelectionMode,
      onEnableSelectionMode: () => setIsSelectionMode(true),
      onSelectionChange: (ids) => setSelectedIds(new Set(ids)),
      onClearSelection: () => setSelectedIds(new Set()),
    });

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Selection action bar */}
      {isSelectionMode && (
        <div className="flex items-center gap-2 border-border border-b px-3 py-1.5">
          <span className="text-muted-foreground text-xs">{selectedIds.size} selected</span>
          {selectedIds.size > 0 && (
            <button
              className="rounded px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              onClick={removeSelected}
              type="button"
            >
              Remove
            </button>
          )}
          <button
            className="ml-auto rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              setIsSelectionMode(false);
              setSelectedIds(new Set());
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Drop zone / gallery */}
      <div
        className={cn(
          "relative flex flex-1 flex-col overflow-hidden transition-colors",
          isDragOver
            ? "bg-primary/5"
            : files.length === 0
              ? "bg-muted/10"
              : "bg-background",
        )}
        onMouseDown={handleMouseDown}
        ref={containerRef}
      >
        {filteredFiles.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Upload className="size-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">
                {files.length > 0 ? "No results" : "Drop files here"}
              </p>
              <p className="text-muted-foreground text-xs">
                {files.length > 0 ? "Try a different search" : "or use Add Files in the toolbar"}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="grid content-start gap-2 overflow-y-auto p-3"
            ref={scrollerRef}
            style={{ gridTemplateColumns: VIEW_COLS[viewMode] }}
          >
            {filteredFiles.map((file) => {
              const selected = selectedIds.has(file.id);
              const isList = viewMode === "list";
              return (
                <button
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg border-2 transition-colors",
                    isList ? "px-3 py-2" : "flex-col px-2 py-3",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/30 hover:bg-muted/50",
                  )}
                  data-file-id={file.id}
                  key={file.id}
                  onClick={() => {
                    if (justEnteredSelectionMode.current) {
                      justEnteredSelectionMode.current = false;
                      return;
                    }
                    toggleSelect(file.id);
                  }}
                  type="button"
                >
                  {!isList && (
                    <div
                      className={cn(
                        "absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full border-2 transition-opacity",
                        selected
                          ? "border-primary bg-primary opacity-100"
                          : "border-muted-foreground/40 opacity-0 group-hover:opacity-100",
                      )}
                    >
                      {selected && (
                        <svg
                          className="size-2.5 text-primary-foreground"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          viewBox="0 0 12 12"
                        >
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-lg bg-muted",
                      isList ? "size-8 text-base" : "size-10 text-xl",
                    )}
                  >
                    📄
                  </div>
                  <p
                    className={cn(
                      "truncate text-xs font-medium leading-tight",
                      isList ? "flex-1 text-left" : "w-full text-center",
                    )}
                  >
                    {file.name}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Drag-box selection overlay */}
        {selectionBox && (
          <div
            className="pointer-events-none absolute border border-primary bg-primary/10"
            style={{
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height,
            }}
          />
        )}

        {/* OS file-drop overlay */}
        {isDragOver && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
            <Upload className="size-8 animate-bounce text-primary" strokeWidth={1.5} />
            <p className="font-medium text-primary text-sm">Release to add files</p>
          </div>
        )}
      </div>
    </div>
  );
}
