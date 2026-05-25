import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  DoorOpen,
  Download,
  Key,
  Loader2,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
  TrendingUp,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  checkForUpdate,
  downloadAndInstall,
  useUpdateStore,
} from "@/hooks/use-app-updater";
import {
  POLAR_EMBED_CHECKOUT_URL,
  usePolarCheckout,
} from "@/hooks/use-polar-checkout";
import { POLAR_CONFIG } from "@/lib/polar-config";
import * as sounds from "@/lib/sounds";
import { type AppTheme, useAppSettingsStore } from "@/stores/use-app-settings-store";
import { useLicenseStore } from "@/stores/use-license-store";

interface OnboardingPageProps {
  isLicenseActive: boolean;
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
  { id: "license-info", title: "", subtitle: "" },
  { id: "license", title: "", subtitle: "" },
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

const LICENSE_BENEFITS = [
  {
    title: "One-time payment",
    desc: "No subscription. Pay once, own it forever.",
  },
  {
    title: "1 year of updates included",
    desc: "Every new feature and improvement for a full year.",
  },
  {
    title: "30-day money back guarantee",
    desc: "Not happy? Get a full refund, no questions asked.",
  },
];

function LicensePricingStep({ onNext }: { onNext: () => void }) {
  const { openCheckout, anchorRef } = usePolarCheckout();

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <a
        className="hidden"
        data-polar-checkout=""
        data-polar-checkout-theme="dark"
        href={POLAR_EMBED_CHECKOUT_URL}
        ref={anchorRef}
      />

      <style>{`
        @keyframes slash-draw {
          from { transform: rotate(-12deg) scaleX(0); }
          to   { transform: rotate(-12deg) scaleX(1); }
        }
        @keyframes price-pop {
          0%   { opacity: 0; transform: scale(0.6); }
          60%  { opacity: 1; transform: scale(1.08); }
          80%  { transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes item-fade-up {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ animation: "fade-slide-up 0.38s ease-out 0ms both" }}>
        <h1 className="font-medium text-xl">Unlock everything</h1>
        <p className="font-medium text-muted-foreground text-xl">
          One-time payment. Yours forever.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-3">
          <span
            className="font-bold text-4xl"
            style={{
              animation:
                "price-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.75s both",
            }}
          >
            $XX
          </span>
          <span className="relative inline-block w-fit font-medium text-4xl text-muted-foreground">
            $XX
            <span className="absolute inset-0 flex items-center">
              <span
                className="block h-[3px] w-full bg-muted-foreground/70"
                style={{
                  transformOrigin: "left center",
                  animation: "slash-draw 0.4s ease-out 0.2s both",
                }}
              />
            </span>
          </span>
          <span
            className="rounded-md bg-foreground px-2 py-0.5 font-medium text-background text-xs"
            style={{ animation: "item-fade-up 0.3s ease 1.1s both" }}
          >
            Launch price
          </span>
        </div>
        <p
          className="flex items-center gap-1.5 text-muted-foreground text-sm"
          style={{ animation: "item-fade-up 0.35s ease 1.3s both" }}
        >
          <TrendingUp className="size-3.5 shrink-0" />
          Price increases with demand. Lock in now.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {LICENSE_BENEFITS.map((b, i) => (
          <div
            className="flex items-center gap-4 rounded-xl bg-muted/40 px-5 py-4"
            key={b.title}
            style={{
              animation: `fade-slide-up 0.38s ease-out ${1100 + i * 150}ms both`,
            }}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground">
              <Check className="size-4 text-background" />
            </div>
            <div>
              <p className="font-medium text-sm">{b.title}</p>
              <p className="mt-0.5 text-muted-foreground text-xs">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="flex flex-col items-center gap-3"
        style={{ animation: "fade-slide-up 0.38s ease-out 1600ms both" }}
      >
        <Button
          className="h-14 w-full"
          onClick={() => {
            sounds.click();
            openCheckout();
          }}
          size="lg"
          variant="contrast"
        >
          Buy Now
        </Button>
        <button
          className="cursor-pointer bg-transparent p-0 text-muted-foreground text-sm transition-colors hover:text-foreground"
          onClick={() => {
            sounds.click();
            onNext();
          }}
          type="button"
        >
          I already have a key →
        </button>
      </div>
    </div>
  );
}

function LicenseForm({ onComplete }: { onComplete: () => void }) {
  const [licenseKey, setLicenseKey] = useState("");
  const { isValidating, validateLicense } = useLicenseStore();
  const { openCheckout, anchorRef } = usePolarCheckout();

  const handleActivate = useCallback(async () => {
    if (!licenseKey.trim()) return;
    await validateLicense(licenseKey.trim());
    const state = useLicenseStore.getState();
    if (state.isValidated) {
      onComplete();
    } else if (state.error) {
      if (state.error.includes("already activated")) {
        sileo.error({
          title: state.error,
          description: "Visit your account portal to manage devices.",
        });
      } else {
        sileo.error({ title: state.error });
      }
    }
  }, [licenseKey, validateLicense, onComplete]);

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <a
        className="hidden"
        data-polar-checkout=""
        data-polar-checkout-theme="dark"
        href={POLAR_EMBED_CHECKOUT_URL}
        ref={anchorRef}
      />

      <div
        className="flex w-full items-start"
        style={{ animation: "fade-slide-up 0.38s ease-out 0ms both" }}
      >
        <DoorOpen className="size-10 text-foreground" />
      </div>

      <div style={{ animation: "fade-slide-up 0.38s ease-out 80ms both" }}>
        <h1 className="font-medium text-xl">Activate</h1>
        <p className="font-medium text-muted-foreground text-xl">
          Enter your license key to get started
        </p>
      </div>

      <div
        className="flex w-full flex-col gap-4"
        style={{ animation: "fade-slide-up 0.38s ease-out 160ms both" }}
      >
        <div className="relative">
          <Key className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            className="h-14 pl-10 text-lg"
            disabled={isValidating}
            onChange={(e) => setLicenseKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isValidating && licenseKey.trim())
                handleActivate();
            }}
            placeholder=""
            value={licenseKey}
          />
        </div>

        <Button
          className="h-14 w-full"
          disabled={!licenseKey.trim() || isValidating}
          onClick={() => {
            sounds.click();
            handleActivate();
          }}
          size="lg"
          variant="contrast"
        >
          {isValidating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Validating...
            </>
          ) : (
            "Activate"
          )}
        </Button>
      </div>

      <div
        className="flex w-full flex-col gap-3"
        style={{ animation: "fade-slide-up 0.38s ease-out 260ms both" }}
      >
        <p className="text-muted-foreground text-sm">
          Already have a key?{" "}
          <button
            className="cursor-pointer bg-transparent p-0 text-foreground hover:underline"
            onClick={() => {
              sounds.click();
              openUrl(POLAR_CONFIG.customerPortalUrl);
            }}
            type="button"
          >
            Retrieve it from your account
          </button>
        </p>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-muted-foreground text-xs">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          className="h-14 w-full"
          onClick={() => {
            sounds.click();
            openCheckout();
          }}
          size="lg"
          variant="secondary"
        >
          Buy Now
        </Button>
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

export function OnboardingPage({ isLicenseActive, onComplete }: OnboardingPageProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [animDir, setAnimDir] = useState<"forward" | "backward">("forward");
  const [animKey, setAnimKey] = useState(0);
  const { openCheckout: openPageCheckout, anchorRef: pageAnchorRef } = usePolarCheckout();

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const isUpdateStep = step.id === "update";
  const isPreferencesStep = step.id === "preferences";
  const isPrivacyStep = step.id === "privacy";
  const isLicenseInfoStep = step.id === "license-info";
  const isLicenseStep = step.id === "license";

  const go = (dir: "forward" | "backward", nextIndex: number) => {
    let idx = nextIndex;
    if (isLicenseActive && STEPS[idx]?.id === "license-info") {
      idx = dir === "forward" ? idx + 1 : idx - 1;
    }
    setAnimDir(dir);
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, idx)));
    setAnimKey((k) => k + 1);
  };

  const handleNext = () => {
    if (!isLast) go("forward", stepIndex + 1);
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
      <a
        className="hidden"
        data-polar-checkout=""
        data-polar-checkout-theme="dark"
        href={POLAR_EMBED_CHECKOUT_URL}
        ref={pageAnchorRef}
      />
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

          {isLicenseInfoStep && <LicensePricingStep onNext={handleNext} />}

          {isLicenseStep &&
            (isLicenseActive ? (
              <div className="flex w-full max-w-md flex-col gap-8">
                <div
                  className="flex w-full items-start"
                  style={{ animation: "fade-slide-up 0.38s ease-out 0ms both" }}
                >
                  <span className="text-4xl">🎉</span>
                </div>
                <div
                  className="flex w-full flex-col"
                  style={{ animation: "fade-slide-up 0.38s ease-out 80ms both" }}
                >
                  <h1 className="font-medium text-xl">You're all set</h1>
                  <p className="font-medium text-muted-foreground text-xl">
                    Your license is already active
                  </p>
                </div>
                <Button
                  className="h-14 w-full"
                  onClick={() => {
                    sounds.success();
                    onComplete();
                  }}
                  size="lg"
                  style={{ animation: "fade-slide-up 0.38s ease-out 160ms both" }}
                  variant="contrast"
                >
                  Get Started
                </Button>
              </div>
            ) : (
              <LicenseForm onComplete={onComplete} />
            ))}

          {!(isUpdateStep || isLicenseStep || isLicenseInfoStep) && (
            <div className="flex w-full max-w-md flex-col gap-6">
              <div style={{ animation: "fade-slide-up 0.38s ease-out 0ms both" }}>
                <h1 className="font-medium text-xl">{step.title}</h1>
                <p className="font-medium text-muted-foreground text-xl">
                  {step.subtitle}
                </p>
              </div>

              {isPreferencesStep && <PreferencesStep />}
              {isPrivacyStep && <PrivacyStep />}
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

          {isLicenseInfoStep ? (
            <div className="ml-auto">
              <Button
                onClick={() => {
                  sounds.click();
                  openPageCheckout();
                }}
                size="sm"
                variant="contrast"
              >
                Buy Now
              </Button>
            </div>
          ) : (
            !isLicenseStep && (
              <div className="ml-auto">
                <button
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
                  onClick={() => {
                    sounds.click();
                    handleNext();
                  }}
                  type="button"
                >
                  Next
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
