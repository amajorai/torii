import { ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import * as sounds from "@/lib/sounds";
import { useAppSettingsStore } from "@/stores/use-app-settings-store";

interface OnboardingPageProps {
  onComplete: () => void;
}

type StepId = "welcome" | "appearance" | "privacy" | "done";

const STEPS: StepId[] = ["welcome", "appearance", "privacy", "done"];

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const navigate = (dir: "forward" | "back") => {
    sounds.click();
    setDirection(dir);
    setAnimKey((k) => k + 1);
    setStepIndex((i) => (dir === "forward" ? i + 1 : i - 1));
  };

  const handleNext = () => {
    if (isLast) {
      sounds.switchOn();
      onComplete();
    } else {
      navigate("forward");
    }
  };

  return (
    <div className="flex h-screen flex-col bg-muted">
      {/* Content */}
      <div className="mx-1 mt-1 flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-border bg-background">
        <div
          className="flex flex-1 flex-col items-center justify-center px-8 py-12"
          key={`${animKey}-${direction}`}
          style={{
            animation: `${direction === "forward" ? "onboard-in-forward" : "onboard-in-back"} 0.22s ease both`,
          }}
        >
          {currentStep === "welcome" && <WelcomeStep />}
          {currentStep === "appearance" && <AppearanceStep />}
          {currentStep === "privacy" && <PrivacyStep />}
          {currentStep === "done" && <DoneStep />}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-1 mb-1">
        <div className="relative flex h-14 items-center bg-muted px-4">
          {/* Back */}
          <Button
            disabled={isFirst}
            onClick={() => navigate("back")}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {/* Step dots */}
          <div className="absolute left-1/2 flex -translate-x-1/2 gap-1.5">
            {STEPS.map((_, i) => (
              <div
                className={`size-1.5 rounded-full transition-colors ${
                  i === stepIndex
                    ? "bg-foreground"
                    : "bg-muted-foreground/30"
                }`}
                key={i}
              />
            ))}
          </div>

          {/* Next */}
          <div className="ml-auto">
            <Button onClick={handleNext} size="sm" type="button">
              {isLast ? "Get started" : "Next"}
              {!isLast && <ChevronRight className="ml-1 size-4" />}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes onboard-in-forward {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes onboard-in-back {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="flex max-w-sm flex-col items-center gap-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-foreground/5 text-4xl">
        ⛩️
      </div>
      <div className="space-y-2">
        <h1 className="font-bold text-2xl tracking-tight">Welcome</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Let's get you set up in just a few quick steps.
        </p>
      </div>
    </div>
  );
}

function AppearanceStep() {
  const { theme, setTheme } = useAppSettingsStore();

  const options = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    {
      value: "system" as const,
      label: "System",
      icon: ({ className }: { className?: string }) => (
        <span className={className} style={{ fontSize: "1em" }}>
          ⚙
        </span>
      ),
    },
  ];

  return (
    <div className="flex max-w-sm flex-col items-center gap-8 text-center">
      <div className="space-y-2">
        <h2 className="font-bold text-2xl tracking-tight">Appearance</h2>
        <p className="text-muted-foreground text-sm">Choose your preferred theme.</p>
      </div>
      <div className="flex gap-3">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            className={`flex w-24 flex-col items-center gap-3 rounded-xl border-2 p-4 transition-colors ${
              theme === value
                ? "border-foreground bg-foreground/5"
                : "border-border hover:border-foreground/40"
            }`}
            key={value}
            onClick={() => {
              sounds.click();
              setTheme(value);
            }}
            type="button"
          >
            <Icon className="size-5" />
            <span className="font-medium text-sm">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PrivacyStep() {
  const { analyticsEnabled, setAnalyticsEnabled } = useAppSettingsStore();

  return (
    <div className="flex max-w-sm flex-col items-center gap-8 text-center">
      <div className="space-y-2">
        <h2 className="font-bold text-2xl tracking-tight">Privacy</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Help improve the app by sharing anonymous usage data. No personal
          information is ever collected.
        </p>
      </div>
      <div className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3">
        <div className="text-left">
          <p className="font-medium text-sm">Share usage analytics</p>
          <p className="text-muted-foreground text-xs">Anonymous crash reports and feature usage</p>
        </div>
        <Switch
          checked={analyticsEnabled}
          onCheckedChange={(v) => {
            v ? sounds.switchOn() : sounds.switchOff();
            setAnalyticsEnabled(v);
          }}
        />
      </div>
    </div>
  );
}

function DoneStep() {
  return (
    <div className="flex max-w-sm flex-col items-center gap-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-foreground/5 text-4xl">
        ✓
      </div>
      <div className="space-y-2">
        <h2 className="font-bold text-2xl tracking-tight">You're all set</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Everything is ready. You can change these settings any time from the
          settings page.
        </p>
      </div>
    </div>
  );
}
