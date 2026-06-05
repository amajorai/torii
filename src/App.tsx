import { Search, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { AgentChatPage } from "@/components/AgentChatPage";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { ChatPage } from "@/components/ChatPage";
import { CommandPalette } from "@/components/CommandPalette";
import { EmbeddingsPage } from "@/components/EmbeddingsPage";
import { GalleryToolbar, type ViewMode } from "@/components/GalleryToolbar";
import { HomePage } from "@/components/HomePage";
import { LicenseActivation } from "@/components/LicenseActivation";
import { NotesPage } from "@/components/NotesPage";
import { OnboardingPage } from "@/components/OnboardingPage";
import { SettingsPage } from "@/components/SettingsPage";
import { TabBar } from "@/components/TabBar";
import { TrashPage } from "@/components/TrashPage";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { VersionGateModal } from "@/components/VersionGateModal";
import { useAcpToolRunner } from "@/hooks/use-acp-tool-runner";
import { useWindowBounds } from "@/hooks/use-window-bounds";
import { useAppSettingsStore } from "@/stores/use-app-settings-store";
import { useLicenseStore } from "@/stores/use-license-store";
import { type PageId, useTabsStore } from "@/stores/use-tabs-store";

export type Page = PageId;

function WindowBoundsManager() {
  useWindowBounds();
  return null;
}

export default function App() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid-sm");

  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const openPageTab = useTabsStore((s) => s.openPageTab);

  // The tab strip is the single source of truth for what's on screen. `page`
  // is derived from the active tab so every `page === X` guard keeps working.
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const page: Page = activeTab?.page ?? "home";

  const { isValidated, loadStoredLicense, gateOpen, closeLicenseGate } = useLicenseStore();
  const { loadSettings, isInitialLoadDone, onboardingCompleted, setOnboardingCompleted } =
    useAppSettingsStore();

  useEffect(() => {
    loadStoredLicense();
    loadSettings();
  }, [loadStoredLicense, loadSettings]);

  // Restore the user's open tabs once settings are loaded.
  useEffect(() => {
    if (isInitialLoadDone) void useTabsStore.getState().restorePersistedTabs();
  }, [isInitialLoadDone]);

  // Handle tool calls from ACP agents (no-op until app tools are registered).
  useAcpToolRunner();

  if (!isInitialLoadDone) {
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
        <OnboardingPage onComplete={() => setOnboardingCompleted(true)} />
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen flex-col bg-muted">
        <TabBar />

        {page === "settings" ? (
          <SettingsPage onClose={() => openPageTab("home")} />
        ) : (
          <>
            <div className="mx-1 flex flex-1 overflow-hidden rounded-xl border-2 border-border bg-background">
              {page === "home" && (
                <HomePage searchQuery={searchQuery} viewMode={viewMode} />
              )}
              {page === "notes" && <NotesPage />}
              {page === "chat" && (
                <ChatPage onOpenApiKeyDialog={() => setApiKeyOpen(true)} />
              )}
              {page === "agent" && <AgentChatPage />}
              {page === "embeddings" && (
                <EmbeddingsPage onOpenApiKeyDialog={() => setApiKeyOpen(true)} />
              )}
              {page === "trash" && <TrashPage />}
            </div>

            {page === "home" ? (
              <GalleryToolbar
                onSearchChange={setSearchQuery}
                onSettingsClick={() => openPageTab("settings")}
                onTrashClick={() => openPageTab("trash")}
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
                    onClick={() => openPageTab("settings")}
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

        {gateOpen && !isValidated && (
          <div className="fixed inset-0 z-[1100]">
            <LicenseActivation onBack={closeLicenseGate} />
          </div>
        )}

        <CommandPalette
          onOpenChange={setCmdOpen}
          onPageChange={openPageTab}
          open={cmdOpen}
        />

        <ApiKeyDialog open={apiKeyOpen} onOpenChange={setApiKeyOpen} />
      </div>
    </ThemeProvider>
  );
}
