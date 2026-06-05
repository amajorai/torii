import { load } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { logger } from "@/lib/logger";

const TABS_STORE_NAME = "settings.json";
const PERSISTED_TABS_KEY = "persisted_open_tabs";

// The set of full-screen "pages" that can each live in their own tab, like a
// browser tab. Keep this in sync with the app's Page union.
export type PageId =
  | "home"
  | "notes"
  | "chat"
  | "agent"
  | "embeddings"
  | "trash"
  | "settings";

export interface PageTab {
  id: string;
  page: PageId;
}

interface TabsState {
  tabs: PageTab[];
  activeTabId: string | null;
  closedTabs: PageTab[];

  openPageTab: (page: PageId) => string;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  reopenClosedTab: () => void;
  savePersistedTabs: () => Promise<void>;
  restorePersistedTabs: () => Promise<void>;
}

function makeTab(page: PageId): PageTab {
  return { id: crypto.randomUUID(), page };
}

export const useTabsStore = create<TabsState>()((set, get) => {
  // Seed with a single Home tab so the strip is never empty on first launch.
  const initial = makeTab("home");

  return {
    tabs: [initial],
    activeTabId: initial.id,
    closedTabs: [],

    openPageTab: (page) => {
      const { tabs } = get();
      // Focus an existing tab for this page rather than opening a duplicate.
      const existing = tabs.find((t) => t.page === page);
      if (existing) {
        set({ activeTabId: existing.id });
        return existing.id;
      }
      const tab = makeTab(page);
      set({ tabs: [...tabs, tab], activeTabId: tab.id });
      void get().savePersistedTabs();
      return tab.id;
    },

    closeTab: (tabId) => {
      const { tabs, activeTabId, closedTabs } = get();
      const index = tabs.findIndex((t) => t.id === tabId);
      if (index === -1) return;

      const closing = tabs[index];
      const newClosed = [closing, ...closedTabs].slice(0, 10);
      const newTabs = tabs.filter((t) => t.id !== tabId);

      // Never leave the strip empty — fall back to a fresh Home tab.
      if (newTabs.length === 0) {
        const home = makeTab("home");
        set({ tabs: [home], activeTabId: home.id, closedTabs: newClosed });
        void get().savePersistedTabs();
        return;
      }

      if (activeTabId === tabId) {
        const nextActive = newTabs[Math.max(0, index - 1)];
        set({ tabs: newTabs, activeTabId: nextActive.id, closedTabs: newClosed });
      } else {
        set({ tabs: newTabs, closedTabs: newClosed });
      }
      void get().savePersistedTabs();
    },

    closeOtherTabs: (tabId) => {
      const { tabs, closedTabs } = get();
      const keep = tabs.find((t) => t.id === tabId);
      if (!keep) return;
      const newClosed = [
        ...tabs.filter((t) => t.id !== tabId),
        ...closedTabs,
      ].slice(0, 10);
      set({ tabs: [keep], activeTabId: tabId, closedTabs: newClosed });
      void get().savePersistedTabs();
    },

    setActiveTab: (tabId) => {
      if (get().activeTabId === tabId) return;
      set({ activeTabId: tabId });
    },

    reorderTabs: (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;
      set((s) => {
        const tabs = [...s.tabs];
        const [moved] = tabs.splice(fromIndex, 1);
        tabs.splice(toIndex, 0, moved);
        return { tabs };
      });
      void get().savePersistedTabs();
    },

    reopenClosedTab: () => {
      const { closedTabs, tabs } = get();
      if (closedTabs.length === 0) return;
      const [reopen, ...rest] = closedTabs;
      // Focus the page if it's somehow already open, else recreate the tab.
      const existing = tabs.find((t) => t.page === reopen.page);
      if (existing) {
        set({ activeTabId: existing.id, closedTabs: rest });
        return;
      }
      const tab = makeTab(reopen.page);
      set({ tabs: [...tabs, tab], activeTabId: tab.id, closedTabs: rest });
      void get().savePersistedTabs();
    },

    savePersistedTabs: async () => {
      try {
        const { tabs } = get();
        const pages = tabs.map((t) => t.page);
        const store = await load(TABS_STORE_NAME, {
          defaults: {},
          autoSave: true,
        });
        await store.set(PERSISTED_TABS_KEY, pages);
        await store.save();
      } catch (error) {
        logger.error({ err: error }, "[Tabs] Failed to persist tabs");
      }
    },

    restorePersistedTabs: async () => {
      try {
        const store = await load(TABS_STORE_NAME, {
          defaults: {},
          autoSave: false,
        });
        const raw = await store.get<unknown>(PERSISTED_TABS_KEY);
        if (!Array.isArray(raw) || raw.length === 0) return;

        const valid: PageId[] = [
          "home",
          "notes",
          "chat",
          "agent",
          "embeddings",
          "trash",
          "settings",
        ];
        const restored = raw
          .filter((p): p is PageId => typeof p === "string" && valid.includes(p as PageId))
          .map((p) => makeTab(p));

        if (restored.length > 0) {
          set({ tabs: restored, activeTabId: restored[0].id });
        }
      } catch (error) {
        logger.error({ err: error }, "[Tabs] Failed to restore tabs");
      }
    },
  };
});
