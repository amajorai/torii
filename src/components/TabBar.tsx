import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Bot,
  Brain,
  FileText,
  Home,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { getCurrentSeason, SnowfallBackground } from "@/components/snow-flakes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as sounds from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { useAppSettingsStore } from "@/stores/use-app-settings-store";
import type { PageId } from "@/stores/use-tabs-store";
import { useTabsStore } from "@/stores/use-tabs-store";

const PAGE_LABELS: Record<PageId, string> = {
  home: "Home",
  notes: "Notes",
  chat: "AI Chat",
  agent: "Assistant",
  embeddings: "Search",
  trash: "Trash",
  settings: "Settings",
};

const PAGE_ICONS: Record<PageId, React.ReactNode> = {
  home: <Home className="size-3 shrink-0" />,
  notes: <FileText className="size-3 shrink-0" />,
  chat: <MessageSquare className="size-3 shrink-0" />,
  agent: <Bot className="size-3 shrink-0" />,
  embeddings: <Brain className="size-3 shrink-0" />,
  trash: <Trash2 className="size-3 shrink-0" />,
  settings: <Settings className="size-3 shrink-0" />,
};

// Order the "+" menu offers pages in.
const ADDABLE_PAGES: PageId[] = [
  "home",
  "notes",
  "chat",
  "agent",
  "embeddings",
  "trash",
  "settings",
];

export function TabBar() {
  const seasonalEffectsEnabled = useAppSettingsStore(
    (s) => s.seasonalEffectsEnabled
  );
  const activeSeason = seasonalEffectsEnabled ? getCurrentSeason() : null;

  const [bounceKey, setBounceKey] = useState(0);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [ctrlTabPendingId, setCtrlTabPendingId] = useState<string | null>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const ctrlTabPendingIdRef = useRef<string | null>(null);
  const ctrlTabLastTimeRef = useRef<number>(0);

  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const closedTabs = useTabsStore((s) => s.closedTabs);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const closeTab = useTabsStore((s) => s.closeTab);
  const reopenClosedTab = useTabsStore((s) => s.reopenClosedTab);
  const reorderTabs = useTabsStore((s) => s.reorderTabs);
  const openPageTab = useTabsStore((s) => s.openPageTab);

  // Stable refs so the keyboard handler never goes stale.
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;
  ctrlTabPendingIdRef.current = ctrlTabPendingId;

  useLayoutEffect(() => {
    const el = tabContainerRef.current;
    if (!el) return;
    setContainerWidth(el.offsetWidth);
    const ro = new ResizeObserver(() => setContainerWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keyboard shortcuts — registered once, driven by refs.
  useLayoutEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const tabs = tabsRef.current;
      const activeTabId = activeTabIdRef.current;

      if (e.key === "Tab") {
        e.preventDefault();
        if (tabs.length === 0) return;
        const now = performance.now();
        if (now - ctrlTabLastTimeRef.current < 80) return;
        ctrlTabLastTimeRef.current = now;
        const currentId = ctrlTabPendingIdRef.current ?? activeTabId;
        const idx = tabs.findIndex((t) => t.id === currentId);
        const next = e.shiftKey
          ? (idx - 1 + tabs.length) % tabs.length
          : (idx + 1) % tabs.length;
        const nextId = tabs[next].id;
        ctrlTabPendingIdRef.current = nextId;
        flushSync(() => setCtrlTabPendingId(nextId));
      } else if (e.shiftKey && e.key === "T") {
        e.preventDefault();
        reopenClosedTab();
      } else if (e.key === "w") {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "Control") return;
      const pendingId = ctrlTabPendingIdRef.current;
      if (pendingId) {
        setActiveTab(pendingId);
        ctrlTabPendingIdRef.current = null;
        setCtrlTabPendingId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setActiveTab, reopenClosedTab, closeTab]);

  const handleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // Portalled popups (menus) bubble through React but live in DOM outside the
    // bar — if the real target isn't inside the bar, don't start a window drag.
    if (!e.currentTarget.contains(e.target as Node)) return;
    getCurrentWindow().startDragging();
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOverIndex(e.clientX < rect.left + rect.width / 2 ? index : index + 1);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingIndex !== null && dragOverIndex !== null) {
      let to = dragOverIndex;
      if (draggingIndex < dragOverIndex) to--;
      if (to !== draggingIndex) reorderTabs(draggingIndex, to);
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const showIndicator = (atIndex: number) => {
    if (draggingIndex === null || dragOverIndex !== atIndex) return false;
    if (dragOverIndex === draggingIndex || dragOverIndex === draggingIndex + 1)
      return false;
    return true;
  };

  const GAP_PX = 8;
  const MAX_TAB_PX = 176;
  const MIN_TAB_PX = 44;
  const ADD_BTN_PX = 36;
  const tabWidth =
    containerWidth !== null && tabs.length > 0
      ? Math.max(
          MIN_TAB_PX,
          Math.min(
            MAX_TAB_PX,
            (containerWidth - ADD_BTN_PX - (tabs.length - 1) * GAP_PX) /
              tabs.length
          )
        )
      : MAX_TAB_PX;

  const isMac = /Mac/.test(navigator.userAgent);

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative flex h-11 shrink-0 select-none items-center bg-muted",
          // Reserve space for the native overlay window controls (decorum):
          // traffic lights on the left for macOS, caption buttons on the right
          // for Windows/Linux.
          isMac ? "pr-2 pl-[78px]" : "pr-[148px] pl-3"
        )}
        onMouseDown={handleBarMouseDown}
      >
        <style>{`
          @keyframes tab-logo-bounce {
            0%   { transform: scale(1); }
            25%  { transform: scale(1.2); }
            50%  { transform: scale(0.9); }
            75%  { transform: scale(1.1); }
            90%  { transform: scale(0.97); }
            100% { transform: scale(1); }
          }
          .tab-logo-bounce { animation: tab-logo-bounce 0.5s cubic-bezier(0.36,0.07,0.19,0.97); }
        `}</style>

        {activeSeason && (
          <SnowfallBackground
            className="pointer-events-none h-[44px]"
            color={activeSeason.color}
            count={30}
            emoji={activeSeason.emoji}
            fadeBottom
            maxOpacity={1}
            maxSize={activeSeason.maxSize ?? 30}
            minOpacity={0}
            minSize={activeSeason.minSize ?? 1}
            speed={1}
            wind
            zIndex={50}
          />
        )}

        {/* Logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="relative z-[1001] flex shrink-0 cursor-pointer items-center px-1.5 outline-none"
              onClick={() => {
                sounds.click();
                setBounceKey((k) => k + 1);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              type="button"
            >
              <span
                className={cn(
                  "text-sm leading-none transition-opacity hover:opacity-80 active:opacity-60",
                  bounceKey > 0 && "tab-logo-bounce"
                )}
                key={bounceKey}
              >
                ⛩️
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent align="start" side="bottom">
            <p className="font-bold text-[10px]">Torii</p>
          </TooltipContent>
        </Tooltip>

        <div className="mx-1.5 h-4 w-px shrink-0 bg-border" />

        {/* Tab strip — Chrome-style page tabs with a trailing "+" menu. */}
        <div
          className={cn(
            "relative z-[1001] flex flex-1 items-center gap-2 overflow-hidden",
            containerWidth === null && "invisible"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverIndex(tabs.length);
          }}
          onDrop={handleDrop}
          ref={tabContainerRef}
        >
          {tabs.map((tab, index) => {
            const isActive = ctrlTabPendingId
              ? tab.id === ctrlTabPendingId
              : tab.id === activeTabId;
            const isDragging = draggingIndex === index;
            return (
              <Fragment key={tab.id}>
                {showIndicator(index) && (
                  <div className="pointer-events-none h-5 w-0.5 shrink-0 rounded-full bg-primary" />
                )}
                <div
                  className={cn(
                    "group relative z-[1001] flex h-7 shrink-0 cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded-md px-3 text-xs",
                    isActive
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isDragging && "opacity-40"
                  )}
                  draggable
                  onClick={() => {
                    sounds.click();
                    setActiveTab(tab.id);
                  }}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDrop={handleDrop}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      e.stopPropagation();
                      closeTab(tab.id);
                    }
                  }}
                  style={{ width: tabWidth }}
                >
                  {PAGE_ICONS[tab.page]}
                  <span className="truncate">{PAGE_LABELS[tab.page]}</span>
                  <button
                    className={cn(
                      "ml-auto shrink-0 rounded-full p-0.5 transition-colors",
                      isActive
                        ? "text-muted-foreground hover:bg-background hover:text-foreground"
                        : "text-transparent group-hover:text-muted-foreground hover:!bg-muted hover:!text-foreground"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      sounds.click();
                      closeTab(tab.id);
                    }}
                    type="button"
                  >
                    <svg
                      className="size-3"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </Fragment>
            );
          })}
          {showIndicator(tabs.length) && (
            <div className="pointer-events-none h-5 w-0.5 shrink-0 rounded-full bg-primary" />
          )}

          {/* New-tab button — opens any page as its own tab */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Open a new tab"
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Plus className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom">
              {ADDABLE_PAGES.map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => {
                    sounds.click();
                    openPageTab(p);
                  }}
                >
                  {PAGE_ICONS[p]}
                  {PAGE_LABELS[p]}
                </DropdownMenuItem>
              ))}
              {closedTabs.length > 0 && (
                <DropdownMenuItem
                  onClick={() => {
                    sounds.click();
                    reopenClosedTab();
                  }}
                >
                  Reopen closed tab
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
