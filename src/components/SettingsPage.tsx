import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getVersion } from "@tauri-apps/api/app";
import { appDataDir, join } from "@tauri-apps/api/path";
import {
  open as openDialog,
  save as saveDialog,
} from "@tauri-apps/plugin-dialog";
import {
  exists,
  readDir,
  readFile,
  remove,
  writeFile,
} from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import JSZip from "jszip";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Loader2,
  MessageCircle,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import { AgentsSettings } from "@/components/AgentsSettings";
import {
  checkForUpdate,
  downloadAndInstall,
  useUpdateStore,
} from "@/hooks/use-app-updater";
import {
  APP_DATA_DIRS,
  APP_DATA_FILES,
  DATA_SCHEMA_VERSIONS,
} from "@/lib/data-versions";
import { closeDb, getSqliteSchemaVersion } from "@/lib/db";
import { POLAR_CONFIG } from "@/lib/polar-config";
import * as sounds from "@/lib/sounds";
import { useAppSettingsStore } from "@/stores/use-app-settings-store";
import { useLicenseStore } from "@/stores/use-license-store";

interface SettingsPageProps {
  onClose: () => void;
}

type SettingsTab =
  | "general"
  | "agents"
  | "license"
  | "storage"
  | "updates"
  | "privacy";

const TABS: { value: SettingsTab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "agents", label: "AI Agents" },
  { value: "license", label: "License" },
  { value: "storage", label: "Storage" },
  { value: "updates", label: "Updates" },
  { value: "privacy", label: "Privacy" },
];

export function SettingsPage({ onClose }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [isTransferring, setIsTransferring] = useState(false);
  const appTheme = useAppSettingsStore((s) => s.theme);

  return (
    <>
      {/* Content card */}
      <div className="mx-1 flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-border bg-background">
        <div className="flex-1 overflow-auto px-6 pt-10 pb-6">
          <div className="mx-auto max-w-2xl">
            {activeTab === "general" && <GeneralSettings />}
            {activeTab === "agents" && <AgentsSettings />}
            {activeTab === "license" && <LicenseSettings />}
            {activeTab === "storage" && (
              <StorageSettings onTransferChange={setIsTransferring} />
            )}
            {activeTab === "updates" && <UpdateSettings />}
            {activeTab === "privacy" && <PrivacySettings />}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-1 mb-1">
        <div className="relative flex h-12 items-center bg-muted px-4">
          <Button
            disabled={isTransferring}
            onClick={() => {
              sounds.click();
              onClose();
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ArrowLeft className="size-4" />
          </Button>
          {/* Centered tabs */}
          <div className="absolute left-1/2 flex -translate-x-1/2 gap-1">
            {TABS.map((tab) => (
              <button
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  activeTab === tab.value
                    ? "bg-muted-foreground/15 font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                } disabled:pointer-events-none disabled:opacity-40`}
                disabled={isTransferring}
                key={tab.value}
                onClick={() => {
                  sounds.click();
                  setActiveTab(tab.value);
                }}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Feedback button — fixed to viewport bottom-right */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="fixed right-5 bottom-16 z-50 flex size-14 items-center justify-center rounded-full border border-border bg-muted text-foreground shadow-lg transition-all hover:scale-110"
                onClick={() => {
                  sounds.click();
                  // biome-ignore lint/suspicious/noExplicitAny: userjot sdk
                  const uj = (window as any).uj;
                  const resolved =
                    appTheme === "system"
                      ? window.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                        ? "dark"
                        : "light"
                      : appTheme;
                  uj?.setTheme?.(resolved);
                  uj?.showWidget?.();
                }}
                type="button"
              >
                <MessageCircle className="size-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Send feedback</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );
}

interface SettingRowProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}

function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
      <div className="flex-1 pr-4">
        <p className="font-medium text-sm">{title}</p>
        {description && (
          <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
            {description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function OnboardingSettings() {
  const setOnboardingCompleted = useAppSettingsStore(
    (s) => s.setOnboardingCompleted
  );

  return (
    <div className="space-y-4">
      <p className="pl-2 font-medium text-muted-foreground text-xs">
        Onboarding
      </p>
      <div>
        <SettingRow
          description="Replay the getting-started tour to rediscover features."
          title="Reset onboarding"
        >
          <Button
            onClick={() => {
              sounds.click();
              setOnboardingCompleted(false);
            }}
            size="sm"
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Reset
          </Button>
        </SettingRow>
      </div>
    </div>
  );
}

function ExperimentalSettings() {
  const { experimentalFeaturesEnabled, setExperimentalFeaturesEnabled } =
    useAppSettingsStore();
  return (
    <div className="space-y-4">
      <p className="mb-3 pl-2 font-medium text-muted-foreground text-xs">
        Experimental
      </p>
      <div className="space-y-2">
        <SettingRow
          description="Enable early-access features that are still in development. Changes take effect immediately."
          title="Experimental features"
        >
          <Switch
            checked={experimentalFeaturesEnabled}
            onCheckedChange={(v) => {
              v ? sounds.switchOn() : sounds.switchOff();
              setExperimentalFeaturesEnabled(v);
            }}
          />
        </SettingRow>
      </div>
    </div>
  );
}

function SoundsSettings() {
  const {
    soundsEnabled,
    setSoundsEnabled,
    seasonalEffectsEnabled,
    setSeasonalEffectsEnabled,
  } = useAppSettingsStore();
  return (
    <div className="space-y-4">
      <p className="pl-2 font-medium text-muted-foreground text-xs">
        Sound &amp; Effects
      </p>
      <div className="space-y-2">
        <SettingRow
          description="Play sounds for clicks, dialogs, switches, and other interactions."
          title="Sound Effects"
        >
          <Switch
            checked={soundsEnabled}
            onCheckedChange={(v) => {
              v ? sounds.switchOn() : sounds.switchOff();
              setSoundsEnabled(v);
            }}
          />
        </SettingRow>
        <SettingRow
          description="Show festive particle effects in the title bar during holidays."
          title="Seasonal effects"
        >
          <Switch
            checked={seasonalEffectsEnabled}
            onCheckedChange={(v) => {
              v ? sounds.switchOn() : sounds.switchOff();
              setSeasonalEffectsEnabled(v);
            }}
          />
        </SettingRow>
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <h2 className="pl-2 font-semibold text-lg">General</h2>
      <AppearanceSettings />
      <SoundsSettings />
      <OnboardingSettings />
      <ExperimentalSettings />
    </div>
  );
}

function AppearanceSettings() {
  const { theme, setTheme, rememberWindowBounds, setRememberWindowBounds } =
    useAppSettingsStore();

  const [launchAtStartup, setLaunchAtStartupState] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    import("@tauri-apps/plugin-autostart").then(({ isEnabled }) => {
      isEnabled()
        .then((v) => setLaunchAtStartupState(v))
        .catch(() => setLaunchAtStartupState(false));
    });
  }, []);

  const handleLaunchAtStartup = useCallback(async (enabled: boolean) => {
    try {
      const { enable, disable } = await import("@tauri-apps/plugin-autostart");
      if (enabled) {
        await enable();
      } else {
        await disable();
      }
      setLaunchAtStartupState(enabled);
    } catch {
      sileo.error({ title: "Failed to update launch at startup" });
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SettingRow
          description="Open the app automatically when you log in to your computer."
          title="Launch at startup"
        >
          <Switch
            checked={launchAtStartup ?? false}
            disabled={launchAtStartup === null}
            onCheckedChange={(v) => {
              v ? sounds.switchOn() : sounds.switchOff();
              handleLaunchAtStartup(v);
            }}
          />
        </SettingRow>
        <SettingRow
          description="Save and restore window position and size between sessions."
          title="Remember window position & size"
        >
          <Switch
            checked={rememberWindowBounds}
            onCheckedChange={(v) => {
              v ? sounds.switchOn() : sounds.switchOff();
              setRememberWindowBounds(v);
            }}
          />
        </SettingRow>
      </div>
      <p className="pl-2 font-medium text-muted-foreground text-xs">
        Appearance
      </p>
      <SettingRow title="Theme">
        <Select onValueChange={(val: any) => setTheme(val)} value={theme}>
          <SelectTrigger
            className="w-32 border-none bg-transparent shadow-none focus:bg-transparent dark:bg-transparent"
            size="sm"
          >
            <SelectValue>
              {theme === "light" && (
                <>
                  <Sun className="size-4" />
                  Light
                </>
              )}
              {theme === "dark" && (
                <>
                  <Moon className="size-4" />
                  Dark
                </>
              )}
              {theme === "system" && (
                <>
                  <Monitor className="size-4" />
                  System
                </>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <Sun className="size-4" />
              Light
            </SelectItem>
            <SelectItem value="dark">
              <Moon className="size-4" />
              Dark
            </SelectItem>
            <SelectItem value="system">
              <Monitor className="size-4" />
              System
            </SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </div>
  );
}

function LicenseSettings() {
  const { validatedData, clearLicense } = useLicenseStore();

  const handleManageLicense = useCallback(() => {
    openUrl(POLAR_CONFIG.customerPortalUrl);
  }, []);

  const handleDeactivate = useCallback(async () => {
    await clearLicense();
    sileo.success({ title: "License deactivated" });
  }, [clearLicense]);

  return (
    <div className="space-y-6">
      <h2 className="pl-2 font-semibold text-lg">License</h2>
      <div className="space-y-4">
        <p className="pl-2 font-medium text-muted-foreground text-xs">
          Billing
        </p>
        <div>
          <SettingRow
            description={
              validatedData?.customerEmail
                ? `${validatedData.customerEmail} · To transfer to another device, deactivate here first and reactivate via the portal.`
                : "To transfer to another device, deactivate here first and reactivate via the portal."
            }
            title="License"
          >
            <Button
              onClick={() => {
                sounds.click();
                handleManageLicense();
              }}
              size="sm"
              variant="ghost"
            >
              <ExternalLink className="mr-2 size-4" />
              Manage
            </Button>
            <Button
              onClick={() => {
                sounds.delete_();
                handleDeactivate();
              }}
              size="sm"
              variant="destructive"
            >
              Deactivate
            </Button>
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

function PrivacySettings() {
  const {
    analyticsEnabled,
    setAnalyticsEnabled,
    loggingEnabled,
    setLoggingEnabled,
  } = useAppSettingsStore();

  return (
    <div className="space-y-6">
      <h2 className="pl-2 font-semibold text-lg">Privacy</h2>

      <div className="space-y-4">
        <p className="pl-2 font-medium text-muted-foreground text-xs">
          Analytics &amp; Telemetry
        </p>
        <div className="space-y-2">
          <SettingRow
            description="Helps us understand how you use the app so we can improve it. No personal data is collected."
            title="Product Analytics"
          >
            <Switch
              checked={analyticsEnabled}
              onCheckedChange={(v) => {
                v ? sounds.switchOn() : sounds.switchOff();
                setAnalyticsEnabled(v);
              }}
            />
          </SettingRow>
          <SettingRow
            description="Sends app logs and error reports to help diagnose issues."
            title="Diagnostic Logging"
          >
            <Switch
              checked={loggingEnabled}
              onCheckedChange={(v) => {
                v ? sounds.switchOn() : sounds.switchOff();
                setLoggingEnabled(v);
              }}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

function UpdateSettings() {
  const { autoCheckForUpdates, setAutoCheckForUpdates } = useAppSettingsStore();
  const { checking, downloading, progress, available } = useUpdateStore();
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion()
      .then(setCurrentVersion)
      .catch(() => {});
  }, []);

  const handleCheckNow = useCallback(async () => {
    await checkForUpdate();
    if (!useUpdateStore.getState().available) {
      sileo.success({
        title: "You're up to date",
        description: currentVersion
          ? `Version ${currentVersion} is the latest.`
          : undefined,
      });
    }
  }, [currentVersion]);

  const handleInstall = useCallback(async () => {
    if (available) {
      await downloadAndInstall(available);
    }
  }, [available]);

  return (
    <div className="space-y-6">
      <h2 className="pl-2 font-semibold text-lg">Updates</h2>

      <div className="space-y-4">
        <p className="pl-2 font-medium text-muted-foreground text-xs">
          Version
        </p>
        <div className="space-y-2">
          <SettingRow
            description={
              currentVersion ? `Current version: ${currentVersion}` : undefined
            }
            title="App"
          >
            <div className="flex items-center gap-2">
              {available && !downloading && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                  v{available.version} available
                </span>
              )}
              <Button
                disabled={checking || downloading}
                onClick={() => {
                  sounds.click();
                  handleCheckNow();
                }}
                size="sm"
                variant="ghost"
              >
                <RefreshCw
                  className={`mr-2 size-4 ${checking ? "animate-spin" : ""}`}
                />
                {checking ? "Checking…" : "Check for updates"}
              </Button>
            </div>
          </SettingRow>
          {available && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">
                    Version {available.version} is available
                  </p>
                  {available.date && (
                    <p className="text-muted-foreground text-xs">
                      Released{" "}
                      {new Date(available.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <Button
                  disabled={downloading}
                  onClick={() => {
                    sounds.download();
                    handleInstall();
                  }}
                  size="sm"
                >
                  <Download className="mr-2 size-4" />
                  {downloading ? "Installing…" : "Update now"}
                </Button>
              </div>
              {downloading && (
                <div className="mt-3 space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">{progress}%</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <p className="pl-2 font-medium text-muted-foreground text-xs">
          Preferences
        </p>
        <div>
          <SettingRow
            description="Automatically check for updates when the app starts"
            title="Check for updates automatically"
          >
            <Switch
              checked={autoCheckForUpdates}
              onCheckedChange={(v) => {
                v ? sounds.switchOn() : sounds.switchOff();
                setAutoCheckForUpdates(v);
              }}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

const progressLatest: Record<string, string> = {};

function ProgressDescription({ event }: { event: string }) {
  const [text, setText] = useState(() => progressLatest[event] ?? "Preparing…");
  useEffect(() => {
    if (progressLatest[event]) setText(progressLatest[event]);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      progressLatest[event] = detail;
      setText(detail);
    };
    window.addEventListener(event, handler);
    return () => window.removeEventListener(event, handler);
  }, [event]);
  return <span>{text}</span>;
}

function StorageSettings({
  onTransferChange,
}: {
  onTransferChange: (active: boolean) => void;
}) {
  const { isValidated, openLicenseGate } = useLicenseStore();
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState("Preparing…");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState("Reading…");
  const [isWiping, setIsWiping] = useState(false);
  const [sqliteVersion, setSqliteVersion] = useState<number | null>(null);

  useEffect(() => {
    onTransferChange(exporting || importing);
  }, [exporting, importing, onTransferChange]);

  useEffect(() => {
    getSqliteSchemaVersion()
      .then(setSqliteVersion)
      .catch(() => {});
  }, []);

  const busy = exporting || importing;

  const handleExport = useCallback(async () => {
    const savePath = await saveDialog({
      defaultPath: `app-backup-${new Date().toISOString().split("T")[0]}.zip`,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (!savePath) return;

    setExporting(true);
    setExportProgress(0);
    setExportPhase("Preparing…");
    try {
      await sileo.promise(
        (async () => {
          const appData = await appDataDir();
          const zip = new JSZip();

          const emitToast = (msg: string) => {
            progressLatest["export-progress"] = msg;
            window.dispatchEvent(
              new CustomEvent("export-progress", { detail: msg })
            );
          };
          const setPhase = (label: string) => {
            setExportPhase(label);
            emitToast(label);
          };

          // Write manifest so future imports can check compatibility
          const appVersion = await getVersion();
          const currentSqliteVersion = await getSqliteSchemaVersion();
          const manifest = {
            schemaVersion: 1,
            appVersion,
            createdAt: new Date().toISOString(),
            dataSchemaVersions: {
              ...DATA_SCHEMA_VERSIONS,
              sqlite: currentSqliteVersion,
            },
          };
          zip.file("manifest.json", JSON.stringify(manifest, null, 2));

          setPhase("Backing up database…");
          for (const fname of APP_DATA_FILES) {
            try {
              zip.file(fname, await readFile(await join(appData, fname)));
            } catch {
              /* file may not exist */
            }
          }

          for (const dir of APP_DATA_DIRS) {
            const dirPath = await join(appData, dir);
            if (await exists(dirPath)) {
              setPhase(`Backing up ${dir}…`);
              await addDirToZip(zip, dirPath, dir);
            }
          }

          setPhase("Compressing…");
          const zipData = await zip.generateAsync(
            {
              type: "uint8array",
              compression: "DEFLATE",
              compressionOptions: { level: 3 },
            },
            ({ percent, currentFile }) => {
              const p = Math.round(percent);
              setExportProgress(p);
              const name = currentFile?.split("/").pop() ?? "";
              emitToast(`${name ? `${name} · ` : ""}${p}%`);
            }
          );

          setPhase("Saving…");
          await writeFile(savePath, zipData);

          // Verify the written file starts with PK local-file-header magic
          const verify = await readFile(savePath);
          if (
            verify.length < 4 ||
            verify[0] !== 0x50 ||
            verify[1] !== 0x4b ||
            verify[2] !== 0x03 ||
            verify[3] !== 0x04
          ) {
            throw new Error(
              `Export wrote ${verify.length} bytes but ZIP magic is wrong: ${Array.from(
                verify.subarray(0, 4)
              )
                .map((x) => x.toString(16).padStart(2, "0"))
                .join(" ")}`
            );
          }
          setExportProgress(100);
        })(),
        {
          loading: {
            title: "Exporting backup…",
            description: <ProgressDescription event="export-progress" />,
            duration: 600_000,
            autopilot: { expand: 0 },
          },
          success: { title: "Full backup exported" },
          error: (err: unknown) => ({ title: `Export failed: ${err}` }),
        }
      );
    } catch {
      /* sileo handled display */
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  }, []);

  const handleConfirmImport = useCallback(async (zipPath: string) => {
    setImporting(true);
    setImportProgress(0);
    setImportPhase("Extracting…");
    let succeeded = false;

    const emitToast = (msg: string) => {
      progressLatest["import-progress"] = msg;
      window.dispatchEvent(new CustomEvent("import-progress", { detail: msg }));
    };
    const setPhase = (label: string) => {
      setImportPhase(label);
      emitToast(label);
    };

    const loadingId = sileo.info({
      title: "Restoring backup…",
      description: <ProgressDescription event="import-progress" />,
      duration: null,
      autopilot: { expand: 0 },
    });

    try {
      setPhase("Checking backup compatibility…");
      const zipBytes = await readFile(zipPath);
      const peekZip = await JSZip.loadAsync(zipBytes);
      const manifestFile = peekZip.file("manifest.json");
      if (manifestFile) {
        let manifest: {
          dataSchemaVersions?: Record<string, number>;
        };
        try {
          manifest = JSON.parse(await manifestFile.async("string"));
        } catch {
          throw new Error(
            "Backup manifest is corrupt. Refusing to restore — file an issue if this backup was produced by a recent version."
          );
        }
        const backupVersions = manifest.dataSchemaVersions ?? {};
        const currentSqliteVersion = await getSqliteSchemaVersion();
        const currentVersions: Record<string, number> = {
          ...DATA_SCHEMA_VERSIONS,
          sqlite: currentSqliteVersion,
        };
        for (const [key, backupVer] of Object.entries(backupVersions)) {
          const currentVer = currentVersions[key];
          if (currentVer === undefined) {
            throw new Error(
              `This backup contains data type "${key}" (v${backupVer}) that this version of the app doesn't recognise. Please update the app before restoring this backup.`
            );
          }
          if (backupVer > currentVer) {
            throw new Error(
              `This backup requires ${key} schema v${backupVer} but you are running v${currentVer}. Please update the app before restoring this backup.`
            );
          }
        }
      }

      setPhase("Extracting backup…");
      try {
        await closeDb();
      } catch {
        // Non-fatal
      }

      // Extract files from ZIP into appData
      const appData = await appDataDir();
      const zipForExtract = await JSZip.loadAsync(zipBytes);
      const entries = Object.keys(zipForExtract.files);
      let done = 0;
      for (const name of entries) {
        const file = zipForExtract.files[name];
        if (file.dir || name === "manifest.json") continue;
        const data = await file.async("uint8array");
        const destPath = await join(appData, name);
        // Ensure parent directory exists
        const parts = name.split("/");
        if (parts.length > 1) {
          const dirParts = parts.slice(0, -1);
          let current = appData;
          for (const part of dirParts) {
            current = await join(current, part);
            if (!(await exists(current))) {
              const { mkdir } = await import("@tauri-apps/plugin-fs");
              await mkdir(current, { recursive: true });
            }
          }
        }
        await writeFile(destPath, data);
        done++;
        const pct = Math.round((done / entries.length) * 100);
        setImportProgress(pct);
        emitToast(`${name.split("/").pop()} · ${pct}%`);
      }

      sileo.dismiss(loadingId);
      sileo.success({ title: "Backup restored. Restarting…" });
      succeeded = true;
    } catch (err) {
      sileo.dismiss(loadingId);
      sileo.error({
        title: "Import failed",
        description: String(err),
        duration: null,
      });
    } finally {
      if (!succeeded) {
        setImporting(false);
        setImportProgress(0);
      }
    }

    if (succeeded) {
      setTimeout(async () => {
        try {
          await relaunch();
        } catch (err) {
          setImporting(false);
          setImportProgress(0);
          sileo.error({
            title: "Restart failed — please relaunch manually",
            description: String(err),
            duration: null,
          });
        }
      }, 1500);
    }
  }, []);

  const handlePickImport = useCallback(async () => {
    const filePath = await openDialog({
      multiple: false,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (!filePath) return;
    const zipPath = filePath as string;
    const toastId = sileo.warning({
      title: "Replace all current data?",
      description:
        "This will overwrite all your projects and settings. The app will restart automatically. This cannot be undone.",
      duration: null,
      button: {
        title: "Yes, restore backup",
        onClick: () => {
          sileo.dismiss(toastId);
          handleConfirmImport(zipPath);
        },
      },
    });
  }, [handleConfirmImport]);

  const handleConfirmWipe = useCallback(async () => {
    setIsWiping(true);
    try {
      await closeDb();
      const appData = await appDataDir();
      for (const fname of [...APP_DATA_FILES, "app.db-wal", "app.db-shm"]) {
        try {
          await remove(await join(appData, fname));
        } catch {
          /* may not exist */
        }
      }
      for (const dir of APP_DATA_DIRS) {
        try {
          const dirPath = await join(appData, dir);
          if (await exists(dirPath)) {
            await remove(dirPath, { recursive: true });
          }
        } catch {
          /* may not exist */
        }
      }
      sileo.success({ title: "Workspace wiped. Restarting…" });
      await relaunch();
    } catch (err) {
      sileo.error({ title: `Wipe failed: ${err}` });
      setIsWiping(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="pl-2 font-semibold text-lg">Storage</h2>

      <div className="space-y-4">
        <p className="pl-2 font-medium text-muted-foreground text-xs">
          Backup &amp; Restore
        </p>
        <div className="space-y-2">
          <SettingRow
            description="All data, settings, and database."
            title="Export Full Backup"
          >
            <Button
              className="relative overflow-hidden"
              disabled={busy}
              onClick={() => {
                if (!isValidated) { openLicenseGate(); return; }
                sounds.download();
                handleExport();
              }}
              size="sm"
            >
              {exporting && (
                <span
                  className="absolute inset-0 bg-primary/20 transition-[width] duration-200"
                  style={{ width: `${exportProgress}%` }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {exporting ? (
                  <>
                    <span>{exportPhase}</span>
                    {exportProgress > 0 && (
                      <span className="shrink-0">{exportProgress}%</span>
                    )}
                  </>
                ) : (
                  "Export"
                )}
              </span>
            </Button>
          </SettingRow>
          <SettingRow
            description="Restore from a previously exported backup ZIP."
            title="Import Backup"
          >
            <Button
              className="relative overflow-hidden"
              disabled={busy}
              onClick={() => {
                if (!isValidated) { openLicenseGate(); return; }
                sounds.click();
                handlePickImport();
              }}
              size="sm"
            >
              {importing && (
                <span
                  className="absolute inset-0 bg-primary/20 transition-[width] duration-200"
                  style={{ width: `${importProgress}%` }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {importing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {importing ? (
                  <>
                    <span>{importPhase}</span>
                    {importProgress > 0 && (
                      <span className="shrink-0">{importProgress}%</span>
                    )}
                  </>
                ) : (
                  "Import"
                )}
              </span>
            </Button>
          </SettingRow>
        </div>
      </div>

      <div className="space-y-4">
        <p className="pl-2 font-medium text-muted-foreground text-xs">
          Database
        </p>
        <div>
          <SettingRow
            description={
              sqliteVersion !== null
                ? `SQLite schema version: ${sqliteVersion}`
                : "Loading…"
            }
            title="Schema Version"
          >
            <span className="font-mono text-muted-foreground text-xs">
              {sqliteVersion !== null ? `v${sqliteVersion}` : "…"}
            </span>
          </SettingRow>
        </div>
      </div>

      <div className="space-y-4">
        <p className="pl-2 font-medium text-muted-foreground text-xs">
          Danger Zone
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <div className="flex-1 pr-4">
              <p className="font-medium text-sm">Delete Workspace</p>
              <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
                Permanently delete all data, settings, and database. This cannot
                be undone.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                disabled={isWiping || busy}
                onClick={() => {
                  const toastId = sileo.warning({
                    title: "Delete everything permanently?",
                    description:
                      "All data, settings, and databases will be wiped. The app will restart. This cannot be undone.",
                    duration: null,
                    button: {
                      title: "Yes, delete everything",
                      onClick: () => {
                        sileo.dismiss(toastId);
                        handleConfirmWipe();
                      },
                    },
                  });
                }}
                size="sm"
                variant="destructive"
              >
                <Trash2 className="mr-2 size-4" />
                {isWiping ? "Wiping…" : "Wipe"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function addDirToZip(
  zip: JSZip,
  dirPath: string,
  zipPrefix: string
): Promise<void> {
  const entries = await readDir(dirPath);
  for (const entry of entries) {
    if (!entry.name) continue;
    const fullPath = await join(dirPath, entry.name);
    const zipPath = `${zipPrefix}/${entry.name}`;
    if (entry.isDirectory) {
      await addDirToZip(zip, fullPath, zipPath);
    } else {
      zip.file(zipPath, readFile(fullPath));
    }
  }
}
