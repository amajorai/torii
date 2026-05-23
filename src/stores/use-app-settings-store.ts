import { load } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { logger } from "@/lib/logger";

const SETTINGS_STORE_NAME = "settings.json";
const THEME_FIELD = "app_theme";
const AUTO_CHECK_FOR_UPDATES_FIELD = "auto_check_for_updates";
const ANALYTICS_ENABLED_FIELD = "analytics_enabled";
const LOGGING_ENABLED_FIELD = "logging_enabled";
const REMEMBER_WINDOW_BOUNDS_FIELD = "remember_window_bounds";
const ONBOARDING_COMPLETED_FIELD = "onboarding_completed";
const EXPERIMENTAL_FEATURES_FIELD = "experimental_features_enabled";
const SOUNDS_ENABLED_FIELD = "sounds_enabled";

export type AppTheme = "light" | "dark" | "system";

interface AppSettingsState {
  theme: AppTheme;
  autoCheckForUpdates: boolean;
  analyticsEnabled: boolean;
  loggingEnabled: boolean;
  rememberWindowBounds: boolean;
  onboardingCompleted: boolean;
  experimentalFeaturesEnabled: boolean;
  soundsEnabled: boolean;
  isInitialLoadDone: boolean;

  // Actions
  setTheme: (theme: AppTheme) => Promise<void>;
  setAutoCheckForUpdates: (enabled: boolean) => Promise<void>;
  setAnalyticsEnabled: (enabled: boolean) => Promise<void>;
  setLoggingEnabled: (enabled: boolean) => Promise<void>;
  setRememberWindowBounds: (enabled: boolean) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  setExperimentalFeaturesEnabled: (enabled: boolean) => Promise<void>;
  setSoundsEnabled: (enabled: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useAppSettingsStore = create<AppSettingsState>()((set, _get) => ({
  theme: "dark",
  autoCheckForUpdates: true,
  analyticsEnabled: true,
  loggingEnabled: true,
  rememberWindowBounds: false,
  onboardingCompleted: false,
  experimentalFeaturesEnabled: false,
  soundsEnabled: true,
  isInitialLoadDone: false,

  setTheme: async (theme: AppTheme) => {
    try {
      const store = await load(SETTINGS_STORE_NAME, {
        defaults: {},
        autoSave: true,
      });
      await store.set(THEME_FIELD, theme);
      await store.save();
      set({ theme });

      // Update DOM immediately
      if (theme === "system") {
        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        document.documentElement.classList.toggle("dark", isDark);
      } else {
        document.documentElement.classList.toggle("dark", theme === "dark");
      }
    } catch (error) {
      logger.error({ err: error }, "[Settings] Failed to save setting: theme");
    }
  },

  setAutoCheckForUpdates: async (enabled: boolean) => {
    try {
      const store = await load(SETTINGS_STORE_NAME, {
        defaults: {},
        autoSave: true,
      });
      await store.set(AUTO_CHECK_FOR_UPDATES_FIELD, enabled);
      await store.save();
      set({ autoCheckForUpdates: enabled });
    } catch (error) {
      logger.error(
        { err: error },
        "[Settings] Failed to save setting: autoCheckForUpdates"
      );
    }
  },

  setAnalyticsEnabled: async (enabled: boolean) => {
    try {
      const store = await load(SETTINGS_STORE_NAME, {
        defaults: {},
        autoSave: true,
      });
      await store.set(ANALYTICS_ENABLED_FIELD, enabled);
      await store.save();
      set({ analyticsEnabled: enabled });
    } catch (error) {
      logger.error(
        { err: error },
        "[Settings] Failed to save setting: analyticsEnabled"
      );
    }
  },

  setLoggingEnabled: async (enabled: boolean) => {
    try {
      const store = await load(SETTINGS_STORE_NAME, {
        defaults: {},
        autoSave: true,
      });
      await store.set(LOGGING_ENABLED_FIELD, enabled);
      await store.save();
      set({ loggingEnabled: enabled });
    } catch (error) {
      logger.error(
        { err: error },
        "[Settings] Failed to save setting: loggingEnabled"
      );
    }
  },

  setRememberWindowBounds: async (enabled: boolean) => {
    try {
      const store = await load(SETTINGS_STORE_NAME, {
        defaults: {},
        autoSave: true,
      });
      await store.set(REMEMBER_WINDOW_BOUNDS_FIELD, enabled);
      await store.save();
      set({ rememberWindowBounds: enabled });
    } catch (error) {
      logger.error(
        { err: error },
        "[Settings] Failed to save setting: rememberWindowBounds"
      );
    }
  },

  setOnboardingCompleted: async (completed: boolean) => {
    try {
      const store = await load(SETTINGS_STORE_NAME, {
        defaults: {},
        autoSave: true,
      });
      await store.set(ONBOARDING_COMPLETED_FIELD, completed);
      await store.save();
      set({ onboardingCompleted: completed });
    } catch (error) {
      logger.error(
        { err: error },
        "[Settings] Failed to save setting: onboardingCompleted"
      );
    }
  },

  setExperimentalFeaturesEnabled: async (enabled: boolean) => {
    try {
      const store = await load(SETTINGS_STORE_NAME, {
        defaults: {},
        autoSave: true,
      });
      await store.set(EXPERIMENTAL_FEATURES_FIELD, enabled);
      await store.save();
      set({ experimentalFeaturesEnabled: enabled });
    } catch (error) {
      logger.error(
        { err: error },
        "[Settings] Failed to save setting: experimentalFeaturesEnabled"
      );
    }
  },

  setSoundsEnabled: async (enabled: boolean) => {
    try {
      const store = await load(SETTINGS_STORE_NAME, {
        defaults: {},
        autoSave: true,
      });
      await store.set(SOUNDS_ENABLED_FIELD, enabled);
      await store.save();
      set({ soundsEnabled: enabled });
    } catch (error) {
      logger.error(
        { err: error },
        "[Settings] Failed to save setting: soundsEnabled"
      );
    }
  },

  loadSettings: async () => {
    try {
      logger.info("[Settings] Loading app settings...");
      const store = await load(SETTINGS_STORE_NAME, {
        defaults: {},
        autoSave: false,
      });
      const theme = await store.get<AppTheme>(THEME_FIELD);
      const autoCheckForUpdates = await store.get<boolean>(
        AUTO_CHECK_FOR_UPDATES_FIELD
      );
      const analyticsEnabled = await store.get<boolean>(
        ANALYTICS_ENABLED_FIELD
      );
      const loggingEnabled = await store.get<boolean>(LOGGING_ENABLED_FIELD);
      const rememberWindowBounds = await store.get<boolean>(
        REMEMBER_WINDOW_BOUNDS_FIELD
      );
      const onboardingCompleted = await store.get<boolean>(
        ONBOARDING_COMPLETED_FIELD
      );
      const experimentalFeaturesEnabled = await store.get<boolean>(
        EXPERIMENTAL_FEATURES_FIELD
      );
      const soundsEnabled = await store.get<boolean>(SOUNDS_ENABLED_FIELD);

      const finalTheme = theme ?? "dark";

      set({
        theme: finalTheme,
        autoCheckForUpdates: autoCheckForUpdates ?? true,
        analyticsEnabled: analyticsEnabled ?? true,
        loggingEnabled: loggingEnabled ?? true,
        rememberWindowBounds: rememberWindowBounds ?? false,
        onboardingCompleted: onboardingCompleted ?? false,
        experimentalFeaturesEnabled: experimentalFeaturesEnabled ?? false,
        soundsEnabled: soundsEnabled ?? true,
        isInitialLoadDone: true,
      });

      // Apply theme to DOM
      if (finalTheme === "system") {
        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        document.documentElement.classList.toggle("dark", isDark);
      } else {
        document.documentElement.classList.toggle(
          "dark",
          finalTheme === "dark"
        );
      }

      logger.info("[Settings] App settings loaded successfully");
    } catch (error) {
      logger.error({ err: error }, "[Settings] Failed to load settings");
      set({ isInitialLoadDone: true });
    }
  },
}));
