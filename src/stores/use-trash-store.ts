import { create } from "zustand";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface TrashItem {
  id: string;
  title: string;
  content: string;
  deletedAt: number;
  originalCreatedAt: number;
  originalUpdatedAt: number;
}

interface TrashState {
  trashItems: TrashItem[];
  isLoaded: boolean;

  loadFromDb: () => Promise<void>;
  moveToTrash: (note: { id: string; title: string; content: string; createdAt: number; updatedAt: number }) => Promise<void>;
  restoreFromTrash: (id: string) => Promise<TrashItem | null>;
  deletePermanently: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  cleanupExpired: () => Promise<void>;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const useTrashStore = create<TrashState>()((set, get) => ({
  trashItems: [],
  isLoaded: false,

  loadFromDb: async () => {
    logger.info("[Trash] Loading from DB...");
    try {
      const db = await getDb();
      const rows = await db.select<TrashItem[]>(
        "SELECT id, title, content, deletedAt, originalCreatedAt, originalUpdatedAt FROM trash ORDER BY deletedAt DESC"
      );
      set({ trashItems: rows, isLoaded: true });
      logger.info({ count: rows.length }, "[Trash] Loaded");
      get().cleanupExpired();
    } catch (err) {
      logger.error({ err }, "[Trash] Failed to load");
      set({ isLoaded: true });
    }
  },

  moveToTrash: async (note) => {
    const deletedAt = Date.now();
    const item: TrashItem = {
      id: note.id,
      title: note.title,
      content: note.content,
      deletedAt,
      originalCreatedAt: note.createdAt,
      originalUpdatedAt: note.updatedAt,
    };
    set((s) => ({ trashItems: [item, ...s.trashItems] }));
    try {
      const db = await getDb();
      await db.execute("DELETE FROM notes WHERE id = $1", [note.id]);
      await db.execute(
        "INSERT INTO trash (id, title, content, deletedAt, originalCreatedAt, originalUpdatedAt) VALUES ($1, $2, $3, $4, $5, $6)",
        [note.id, note.title, note.content, deletedAt, note.createdAt, note.updatedAt]
      );
      logger.info({ id: note.id }, "[Trash] Moved to trash");
    } catch (err) {
      logger.error({ err }, "[Trash] Failed to move to trash");
      set((s) => ({ trashItems: s.trashItems.filter((t) => t.id !== note.id) }));
      throw err;
    }
  },

  restoreFromTrash: async (id) => {
    const item = get().trashItems.find((t) => t.id === id);
    if (!item) return null;

    set((s) => ({ trashItems: s.trashItems.filter((t) => t.id !== id) }));
    try {
      const db = await getDb();
      await db.execute(
        "INSERT INTO notes (id, title, content, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5)",
        [item.id, item.title, item.content, item.originalCreatedAt, item.originalUpdatedAt]
      );
      await db.execute("DELETE FROM trash WHERE id = $1", [id]);
      logger.info({ id }, "[Trash] Restored");
    } catch (err) {
      logger.error({ err }, "[Trash] Failed to restore");
      set((s) => ({ trashItems: [item, ...s.trashItems] }));
      throw err;
    }
    return item;
  },

  deletePermanently: async (id) => {
    set((s) => ({ trashItems: s.trashItems.filter((t) => t.id !== id) }));
    try {
      const db = await getDb();
      await db.execute("DELETE FROM trash WHERE id = $1", [id]);
      logger.info({ id }, "[Trash] Permanently deleted");
    } catch (err) {
      logger.error({ err }, "[Trash] Failed to delete permanently");
    }
  },

  emptyTrash: async () => {
    set({ trashItems: [] });
    try {
      const db = await getDb();
      await db.execute("DELETE FROM trash");
      logger.info("[Trash] Emptied");
    } catch (err) {
      logger.error({ err }, "[Trash] Failed to empty");
    }
  },

  cleanupExpired: async () => {
    const now = Date.now();
    const cutoff = now - THIRTY_DAYS_MS;
    const expired = get().trashItems.filter((t) => t.deletedAt < cutoff);
    if (expired.length === 0) return;

    logger.info({ count: expired.length }, "[Trash] Cleaning up expired items");
    const expiredIds = new Set(expired.map((t) => t.id));
    set((s) => ({ trashItems: s.trashItems.filter((t) => !expiredIds.has(t.id)) }));

    try {
      const db = await getDb();
      await db.execute("DELETE FROM trash WHERE deletedAt < $1", [cutoff]);
      logger.info("[Trash] Cleanup complete");
    } catch (err) {
      logger.error({ err }, "[Trash] Failed to cleanup expired");
    }
  },
}));
