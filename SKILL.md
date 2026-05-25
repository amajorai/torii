---
name: tauri-app-boilerplate
description: Scaffold a production-ready Tauri v2 + React desktop app with Polar licensing, AES-256-GCM secure storage, SQLite migration pipeline, license-gated auto-updater, PostHog/Axiom analytics, onboarding flow, custom titlebar, and settings page. Use this skill when the user wants to build a new Tauri desktop app or add any of these infrastructure pieces to an existing one.
license: MIT
compatibility:
  - tauri@2
  - react@19
  - bun
---

# Tauri App Boilerplate

Reference implementation: [github.com/amajorai/torii](https://github.com/amajorai/torii)

Clone Torii as a starting point, or follow the patterns below to add individual pieces to an existing Tauri v2 app.

---

## 1. Project setup

```bash
git clone https://github.com/amajorai/torii.git my-app
cd my-app
bun install
```

Rename the app in three places:
- `src-tauri/Cargo.toml` — `name` and `[lib] name`
- `src-tauri/tauri.conf.json` — `productName`, `identifier`, window `title`
- `package.json` — `name`

Required env vars (copy `.env.example` to `.env`):
```
VITE_POLAR_API_URL
VITE_POLAR_ORGANIZATION_ID
VITE_POLAR_ORG_SLUG
VITE_POLAR_CUSTOMER_PORTAL_URL
VITE_POLAR_PURCHASE_URL
VITE_POSTHOG_KEY          # optional
VITE_POSTHOG_HOST         # optional
VITE_AXIOM_TOKEN          # optional
VITE_AXIOM_DATASET        # optional
```

---

## 2. App launch flow

`App.tsx` enforces this order on startup:

1. Load persisted settings (`loadSettings`) and validate stored license (`loadStoredLicense`) in parallel.
2. Show spinner until both complete.
3. If license invalid → `<LicenseActivation />` (blocks entire UI).
4. If onboarding not done → `<OnboardingPage onComplete={...} />`.
5. Otherwise render the main shell.

Never skip the license gate. The `VersionGateModal` also runs inside the main shell to block launch when the user is running a version released after their `expiresAt` date.

---

## 3. Polar licensing

Key files: `src/stores/use-license-store.ts`, `src/components/LicenseActivation.tsx`, `src/hooks/use-polar-checkout.ts`

The flow:
- User enters a license key → POST to your Polar server endpoint to validate and activate the device.
- On success, store the key + `expiresAt` + `deviceId` in Tauri plugin-stronghold (encrypted).
- On subsequent launches, load the stored key and re-validate against Polar (offline grace: 30 days since last successful check).
- Expose `isValidated`, `isValidating`, `licenseInfo` from the store.

The license store also tracks `expiresAt` — the auto-updater uses this to filter which GitHub releases to offer.

---

## 4. AES-256-GCM secure storage

Key files: `src-tauri/src/secure_storage.rs`, `src/lib/secure-storage.ts`

Rust side registers two Tauri commands: `secure_storage_get` and `secure_storage_set`. Each call derives an AES-256-GCM key from the device using SHA-256, encrypts/decrypts the value, and stores ciphertext in the app data directory.

Frontend wrapper (TypeScript):
```typescript
import { invoke } from "@tauri-apps/api/core";

export const secureGet = (key: string): Promise<string | null> =>
  invoke("secure_storage_get", { key });

export const secureSet = (key: string, value: string): Promise<void> =>
  invoke("secure_storage_set", { key, value });
```

Use this for API keys, tokens, and anything that must survive app reinstalls but must not be readable from disk.

---

## 5. SQLite migration pipeline

Key file: `src/lib/db.ts`

Pattern — use `PRAGMA user_version` (never try-catch ALTER TABLE in new migrations):

```typescript
const TARGET_SCHEMA_VERSION = 1;

const MIGRATIONS: Record<number, (db: Database) => void> = {
  0: (db) => {
    db.execute(`CREATE TABLE IF NOT EXISTS example (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    )`);
  },
};

export async function initDb(): Promise<Database> {
  const db = await Database.load("sqlite:app.db");
  const [{ user_version }] = await db.select<[{ user_version: number }]>(
    "PRAGMA user_version"
  );
  let version = user_version;
  while (version < TARGET_SCHEMA_VERSION) {
    await MIGRATIONS[version](db);
    version++;
    await db.execute(`PRAGMA user_version = ${version}`);
  }
  return db;
}
```

To add a table: increment `TARGET_SCHEMA_VERSION`, add a migration function at the old version key. The pipeline runs sequentially on startup.

Use `safeAddColumn` for any `ADD COLUMN` operation — it catches "duplicate column name" for users upgrading from pre-versioned installs where `user_version = 0` but columns already exist.

---

## 6. Auto-updater with license expiry gate

Key file: `src/hooks/use-app-updater.ts`

The updater:
1. Fetches GitHub releases via the Tauri updater plugin endpoint.
2. Filters releases to only those with `published_at <= licenseInfo.expiresAt`.
3. Offers the highest eligible version.
4. If the running version was released after `expiresAt`, `VersionGateModal` blocks the app with a link to the last entitled release.

Setup:
```bash
bun tauri signer generate  # outputs keypair
```

In `tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "pubkey": "<your-public-key>",
      "endpoints": [
        "https://github.com/YOUR_ORG/YOUR_REPO/releases/latest/download/latest.json"
      ]
    }
  }
}
```

Set `TAURI_SIGNING_PRIVATE_KEY` in CI for signing release bundles.

---

## 7. Analytics

Key files: `src/lib/posthog.ts`, `src/lib/logger.ts`

PostHog init (call once at app start, respects `analyticsEnabled` from settings store):
```typescript
import posthog from "posthog-js";

export function initAnalytics(enabled: boolean) {
  if (!enabled || !import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://app.posthog.com",
    capture_pageview: false,
  });
}
```

Axiom log shipping via Pino transport — instantiated in `logger.ts`. Only active when `VITE_AXIOM_TOKEN` is set. Use `logger.info(...)`, `logger.error(...)` throughout the app.

---

## 8. Custom titlebar

Key files: `src/components/TitleBar.tsx`, `src-tauri/src/lib.rs`

Tauri is configured with `decorations: false` and `transparent: true`. The `tauri-plugin-decorum` crate draws the native overlay traffic-light buttons on macOS; Windows gets custom close/min/max buttons.

`TitleBar` accepts an `actions?: ReactNode` prop for injecting buttons on the right side (e.g., a settings gear).

The drag region is set via `data-tauri-drag-region` on the titlebar container div.

---

## 9. Onboarding

Key file: `src/components/OnboardingPage.tsx`

A 4-step flow gated by `onboardingCompleted` in the settings store. Steps: welcome → appearance (theme picker) → privacy (analytics toggle) → done. Slide animations between steps via inline CSS keyframes keyed to direction.

To add a step: add to the `STEPS` array and add a corresponding step component.

---

## 10. Settings page

Key file: `src/components/SettingsPage.tsx`

Tabbed settings with tabs: General, License, Storage, Updates, Privacy. Uses the shadcn-compatible UI components in `src/components/ui/`.

To add a setting:
1. Add the field to `use-app-settings-store.ts` with a setter that calls `saveSettings()`.
2. Add a control in the relevant `SettingsPage` tab.

---

## 11. Schema versioning for persistent data

Every JSON file written to disk (layer data, recovery files, backup manifests) must carry `schemaVersion: number`. Read through a migration pipeline:

```typescript
const MIGRATIONS = {
  1: migrateV1ToV2,
} as const;

function migrate<T>(data: { schemaVersion: number } & Record<string, unknown>): T {
  let current = data;
  while (current.schemaVersion in MIGRATIONS) {
    current = MIGRATIONS[current.schemaVersion as keyof typeof MIGRATIONS](current);
  }
  return current as T;
}
```

Never remove or rename fields — only add optional fields with backwards-compatible defaults.

---

## 12. CI/CD

`.github/workflows/ci.yml` builds on Linux, macOS, and Windows on every push using `bunx tauri build --no-bundle` (no signing keys required for CI).

For release builds, add a separate workflow that sets `TAURI_SIGNING_PRIVATE_KEY` and runs `bunx tauri build` with bundling enabled.
