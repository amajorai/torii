import { Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { useDragSelection } from "@/hooks/use-drag-selection";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  path: string;
  name: string;
}

export function HomePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    const dropped = listen<{ paths: string[] }>("tauri://drag-drop", (e) => {
      setIsDragOver(false);
      const incoming = e.payload.paths.map((path) => ({
        id: crypto.randomUUID(),
        path,
        name: path.split(/[\\/]/).pop() ?? path,
      }));
      setFiles((prev) => [...prev, ...incoming]);
    });
    const entered = listen("tauri://drag-enter", () => setIsDragOver(true));
    const left = listen("tauri://drag-leave", () => setIsDragOver(false));

    return () => {
      dropped.then((fn) => fn());
      entered.then((fn) => fn());
      left.then((fn) => fn());
    };
  }, []);

  const pickFiles = async () => {
    const result = await open({ multiple: true });
    if (!result) return;
    const paths = Array.isArray(result) ? result : [result];
    const incoming = paths.map((path) => ({
      id: crypto.randomUUID(),
      path,
      name: path.split(/[\\/]/).pop() ?? path,
    }));
    setFiles((prev) => [...prev, ...incoming]);
  };

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
    setFiles((prev) => prev.filter((f) => !selectedIds.has(f.id)));
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
    <div className="flex h-full w-full flex-col gap-2 p-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button onClick={pickFiles} size="sm" type="button">
          <Upload className="mr-1.5 size-3.5" />
          Select files
        </Button>
        {selectedIds.size > 0 && (
          <>
            <span className="text-muted-foreground text-xs">{selectedIds.size} selected</span>
            <Button onClick={removeSelected} size="sm" type="button" variant="ghost">
              <X className="mr-1 size-3.5" />
              Remove
            </Button>
          </>
        )}
        {isSelectionMode && selectedIds.size === 0 && (
          <Button
            className="ml-auto"
            onClick={() => {
              setIsSelectionMode(false);
              setSelectedIds(new Set());
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "relative flex flex-1 flex-col overflow-hidden rounded-xl border-2 transition-colors",
          isDragOver
            ? "border-primary border-dashed bg-primary/5"
            : files.length === 0
              ? "border-dashed border-border bg-muted/20"
              : "border-border bg-background",
        )}
        onMouseDown={handleMouseDown}
        ref={containerRef}
      >
        {files.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Upload className="size-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Drop files here</p>
              <p className="text-muted-foreground text-xs">or use Select files above</p>
            </div>
          </div>
        ) : (
          <div
            className="grid content-start gap-2 overflow-y-auto p-3"
            ref={scrollerRef}
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}
          >
            {files.map((file) => {
              const selected = selectedIds.has(file.id);
              return (
                <button
                  className={cn(
                    "group relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-colors",
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
                  {/* Selection indicator */}
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
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-xl">
                    📄
                  </div>
                  <p className="w-full truncate text-center text-xs font-medium leading-tight">
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
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm">
            <Upload className="size-8 animate-bounce text-primary" strokeWidth={1.5} />
            <p className="font-medium text-primary text-sm">Release to add files</p>
          </div>
        )}
      </div>
    </div>
  );
}
