import { create } from "zustand";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface ArchiveFolder {
  id: string;
  name: string;
  createdAt: number;
  sortOrder: number;
  color: string | null;
}

interface ArchiveState {
  folders: ArchiveFolder[];
  isLoaded: boolean;

  loadFromDb: () => Promise<void>;
  createFolder: (name: string, color?: string | null) => Promise<ArchiveFolder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  updateFolderColor: (id: string, color: string | null) => Promise<void>;
}

export const useArchiveStore = create<ArchiveState>()((set, get) => ({
  folders: [],
  isLoaded: false,

  loadFromDb: async () => {
    logger.info("[Archive] Loading folders from DB...");
    try {
      const db = await getDb();
      const rows = await db.select<ArchiveFolder[]>(
        "SELECT id, name, createdAt, sortOrder, color FROM archive_folders ORDER BY sortOrder ASC, createdAt ASC"
      );
      set({ folders: rows, isLoaded: true });
      logger.info({ count: rows.length }, "[Archive] Loaded folders");
    } catch (err) {
      logger.error({ err }, "[Archive] Failed to load folders");
      set({ isLoaded: true });
    }
  },

  createFolder: async (name, color = null) => {
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const sortOrder = get().folders.length;
    const folder: ArchiveFolder = { id, name, createdAt, sortOrder, color };
    set((s) => ({ folders: [...s.folders, folder] }));
    try {
      const db = await getDb();
      await db.execute(
        "INSERT INTO archive_folders (id, name, createdAt, sortOrder, color) VALUES ($1, $2, $3, $4, $5)",
        [id, name, createdAt, sortOrder, color]
      );
      logger.info({ id, name }, "[Archive] Folder created");
    } catch (err) {
      logger.error({ err }, "[Archive] Failed to create folder");
      set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }));
      throw err;
    }
    return folder;
  },

  renameFolder: async (id, name) => {
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
    try {
      const db = await getDb();
      await db.execute("UPDATE archive_folders SET name = $1 WHERE id = $2", [name, id]);
      logger.info({ id, name }, "[Archive] Folder renamed");
    } catch (err) {
      logger.error({ err }, "[Archive] Failed to rename folder");
    }
  },

  deleteFolder: async (id) => {
    const prev = get().folders;
    set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }));
    try {
      const db = await getDb();
      await db.execute(
        "UPDATE notes SET archiveFolderId = NULL WHERE archiveFolderId = $1",
        [id]
      );
      await db.execute("DELETE FROM archive_folders WHERE id = $1", [id]);
      logger.info({ id }, "[Archive] Folder deleted");
    } catch (err) {
      logger.error({ err }, "[Archive] Failed to delete folder");
      set({ folders: prev });
    }
  },

  updateFolderColor: async (id, color) => {
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, color } : f)),
    }));
    try {
      const db = await getDb();
      await db.execute("UPDATE archive_folders SET color = $1 WHERE id = $2", [color, id]);
      logger.info({ id, color }, "[Archive] Folder color updated");
    } catch (err) {
      logger.error({ err }, "[Archive] Failed to update folder color");
    }
  },
}));
