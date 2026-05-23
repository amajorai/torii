// ─── Page / Route types ───────────────────────────────────────────────────────

/** Named pages/routes used by the router in App.tsx. Extend this union as you add pages. */
export type Page = "home" | "settings";

// ─── Generic utility types ────────────────────────────────────────────────────

/** Makes all properties in T optional recursively. */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/** Extracts the resolved type of a Promise. */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/** A value that may be null or undefined. */
export type Nullable<T> = T | null | undefined;

/** Makes specific keys of T required while the rest remain as-is. */
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/** Theme options supported across the app. */
export type Theme = "light" | "dark" | "system";
