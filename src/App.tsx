import {
  Brain,
  FileText,
  Home,
  MessageSquare,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { ChatPage } from "@/components/ChatPage";
import { CommandPalette } from "@/components/CommandPalette";
import { EmbeddingsPage } from "@/components/EmbeddingsPage";
import { GalleryToolbar } from "@/components/GalleryToolbar";
import type { ViewMode } from "@/components/GalleryToolbar";
import { HomePage } from "@/components/HomePage";
import { LicenseActivation } from "@/components/LicenseActivation";
import { NotesPage } from "@/components/NotesPage";
import { OnboardingPage } from "@/components/OnboardingPage";
import { SettingsPage } from "@/components/SettingsPage";
import { TitleBar } from "@/components/TitleBar";
import { TrashPage } from "@/components/TrashPage";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { VersionGateModal } from "@/components/VersionGateModal";
import { useWindowBounds } from "@/hooks/use-window-bounds";
import { useAppSettingsStore } from "@/stores/use-app-settings-store";
import { useLicenseStore } from "@/stores/use-license-store";
import { cn } from "@/lib/utils";

export type Page = "home" | "notes" | "chat" | "embeddings" | "trash" | "settings";

export type GalleryFile = { id: string; path: string; name: string };

function WindowBoundsManager() {
  useWindowBounds();
  return null;
}

const NAV_ITEMS: { page: Page; icon: React.ReactNode; label: string }[] = [
  { page: "home", icon: <Home className="size-4" />, label: "Home" },
  { page: "notes", icon: <FileText className="size-4" />, label: "Notes" },
  { page: "chat", icon: <MessageSquare className="size-4" />, label: "AI Chat" },
  { page: "embeddings", icon: <Brain className="size-4" />, label: "Search" },
  { page: "trash", icon: <Trash2 className="size-4" />, label: "Trash" },
];

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<GalleryFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid-sm");

  const { isValidated, isValidating, loadStoredLicense } = useLicenseStore();
  const { loadSettings, isInitialLoadDone, onboardingCompleted, setOnboardingCompleted } =
    useAppSettingsStore();

  useEffect(() => {
    loadStoredLicense();
    loadSettings();
  }, [loadStoredLicense, loadSettings]);

  const handleAddFiles = (paths: string[]) => {
    const incoming = paths.map((path) => ({
      id: crypto.randomUUID(),
      path,
      name: path.split(/[\\/]/).pop() ?? path,
    }));
    setGalleryFiles((prev) => [...prev, ...incoming]);
  };

  const handleRemoveFiles = (ids: Set<string>) => {
    setGalleryFiles((prev) => prev.filter((f) => !ids.has(f.id)));
  };

  const navCenter = (
    <div className="flex items-center gap-0.5">
      {NAV_ITEMS.map((item) => (
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
            page === item.page
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          key={item.page}
          onClick={() => setPage(item.page)}
          type="button"
          title={item.label}
        >
          {item.icon}
          <span className="hidden sm:block">{item.label}</span>
        </button>
      ))}
    </div>
  );

  if (!isInitialLoadDone || (isValidating && !isValidated)) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-4 border-foreground border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!onboardingCompleted) {
    return (
      <ThemeProvider>
        <OnboardingPage
          isLicenseActive={isValidated}
          onComplete={() => setOnboardingCompleted(true)}
        />
        <Toaster />
      </ThemeProvider>
    );
  }

  if (!isValidated) {
    return (
      <ThemeProvider>
        <LicenseActivation />
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen flex-col bg-muted">
        <TitleBar center={navCenter} />

        {page === "settings" ? (
          <SettingsPage onClose={() => setPage("home")} />
        ) : (
          <>
            <div className="mx-1 flex flex-1 overflow-hidden rounded-xl border-2 border-border bg-background">
              {page === "home" && (
                <HomePage
                  files={galleryFiles}
                  onAddFiles={handleAddFiles}
                  onRemoveFiles={handleRemoveFiles}
                  searchQuery={searchQuery}
                  viewMode={viewMode}
                />
              )}
              {page === "notes" && <NotesPage />}
              {page === "chat" && (
                <ChatPage onOpenApiKeyDialog={() => setApiKeyOpen(true)} />
              )}
              {page === "embeddings" && (
                <EmbeddingsPage onOpenApiKeyDialog={() => setApiKeyOpen(true)} />
              )}
              {page === "trash" && <TrashPage />}
            </div>

            {page === "home" ? (
              <GalleryToolbar
                onAddFiles={handleAddFiles}
                onSearchChange={setSearchQuery}
                onSettingsClick={() => setPage("settings")}
                onTrashClick={() => setPage("trash")}
                onViewModeChange={setViewMode}
                searchQuery={searchQuery}
                viewMode={viewMode}
              />
            ) : (
              <div className="mx-1 mb-1 flex h-12 items-center justify-end px-2">
                <div className="flex items-center gap-1">
                  <Button
                    aria-label="Search commands (Ctrl+K)"
                    onClick={() => setCmdOpen(true)}
                    size="icon-sm"
                    title="Search commands (Ctrl+K)"
                    variant="ghost"
                  >
                    <Search className="size-4" />
                  </Button>
                  <Button
                    aria-label="Open settings"
                    onClick={() => setPage("settings")}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Settings className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <Toaster />
        <VersionGateModal />
        <WindowBoundsManager />

        <CommandPalette
          onOpenChange={setCmdOpen}
          onPageChange={setPage}
          open={cmdOpen}
        />

        <ApiKeyDialog open={apiKeyOpen} onOpenChange={setApiKeyOpen} />
      </div>
    </ThemeProvider>
  );
}
