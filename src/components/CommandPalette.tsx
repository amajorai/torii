import { Command } from "cmdk";
import {
  ArchiveIcon,
  BrainIcon,
  FileTextIcon,
  Loader2Icon,
  MessageSquareIcon,
  MonitorIcon,
  MoonIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  TrashIcon,
  Volume2Icon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { checkForUpdate, useUpdateStore } from "@/hooks/use-app-updater";
import { useAppSettingsStore } from "@/stores/use-app-settings-store";
import type { Page } from "@/App";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPageChange: (page: Page) => void;
}

export function CommandPalette({ open, onOpenChange, onPageChange }: CommandPaletteProps) {
  const setTheme = useAppSettingsStore((s) => s.setTheme);
  const soundsEnabled = useAppSettingsStore((s) => s.soundsEnabled);
  const setSoundsEnabled = useAppSettingsStore((s) => s.setSoundsEnabled);
  const setOnboardingCompleted = useAppSettingsStore((s) => s.setOnboardingCompleted);
  const checking = useUpdateStore((s) => s.checking);

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, onOpenChange]);

  const run = useCallback(
    (fn: () => void) => {
      onOpenChange(false);
      fn();
    },
    [onOpenChange]
  );

  const switchTheme = async (theme: "light" | "dark" | "system") => {
    await setTheme(theme);
    toast.success(`Theme: ${theme}`);
    onOpenChange(false);
  };

  const handleToggleSounds = () => {
    onOpenChange(false);
    setSoundsEnabled(!soundsEnabled).then(() => {
      toast.success(`Sound effects: ${soundsEnabled ? "Off" : "On"}`);
    });
  };

  const handleCheckForUpdates = () => {
    onOpenChange(false);
    checkForUpdate();
  };

  const handleResetOnboarding = () => {
    onOpenChange(false);
    setOnboardingCompleted(false).then(() => {
      toast.success("Onboarding reset");
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/50"
        onMouseDown={() => onOpenChange(false)}
      />

      <div className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
        <Command
          className="flex flex-col"
          onKeyDown={(e) => {
            if (e.key === "Escape") onOpenChange(false);
          }}
        >
          <div className="flex items-center gap-3 border-border border-b px-4">
            <SearchIcon className="size-5 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              className="h-14 w-full bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground"
              onValueChange={setSearch}
              placeholder="Search commands..."
              value={search}
            />
          </div>

          <Command.List className="max-h-[480px] overflow-y-auto overflow-x-hidden p-1.5">
            <Command.Empty className="py-8 text-center text-muted-foreground text-sm">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Group heading="Go to">
              <Item
                icon={<FileTextIcon />}
                keywords={["notes", "write"]}
                onSelect={() => run(() => onPageChange("notes"))}
                value="go-notes"
              >
                Notes
              </Item>
              <Item
                icon={<MessageSquareIcon />}
                keywords={["chat", "ai", "gemini"]}
                onSelect={() => run(() => onPageChange("chat"))}
                value="go-chat"
              >
                AI Chat
              </Item>
              <Item
                icon={<BrainIcon />}
                keywords={["embeddings", "semantic", "search", "ai"]}
                onSelect={() => run(() => onPageChange("embeddings"))}
                value="go-embeddings"
              >
                Semantic Search
              </Item>
              <Item
                icon={<ArchiveIcon />}
                keywords={["archive", "archived"]}
                onSelect={() => run(() => onPageChange("notes"))}
                value="go-archive"
              >
                Archive
              </Item>
              <Item
                icon={<TrashIcon />}
                keywords={["trash", "deleted"]}
                onSelect={() => run(() => onPageChange("trash"))}
                value="go-trash"
              >
                Trash
              </Item>
              <Item
                icon={<SettingsIcon />}
                keywords={["settings", "preferences"]}
                onSelect={() => run(() => onPageChange("settings"))}
                value="go-settings"
              >
                Settings
              </Item>
            </Group>

            <Separator />

            {/* Theme */}
            <Group heading="Theme">
              <Item
                icon={<SunIcon />}
                keywords={["light", "white", "bright"]}
                onSelect={() => switchTheme("light")}
                value="theme-light"
              >
                Light Mode
              </Item>
              <Item
                icon={<MoonIcon />}
                keywords={["dark", "black", "night"]}
                onSelect={() => switchTheme("dark")}
                value="theme-dark"
              >
                Dark Mode
              </Item>
              <Item
                icon={<MonitorIcon />}
                keywords={["system", "auto", "os"]}
                onSelect={() => switchTheme("system")}
                value="theme-system"
              >
                System Theme
              </Item>
            </Group>

            <Separator />

            {/* System */}
            <Group heading="System">
              <Item
                icon={
                  checking ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <RefreshCwIcon />
                  )
                }
                keywords={["update", "version", "upgrade"]}
                onSelect={handleCheckForUpdates}
                value="check-updates"
              >
                Check for Updates
              </Item>
              <Item
                icon={<Volume2Icon />}
                keywords={["sound", "audio", "mute"]}
                onSelect={handleToggleSounds}
                suffix={<StateBadge enabled={soundsEnabled} />}
                value="toggle-sounds"
              >
                Sound Effects
              </Item>
              <Item
                icon={<RotateCcwIcon />}
                keywords={["reset", "onboarding", "tutorial"]}
                onSelect={handleResetOnboarding}
                value="reset-onboarding"
              >
                Reset Onboarding
              </Item>
            </Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      className="[&_[cmdk-group-heading]]:mb-0.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:text-xs"
      heading={heading}
    >
      {children}
    </Command.Group>
  );
}

function Separator() {
  return <Command.Separator className="my-1 h-px bg-border" />;
}

function StateBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 font-medium text-xs ${
        enabled
          ? "bg-green-500/15 text-green-500"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {enabled ? "On" : "Off"}
    </span>
  );
}

function Item({
  value,
  keywords,
  onSelect,
  icon,
  children,
  suffix,
}: {
  value: string;
  keywords?: string[];
  onSelect: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  return (
    <Command.Item
      className="flex cursor-default select-none items-center gap-2.5 rounded-lg px-2 py-2.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-[selected=true]:[&_svg]:text-accent-foreground"
      keywords={keywords}
      onSelect={onSelect}
      value={value}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {suffix}
    </Command.Item>
  );
}
