import { convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FolderPlus, Upload, X } from "lucide-react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { useDragSelection } from "@/hooks/use-drag-selection";
import * as sounds from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { useGalleryStore } from "@/stores/use-gallery-store";
import type { GalleryFile } from "@/stores/use-gallery-store";
import { useSelectionStore } from "@/stores/use-selection-store";
import type { ViewMode } from "@/components/GalleryToolbar";

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif", "tiff"]);
const VIDEO_EXTS = new Set(["mp4", "mov", "avi", "mkv", "webm", "m4v", "flv"]);

function getExt(path: string) {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

function FileEmoji({ path }: { path: string }) {
  const ext = getExt(path);
  if (VIDEO_EXTS.has(ext)) return "🎬";
  if (ext === "pdf") return "📋";
  if (ext === "zip" || ext === "rar" || ext === "7z") return "📦";
  if (ext === "mp3" || ext === "wav" || ext === "flac" || ext === "aac") return "🎵";
  if (ext === "doc" || ext === "docx") return "📝";
  if (ext === "xls" || ext === "xlsx") return "📊";
  return "📄";
}

const GRID_COLS: Record<ViewMode, string> = {
  "grid-sm": "repeat(auto-fill, minmax(100px, 1fr))",
  "grid-md": "repeat(auto-fill, minmax(150px, 1fr))",
  "grid-lg": "repeat(auto-fill, minmax(220px, 1fr))",
  list: "1fr",
};

interface HomePageProps {
  searchQuery: string;
  viewMode: ViewMode;
}

interface FileCardProps {
  file: GalleryFile;
  selected: boolean;
  isList: boolean;
  onClick: () => void;
}

function FileCard({ file, selected, isList, onClick }: FileCardProps) {
  const ext = getExt(file.path);
  const isImage = IMAGE_EXTS.has(ext);
  const [imgError, setImgError] = useState(false);
  const previewSrc = isImage && !imgError ? convertFileSrc(file.path) : null;

  return (
    <button
      className={cn(
        "group relative flex w-full cursor-default select-none items-center gap-2 rounded-xl border-2 text-left transition-colors",
        isList ? "px-3 py-2" : "flex-col px-2 pb-2 pt-3",
        selected
          ? "border-primary bg-primary/8"
          : "border-transparent hover:border-border hover:bg-muted/50"
      )}
      data-file-id={file.id}
      onClick={onClick}
      type="button"
    >
      {/* Selection indicator (grid only) */}
      {!isList && (
        <div
          className={cn(
            "absolute top-1.5 right-1.5 z-10 flex size-4 items-center justify-center rounded-full border-2 transition-opacity",
            selected
              ? "border-primary bg-primary opacity-100"
              : "border-muted-foreground/40 opacity-0 group-hover:opacity-100"
          )}
        >
          {selected && (
            <svg className="size-2.5 text-primary-foreground" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </div>
      )}

      {/* Thumbnail */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted",
          isList ? "size-9" : "aspect-video w-full"
        )}
      >
        {previewSrc ? (
          <img
            alt={file.name}
            className="h-full w-full object-cover"
            decoding="async"
            loading="lazy"
            onError={() => setImgError(true)}
            src={previewSrc}
          />
        ) : (
          <span className={isList ? "text-base" : "text-2xl"}>
            <FileEmoji path={file.path} />
          </span>
        )}
      </div>

      {/* Name */}
      <p
        className={cn(
          "min-w-0 truncate text-xs font-medium leading-tight",
          isList ? "flex-1" : "w-full text-center"
        )}
      >
        {file.name}
      </p>
    </button>
  );
}

export function HomePage({ searchQuery, viewMode }: HomePageProps) {
  const { files, folders, addFiles, removeFiles, addFolder, deleteFolder, moveFilesToFolder } =
    useGalleryStore();

  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const toggleSelection = useSelectionStore((s) => s.toggleSelection);
  const toggleSelectionMode = useSelectionStore((s) => s.toggleSelectionMode);
  const selectAll = useSelectionStore((s) => s.selectAll);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const exitSelectionMode = useSelectionStore((s) => s.exitSelectionMode);

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const {
    selectionBox,
    containerRef,
    scrollerRef,
    handleMouseDown,
    justEnteredSelectionMode,
  } = useDragSelection({
    dataAttribute: "data-file-id",
    isSelectionMode,
    onEnableSelectionMode: toggleSelectionMode,
    onSelectionChange: (ids) => selectAll(ids),
    onClearSelection: () => clearSelection(),
  });

  useEffect(() => {
    const dropped = listen<{ paths: string[] }>("tauri://drag-drop", (e) => {
      setIsDragOver(false);
      addFiles(e.payload.paths);
    });
    const entered = listen("tauri://drag-enter", () => setIsDragOver(true));
    const left = listen("tauri://drag-leave", () => setIsDragOver(false));
    return () => {
      dropped.then((fn) => fn());
      entered.then((fn) => fn());
      left.then((fn) => fn());
    };
  }, [addFiles]);

  useEffect(() => {
    if (showNewFolderInput) newFolderInputRef.current?.focus();
  }, [showNewFolderInput]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of files) {
      if (f.folderId) counts[f.folderId] = (counts[f.folderId] ?? 0) + 1;
    }
    return counts;
  }, [files]);

  const filteredFiles = useMemo(() => {
    let result = files;
    if (selectedFolderId !== null) {
      result = result.filter((f) => f.folderId === selectedFolderId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    return result;
  }, [files, selectedFolderId, searchQuery]);

  const isList = viewMode === "list";

  const handleCardClick = (id: string) => {
    if (justEnteredSelectionMode.current) {
      justEnteredSelectionMode.current = false;
      return;
    }
    if (!isSelectionMode) toggleSelectionMode();
    sounds.select();
    toggleSelection(id);
  };

  const removeSelected = () => {
    removeFiles(selectedIds);
    exitSelectionMode();
  };

  const handleMoveToFolder = (folderId: string | null) => {
    moveFilesToFolder(selectedIds, folderId);
    exitSelectionMode();
  };

  const handleAddFolder = () => {
    const name = newFolderName.trim();
    if (!name) {
      setShowNewFolderInput(false);
      return;
    }
    const folder = addFolder(name);
    setNewFolderName("");
    setShowNewFolderInput(false);
    setSelectedFolderId(folder.id);
  };

  const gridComponents = useMemo(
    () => ({
      List: forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
        ({ style, children, ...props }, ref) => (
          <div
            ref={ref}
            style={{ ...style, gridTemplateColumns: GRID_COLS[viewMode] }}
            className="grid gap-2 p-3 content-start"
            {...props}
          >
            {children}
          </div>
        )
      ),
    }),
    [viewMode]
  );

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Folder bar */}
      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto border-b border-border px-3 py-2">
        <button
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors",
            selectedFolderId === null
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setSelectedFolderId(null)}
          type="button"
        >
          All
          <span
            className={cn(
              "rounded px-1 py-0.5 text-xs tabular-nums",
              selectedFolderId === null
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {files.length}
          </span>
        </button>

        {folders.map((folder) => (
          <div className="group relative flex shrink-0 items-center" key={folder.id}>
            <button
              className={cn(
                "flex items-center gap-1.5 rounded-md py-1 pl-2.5 pr-6 text-sm transition-colors",
                selectedFolderId === folder.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setSelectedFolderId(folder.id)}
              type="button"
            >
              {folder.name}
              <span
                className={cn(
                  "rounded px-1 py-0.5 text-xs tabular-nums",
                  selectedFolderId === folder.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {folderCounts[folder.id] ?? 0}
              </span>
            </button>
            <button
              className="absolute right-1 flex size-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted-foreground/20 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedFolderId === folder.id) setSelectedFolderId(null);
                deleteFolder(folder.id);
              }}
              title="Delete folder"
              type="button"
            >
              <X className="size-2.5" />
            </button>
          </div>
        ))}

        {showNewFolderInput ? (
          <input
            className="h-7 w-28 shrink-0 rounded-md border border-primary bg-background px-2 text-sm outline-none"
            onBlur={handleAddFolder}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddFolder();
              if (e.key === "Escape") {
                setNewFolderName("");
                setShowNewFolderInput(false);
              }
            }}
            placeholder="Folder name"
            ref={newFolderInputRef}
            value={newFolderName}
          />
        ) : (
          <button
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
            onClick={() => setShowNewFolderInput(true)}
            title="New folder"
            type="button"
          >
            <FolderPlus className="size-3.5" />
            New folder
          </button>
        )}
      </div>

      {/* Gallery */}
      <div
        className={cn(
          "relative flex flex-1 select-none flex-col overflow-hidden transition-colors",
          isDragOver && "bg-primary/5"
        )}
        onClick={(e) => {
          if (justEnteredSelectionMode.current) {
            justEnteredSelectionMode.current = false;
            return;
          }
          if (
            isSelectionMode &&
            !(e.target as HTMLElement).closest("[data-file-id]")
          ) {
            exitSelectionMode();
          }
        }}
        onMouseDown={handleMouseDown}
        ref={containerRef}
      >
        {selectionBox && (
          <div
            className="pointer-events-none absolute z-40 border border-primary/50 bg-primary/20"
            style={{
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height,
            }}
          />
        )}

        {filteredFiles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="text-muted-foreground opacity-40">
              <Upload className="size-10" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="font-medium">
                {files.length > 0 ? "No results" : "No files yet"}
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                {files.length > 0
                  ? "Try a different search or folder"
                  : "Drop files here or use Add Files in the toolbar"}
              </p>
            </div>
          </div>
        ) : (
          <VirtuosoGrid
            components={gridComponents}
            itemContent={(index) => {
              const file = filteredFiles[index];
              return (
                <FileCard
                  file={file}
                  isList={isList}
                  onClick={() => handleCardClick(file.id)}
                  selected={selectedIds.has(file.id)}
                />
              );
            }}
            overscan={400}
            scrollerRef={(ref) => {
              scrollerRef.current = ref as HTMLDivElement;
            }}
            style={{ flex: 1, height: "100%" }}
            totalCount={filteredFiles.length}
          />
        )}

        {/* OS drag-drop overlay */}
        {isDragOver && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
            <Upload className="size-8 animate-bounce text-primary" strokeWidth={1.5} />
            <p className="font-medium text-primary text-sm">Release to add files</p>
          </div>
        )}

        {/* Selection action bar */}
        {isSelectionMode && selectedIds.size > 0 && (
          <SelectionToolbar
            onClearSelection={exitSelectionMode}
            onDelete={removeSelected}
            selectedCount={selectedIds.size}
          >
            {folders.length > 0 && (
              <>
                <span className="px-1 text-muted-foreground text-xs">Move to</span>
                {selectedFolderId !== null && (
                  <button
                    className="rounded px-2 py-0.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
                    onClick={() => handleMoveToFolder(null)}
                    type="button"
                  >
                    All
                  </button>
                )}
                {folders.map((f) => (
                  <button
                    className="rounded px-2 py-0.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
                    key={f.id}
                    onClick={() => handleMoveToFolder(f.id)}
                    type="button"
                  >
                    {f.name}
                  </button>
                ))}
              </>
            )}
          </SelectionToolbar>
        )}
      </div>
    </div>
  );
}
