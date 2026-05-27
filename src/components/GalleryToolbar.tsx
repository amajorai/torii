import {
  Grid2x2,
  Grid3x3,
  LayoutList,
  List,
  Search,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTrashStore } from "@/stores/use-trash-store";
import { useGalleryStore } from "@/stores/use-gallery-store";

export type ViewMode = "grid-sm" | "grid-md" | "grid-lg" | "list";

interface GalleryToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onTrashClick: () => void;
  onSettingsClick: () => void;
}

const VIEW_MODES: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: "grid-sm", icon: <Grid3x3 className="size-3.5" />, label: "Small grid" },
  { mode: "grid-md", icon: <Grid2x2 className="size-3.5" />, label: "Medium grid" },
  { mode: "grid-lg", icon: <LayoutList className="size-3.5" />, label: "Large grid" },
  { mode: "list", icon: <List className="size-3.5" />, label: "List" },
];

export function GalleryToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onTrashClick,
  onSettingsClick,
}: GalleryToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const trashItems = useTrashStore((s) => s.trashItems);
  const addFiles = useGalleryStore((s) => s.addFiles);

  const handlePickFiles = async () => {
    const result = await open({ multiple: true });
    if (!result) return;
    const paths = Array.isArray(result) ? result : [result];
    addFiles(paths);
  };

  return (
    <header className="mx-1 mb-1 flex h-12 items-center justify-between bg-muted px-3">
      {/* Left: view mode buttons */}
      <div className="flex items-center gap-0.5">
        {VIEW_MODES.map(({ mode, icon, label }) => (
          <button
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              viewMode === mode
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={mode}
            onClick={() => onViewModeChange(mode)}
            title={label}
            type="button"
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Center: search bar */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div
          className={cn(
            "relative flex h-8 items-center rounded-lg bg-background transition-all",
            isSearchFocused ? "w-80 ring-1 ring-primary/30" : "w-60"
          )}
        >
          <Search className="absolute left-2.5 size-3.5 text-muted-foreground/60" />
          <input
            className="h-full w-full bg-transparent pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground/60"
            onBlur={() => setIsSearchFocused(false)}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search files..."
            ref={inputRef}
            type="text"
            value={searchQuery}
          />
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <Button
          className="relative"
          onClick={onTrashClick}
          size="icon-sm"
          title="Trash"
          variant="ghost"
        >
          <Trash2 className="size-4" />
          {trashItems.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-medium text-[10px] text-primary-foreground">
              {trashItems.length > 99 ? "99+" : trashItems.length}
            </span>
          )}
        </Button>
        <Button
          onClick={onSettingsClick}
          size="icon-sm"
          title="Settings"
          variant="ghost"
        >
          <Settings className="size-4" />
        </Button>
        <Button onClick={handlePickFiles} size="sm">
          <Upload className="mr-1.5 size-3.5" />
          Add Files
        </Button>
      </div>
    </header>
  );
}
