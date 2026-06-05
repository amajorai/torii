import {
  ArrowLeft,
  ChevronRight,
  Download,
  Loader2,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  checkForUpdate,
  downloadAndInstall,
  useUpdateStore,
} from "@/hooks/use-app-updater";
import * as sounds from "@/lib/sounds";
import { type AppTheme, useAppSettingsStore } from "@/stores/use-app-settings-store";

interface OnboardingPageProps {
  onComplete: () => void;
}

const STEPS = [
  { id: "update", title: "", subtitle: "" },
  {
    id: "preferences",
    title: "Make it yours",
    subtitle: "Set up the app to match how you work",
  },
  {
    id: "privacy",
    title: "Your data, your rules",
    subtitle: "Choose what the app remembers and shares",
  },
] as const;

function UpdateStep() {
  const { checking, downloading, progress, available } = useUpdateStore();
  const { autoCheckForUpdates, setAutoCheckForUpdates } = useAppSettingsStore();
  const [didCheck, setDidCheck] = useState(false);

  useEffect(() => {
    if (didCheck) return;
    setDidCheck(true);
    checkForUpdate();
  }, [didCheck]);

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <div
        className="flex w-full items-start"
        style={{ animation: "fade-slide-up 0.38s ease-out 0ms both" }}
      >
        {checking ? (
          <Loader2 className="size-10 animate-spin text-foreground" />
        ) : (
          <RefreshCw className="size-10 text-foreground" />
        )}
      </div>

      <div
        className="flex w-full flex-col"
        style={{ animation: "fade-slide-up 0.38s ease-out 80ms both" }}
      >
        <h1 className="font-medium text-xl">
          {checking
            ? "Checking for updates"
            : available
              ? "Update available"
              : "You're on the latest version"}
        </h1>
        <p className="font-medium text-muted-foreground text-xl">
          {checking
            ? "Just a moment..."
            : available
              ? `Version ${available.version} is ready`
              : "Torii is fully up to date"}
        </p>
      </div>

      {available && (
        <Button
          className="h-14 w-full"
          disabled={downloading}
          onClick={() => {
            sounds.download();
            downloadAndInstall(available);
          }}
          size="lg"
          style={{ animation: "fade-slide-up 0.38s ease-out 160ms both" }}
          variant="contrast"
        >
          {downloading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {progress > 0 ? `Downloading ${progress}%` : "Downloading..."}
            </>
          ) : (
            <>
              <Download className="mr-2 size-4" />
              Update Now
            </>
          )}
        </Button>
      )}

      <div
        className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
        style={{ animation: "fade-slide-up 0.38s ease-out 240ms both" }}
      >
        <div className="flex-1 pr-4">
          <p className="font-medium text-sm">Check for updates automatically</p>
          <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
            Torii checks for updates when you launch the app
          </p>
        </div>
        <Switch
          checked={autoCheckForUpdates}
          onCheckedChange={setAutoCheckForUpdates}
        />
      </div>
    </div>
  );
}

function PreferencesStep() {
  const { theme, setTheme } = useAppSettingsStore();

  const themes: { value: AppTheme; label: string; icon: ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="size-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="size-4" /> },
    { value: "system", label: "System", icon: <Monitor className="size-4" /> },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <div style={{ animation: "fade-slide-up 0.38s ease-out 120ms both" }}>
        <p className="mb-3 font-medium text-muted-foreground text-xs">
          Appearance
        </p>
        <div className="flex gap-2">
          {themes.map((t) => (
            <button
              className={`flex flex-1 flex-col items-center gap-2 rounded-lg border py-4 text-sm transition-colors ${
                theme === t.value
                  ? "border-foreground bg-muted text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/40"
              }`}
              key={t.value}
              onClick={() => {
                sounds.click();
                setTheme(t.value);
              }}
              type="button"
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrivacyStep() {
  const { analyticsEnabled, setAnalyticsEnabled, loggingEnabled, setLoggingEnabled } =
    useAppSettingsStore();

  return (
    <div className="flex w-full flex-col gap-4">
      <div
        className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
        style={{ animation: "fade-slide-up 0.38s ease-out 120ms both" }}
      >
        <div className="flex-1 pr-4">
          <p className="font-medium text-sm">Product analytics</p>
          <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
            Helps us understand which features matter most. No personal data
            ever collected
          </p>
        </div>
        <Switch checked={analyticsEnabled} onCheckedChange={setAnalyticsEnabled} />
      </div>
      <div
        className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
        style={{ animation: "fade-slide-up 0.38s ease-out 200ms both" }}
      >
        <div className="flex-1 pr-4">
          <p className="font-medium text-sm">Diagnostic logs</p>
          <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
            Stored locally only, never shared automatically
          </p>
        </div>
        <Switch checked={loggingEnabled} onCheckedChange={setLoggingEnabled} />
      </div>
    </div>
  );
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [animDir, setAnimDir] = useState<"forward" | "backward">("forward");
  const [animKey, setAnimKey] = useState(0);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const isUpdateStep = step.id === "update";

  const go = (dir: "forward" | "backward", nextIndex: number) => {
    setAnimDir(dir);
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, nextIndex)));
    setAnimKey((k) => k + 1);
  };

  const handleNext = () => {
    if (isLast) {
      sounds.success();
      onComplete();
    } else {
      go("forward", stepIndex + 1);
    }
  };
  const handleBack = () => {
    if (!isFirst) go("backward", stepIndex - 1);
  };

  const animStyle = {
    animation:
      animDir === "forward"
        ? "onboard-slide-right 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94) both"
        : "onboard-slide-left 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
  };

  return (
    <div className="flex h-screen flex-col bg-muted">
      <style>{`
        @keyframes onboard-slide-right {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes onboard-slide-left {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-slide-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Titlebar drag region */}
      <div
        className="relative flex h-10 shrink-0 items-center pr-[148px] pl-4"
        data-tauri-drag-region=""
      >
        <span className="text-base leading-none">⛩️</span>
      </div>

      {/* Content card */}
      <div className="mx-1 flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-border bg-background">
        <div
          className="flex flex-1 items-center justify-center overflow-y-auto p-8"
          key={animKey}
          style={animStyle}
        >
          {isUpdateStep && <UpdateStep />}

          {!isUpdateStep && (
            <div className="flex w-full max-w-md flex-col gap-6">
              <div style={{ animation: "fade-slide-up 0.38s ease-out 0ms both" }}>
                <h1 className="font-medium text-xl">{step.title}</h1>
                <p className="font-medium text-muted-foreground text-xl">
                  {step.subtitle}
                </p>
              </div>

              {step.id === "preferences" && <PreferencesStep />}
              {step.id === "privacy" && <PrivacyStep />}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-1 mb-1">
        <div className="relative flex h-12 items-center bg-muted px-4">
          <button
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            disabled={isFirst}
            onClick={() => {
              sounds.click();
              handleBack();
            }}
            type="button"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {STEPS.map((s, i) => (
              <button
                aria-label={`Step ${i + 1}`}
                className={`rounded-full transition-all duration-200 ${
                  i === stepIndex
                    ? "h-1.5 w-5 bg-foreground"
                    : i < stepIndex
                      ? "size-1.5 bg-foreground/40"
                      : "size-1.5 bg-foreground/15"
                }`}
                key={s.id}
                onClick={() => {
                  sounds.click();
                  go(i > stepIndex ? "forward" : "backward", i);
                }}
                type="button"
              />
            ))}
          </div>

          <div className="ml-auto">
            <button
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
              onClick={() => {
                sounds.click();
                handleNext();
              }}
              type="button"
            >
              {isLast ? "Get Started" : "Next"}
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
