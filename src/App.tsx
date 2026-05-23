import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { LicenseActivation } from "@/components/LicenseActivation";
import { OnboardingPage } from "@/components/OnboardingPage";
import { SettingsPage } from "@/components/SettingsPage";
import { TitleBar } from "@/components/TitleBar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { VersionGateModal } from "@/components/VersionGateModal";
import { useWindowBounds } from "@/hooks/use-window-bounds";
import { useAppSettingsStore } from "@/stores/use-app-settings-store";
import { useLicenseStore } from "@/stores/use-license-store";

export type Page = "home" | "settings";

function WindowBoundsManager() {
  useWindowBounds();
  return null;
}

export default function App() {
  const [page, setPage] = useState<Page>("home");

  const { isValidated, isValidating, loadStoredLicense } = useLicenseStore();
  const { loadSettings, isInitialLoadDone, onboardingCompleted, setOnboardingCompleted } =
    useAppSettingsStore();

  useEffect(() => {
    loadStoredLicense();
    loadSettings();
  }, [loadStoredLicense, loadSettings]);

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

  if (!isValidated) {
    return (
      <ThemeProvider>
        <LicenseActivation />
        <Toaster />
      </ThemeProvider>
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
        <TitleBar
          actions={
            <button
              aria-label="Open settings"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setPage("settings")}
              type="button"
            >
              <Settings className="size-4" />
            </button>
          }
        />

        {page === "settings" ? (
          <SettingsPage onClose={() => setPage("home")} />
        ) : (
          <div className="mx-1 mb-1 flex flex-1 items-center justify-center rounded-xl border-2 border-border bg-background">
            <p className="text-muted-foreground text-sm">
              Your app content goes here
            </p>
          </div>
        )}

        <Toaster />
        <VersionGateModal />
        <WindowBoundsManager />
      </div>
    </ThemeProvider>
  );
}
