# Torii ⛩️

A production-ready Tauri v2 + React 19 desktop app shell with licensing, analytics, auto-updates, and secure storage baked in.

[![Stars](https://shieldcn.dev/github/stars/amajorai/torii.svg)](https://github.com/amajorai/torii)
[![Forks](https://shieldcn.dev/github/forks/amajorai/torii.svg)](https://github.com/amajorai/torii)
[![License](https://shieldcn.dev/github/license/amajorai/torii.svg)](https://github.com/amajorai/torii)
[![Issues](https://shieldcn.dev/github/issues/amajorai/torii.svg)](https://github.com/amajorai/torii/issues)
[![Release](https://shieldcn.dev/github/release/amajorai/torii.svg)](https://github.com/amajorai/torii/releases)

[![CI](https://shieldcn.dev/github/ci/amajorai/torii.svg?mode=light)](https://github.com/amajorai/torii/actions)
[![Windows](https://shieldcn.dev/badge/Windows-Download-blue.svg?logo=ri:FaWindows)](https://github.com/amajorai/torii/releases/latest)
[![macOS](https://shieldcn.dev/badge/macOS-Download-black.svg?logo=apple)](https://github.com/amajorai/torii/releases/latest)
[![Linux](https://shieldcn.dev/badge/Linux-Download-orange.svg?logo=linux)](https://github.com/amajorai/torii/releases/latest)

## Built from Backstage

Backstage is a desktop app for AI-powered content creation — carousel generation, image editing, and YouTube analytics. After shipping it with a full licensing system, encrypted storage, SQLite migrations, and license-gated auto-updates, every new Tauri project needed the same plumbing rebuilt from scratch.

Torii is the extracted boilerplate. Everything that was painful to get right the first time — the Polar license flow, device activation, AES-256-GCM key storage, the migration pipeline, the version gate, onboarding — lives here so it never has to be rebuilt again.

[github.com/amajorai/backstage](https://github.com/amajorai/backstage)

## Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Zustand, Vite
- **Backend**: Tauri v2 (Rust), SQLite via plugin-sql
- **Licensing**: Polar (license key validation with offline cache)
- **Analytics**: PostHog + optional Axiom log shipping
- **Updates**: GitHub Releases auto-updater with license expiry gate
- **Storage**: AES-256-GCM encrypted key-value store (Rust), Tauri plugin-store (JSON)

## What's included

### Theme

- Light / dark / system theme with `ThemeProvider` (`src/components/theme-provider.tsx`)
- Theme selection persisted to Tauri plugin-store
- System theme resolves via `prefers-color-scheme`; switches live without reload
- Theme synced to UserJot feedback widget on change

### Drag-and-drop file zone

- OS-level file drop via `tauri://drag-drop` event in `HomePage.tsx`
- Animated overlay (blue dashed border + bounce icon) on drag-enter
- Dropped files stored with UUID + parsed path; grid display
- File picker fallback via Tauri dialog

### Zone drag-select

`src/hooks/use-drag-selection.ts` — draw a rubber-band rectangle to multi-select items.

- Renders a live selection box overlay during drag
- Detects items by `data-*` attribute intersection
- Modifier keys: Shift / Ctrl / Cmd preserve existing selection; plain drag clears it
- Respects scrolling containers
- Callbacks: `onSelectionChange(ids)`, `onEnableSelectionMode`, `onClearSelection`

```ts
useDragSelection({
  dataAttribute: 'data-file-id',
  onSelectionChange: (ids) => setSelected(ids),
  onEnableSelectionMode: () => setSelectionMode(true),
  onClearSelection: () => setSelected([]),
  isSelectionMode,
})
```

### Licensing (Polar)

- License key entry UI with inline validation (`LicenseActivation.tsx`)
- Device activation via Polar `/v1/customer-portal/license-keys/activate`
- 30-day offline cache — app works without internet after last validation
- `LicenseAuthError` for definitive failures (revoked/missing); transient errors fall back to cache
- Deactivation flow with customer portal link (`CustomerPortalDialog.tsx`)
- License state in `use-license-store.ts`, persisted to `license.json`

### Version gate

`VersionGateModal.tsx` — blocks launch when the running version falls outside the license entitlement window. Prompts to update or manage the license.

### Onboarding wizard

4-step flow (`OnboardingPage.tsx`): welcome → appearance → privacy → done. Mirrors the Backstage onboarding design. Shown once; flag stored in settings store.

### Auto-updater

`src/hooks/use-app-updater.ts`

- Checks GitHub Releases on startup (configurable)
- Download + install with progress tracking
- License expiry gate: blocks update if license has expired
- Update available state surfaced in Settings → Updates tab

### Settings

Tabbed settings page (`SettingsPage.tsx`) with five tabs:

| Tab | Contents |
|-----|----------|
| **General** | Theme selector, launch at startup, sounds toggle, experimental features |
| **License** | Key display, validation status, deactivate, customer portal |
| **Storage** | Export backup (ZIP), import backup, wipe app data |
| **Updates** | Check for updates, auto-check toggle, current version |
| **Privacy** | Analytics toggle, logging toggle |

### Secure storage

`src/lib/secure-storage.ts` — wrappers around Rust AES-256-GCM commands (`src-tauri/src/secure_storage.rs`). Encrypted key-value store keyed to the device. Use for secrets (API keys, tokens) that must not sit in plaintext.

### SQLite + migrations

`src/lib/db.ts` — SQLite opened via Tauri plugin-sql with a versioned migration pipeline. Bump `TARGET_SCHEMA_VERSION` and add a migration function; the pipeline runs automatically on startup.

### Sound effects

`src/lib/sounds.ts` — 11 procedural sounds synthesised with the Web Audio API (no audio files):

`click` · `success` · `error` · `dialog-open` · `dialog-close` · `switch-on` · `switch-off` · `download` · `delete` · `select` · `hover`

All sounds respect the sounds toggle in Settings → General.

### Window bounds persistence

`src/hooks/use-window-bounds.ts` — saves and restores window position and size across launches. Controlled by the "Remember window size and position" setting.

### UserJot feedback widget

Integrated in `SettingsPage.tsx`. Surfaces a feedback button that opens the UserJot panel.

- Set `VITE_USERJOT_ID` in `.env` — the widget script loads automatically; leave it empty to disable
- Theme synced to the widget on every theme change (`uj.setTheme(resolved)`)
- Triggered via `uj.showWidget()`

### Logging

`src/lib/logger.ts` — Pino logger with optional Axiom transport. Set `VITE_AXIOM_TOKEN` + `VITE_AXIOM_DATASET` to ship logs to Axiom. Logging can be disabled from Settings → Privacy.

### Analytics

`src/lib/posthog.ts` — PostHog initialisation and capture helpers. Set `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST`. Analytics can be disabled from Settings → Privacy.

### UI component library

`src/components/ui/` — built on `@base-ui/react` + `lucide-react`:

| Component | Notes |
|-----------|-------|
| `button.tsx` | CVA variants: default, outline, secondary, ghost, destructive, link, contrast; sizes: xs, sm, default, lg, icon, icon-sm, icon-xs, icon-lg |
| `dialog.tsx` | Portal modal with header, footer, title, description subcomponents and close button |
| `input.tsx` | Text input with focus ring |
| `select.tsx` | Dropdown with portal, scroll buttons, item indicators, groups, separators |
| `switch.tsx` | Toggle switch; sizes: sm, default |
| `tooltip.tsx` | Positioned tooltip with arrow; configurable side, align, delay |
| `resizable-panel.tsx` | Draggable panel resize with min/max width constraints |
| `sonner.tsx` | Toast notifications (sileo) with theme support |

### Hooks

| Hook | Purpose |
|------|---------|
| `use-app-updater.ts` | Update check, download, install, version gate |
| `use-window-bounds.ts` | Persist/restore window size and position |
| `use-drag-selection.ts` | Zone rubber-band selection |
| `use-polar-checkout.ts` | Polar embedded checkout initialisation |
| `use-mobile.ts` | Responsive breakpoint detection (768 px) |
| `use-as-ref.ts` | Ref syncing utility |
| `use-lazy-ref.ts` | Lazy ref initialisation |
| `use-isomorphic-layout-effect.ts` | SSR-safe layout effect |

### Stores

| Store | Contents |
|-------|----------|
| `use-app-settings-store.ts` | Theme, autostart, auto-update check, analytics, logging, sounds, window bounds, onboarding flag, experimental features — persisted to `settings.json` |
| `use-license-store.ts` | License key, validation state, Polar response cache, error — persisted to `license.json` |

### Lib utilities

| Utility | Purpose |
|---------|---------|
| `db.ts` | SQLite migration pipeline |
| `secure-storage.ts` | AES-256-GCM Rust command wrappers |
| `sounds.ts` | Web Audio procedural sound effects |
| `logger.ts` | Pino + Axiom logging |
| `posthog.ts` | Analytics init and capture |
| `polar-config.ts` | Polar env var config object |
| `github-releases.ts` | Release fetching, semver compare, entitlement window check |
| `schema-migration.ts` | JSON data versioning pipeline |
| `fs-utils.ts` | Directory creation, data URL helpers |
| `utils.ts` | `cn()` Tailwind class merging |
| `compose-refs.ts` | React ref composition |
| `as-child.ts` | `asChild` pattern for component composition |

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Bun](https://bun.sh/)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform

## Getting started

```bash
bun install
cp .env.example .env
# fill in .env values (see Configuration below)
bun run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Tauri dev (hot reload) |
| `bun run vite:dev` | Frontend only (no Tauri) |
| `bun run desktop:build` | Production Tauri build |
| `bun run typecheck` | TypeScript check |

## Configuration

Copy `.env.example` to `.env` and fill in:

```
VITE_POLAR_API_URL          # https://api.polar.sh (or sandbox)
VITE_POLAR_ORGANIZATION_ID  # from polar.sh dashboard
VITE_POLAR_ORG_SLUG         # your org slug
VITE_POLAR_CUSTOMER_PORTAL_URL
VITE_POLAR_PURCHASE_URL     # your product page

VITE_USERJOT_ID             # optional, for feedback widget

VITE_AXIOM_TOKEN            # optional, for log shipping
VITE_AXIOM_DATASET          # optional

VITE_POSTHOG_KEY            # optional, for analytics
VITE_POSTHOG_HOST           # optional
```

## Renaming the app

Three places to update:

1. `src-tauri/Cargo.toml` — `name` and `[lib] name`
2. `src-tauri/tauri.conf.json` — `productName`, `identifier`, window `title`
3. `package.json` — `name`

## Auto-updater setup

The updater pulls from a GitHub Releases endpoint. After renaming:

1. Set `endpoints` in `tauri.conf.json` to your repo's release URL:
   ```
   https://github.com/YOUR_ORG/YOUR_REPO/releases/latest/download/latest.json
   ```

2. Generate a signing keypair (run once, store the output safely):
   ```bash
   bunx tauri signer generate -w ~/.keys/my-app.key -p "" --ci
   ```
   This writes two files:
   - `~/.keys/my-app.key` — private key (never commit this)
   - `~/.keys/my-app.key.pub` — public key (safe to read, goes in config)

3. Copy the public key into `tauri.conf.json`:
   ```json
   "plugins": {
     "updater": {
       "pubkey": "<contents of my-app.key.pub>"
     }
   }
   ```

4. Add the private key as a GitHub Actions secret:
   ```bash
   gh secret set TAURI_SIGNING_PRIVATE_KEY --repo YOUR_ORG/YOUR_REPO \
     --body "$(cat ~/.keys/my-app.key)"
   ```
   Leave `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` unset if you used `-p ""`.

## Project structure

```
src/
  App.tsx                  # Root: license gate, page routing, shell
  components/
    TitleBar.tsx           # Custom window chrome (draggable, close/min/max)
    SettingsPage.tsx       # General / License / Storage / Updates / Privacy tabs
    LicenseActivation.tsx  # Polar license key entry
    OnboardingPage.tsx     # 4-step onboarding (welcome, appearance, privacy, done)
    VersionGateModal.tsx   # Blocks launch when running past license expiry
    CustomerPortalDialog.tsx
    theme-provider.tsx     # next-themes wrapper
    HomePage.tsx           # Drag-drop file zone with zone drag-select
    ui/                    # 8-component library
  stores/
    use-app-settings-store.ts  # Theme, autostart, update prefs, analytics toggle
    use-license-store.ts       # Polar validation, offline cache, device activation
  hooks/
    use-app-updater.ts     # GitHub releases check + license expiry gate
    use-window-bounds.ts   # Persist/restore window size and position
    use-drag-selection.ts  # Zone rubber-band multi-select
    use-polar-checkout.ts  # Embedded Polar checkout
    use-mobile.ts          # Responsive breakpoint detection
  lib/
    db.ts                  # SQLite migration pipeline (add tables here)
    polar-config.ts        # Polar env var config
    posthog.ts             # Analytics init
    logger.ts              # Pino + optional Axiom transport
    schema-migration.ts    # JSON file versioning pipeline
    secure-storage.ts      # Wrappers for Rust AES-256-GCM commands
    sounds.ts              # 11 procedural Web Audio sound effects
    github-releases.ts     # Release fetching and semver compare
    fs-utils.ts            # Directory creation, data URL helpers
    utils.ts               # cn() Tailwind class merge
src-tauri/src/
  lib.rs                   # Tauri plugins, window setup, command registration
  secure_storage.rs        # AES-256-GCM encrypted key-value store
```

## Adding features

### Add a page
1. Extend the `Page` type in `App.tsx`
2. Add a route in the `App` render
3. Add navigation (e.g., a button in TitleBar `actions`)

### Add a database table
Add a migration in `src/lib/db.ts`. Bump `TARGET_SCHEMA_VERSION` and add a migration function. The pipeline runs automatically on startup.

### Add a secure stored value
Call the Tauri commands via the wrappers in `src/lib/secure-storage.ts` (or add wrappers following the same pattern). Data is encrypted with AES-256-GCM keyed to the device.

### Add settings
Add fields to `use-app-settings-store.ts`. The store auto-persists to Tauri plugin-store on every setter call.

## Star History

<a href="https://www.star-history.com/#amajorai/torii&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=amajorai/torii&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=amajorai/torii&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=amajorai/torii&type=Date" />
 </picture>
</a>
