import { create } from "zustand";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
  archiveFolderId: string | null;
}

interface NotesState {
  notes: Note[];
  isLoaded: boolean;

  loadFromDb: () => Promise<void>;
  createNote: (title: string, content?: string) => Promise<Note>;
  updateNote: (id: string, title: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  archiveNote: (id: string, folderId?: string | null) => Promise<void>;
  unarchiveNote: (id: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: [],
  isLoaded: false,

  loadFromDb: async () => {
    logger.info("[Notes] Loading from DB...");
    try {
      const db = await getDb();
      const rows = await db.select<Note[]>(
        "SELECT id, title, content, createdAt, updatedAt, archivedAt, archiveFolderId FROM notes ORDER BY updatedAt DESC"
      );
      set({ notes: rows, isLoaded: true });
      logger.info({ count: rows.length }, "[Notes] Loaded");
    } catch (err) {
      logger.error({ err }, "[Notes] Failed to load");
      set({ isLoaded: true });
    }
  },

  createNote: async (title, content = "") => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const note: Note = {
      id,
      title,
      content,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      archiveFolderId: null,
    };
    set((s) => ({ notes: [note, ...s.notes] }));
    try {
      const db = await getDb();
      await db.execute(
        "INSERT INTO notes (id, title, content, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5)",
        [id, title, content, now, now]
      );
      logger.info({ id, title }, "[Notes] Created");
    } catch (err) {
      logger.error({ err }, "[Notes] Failed to create");
      set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
      throw err;
    }
    return note;
  },

  updateNote: async (id, title, content) => {
    const updatedAt = Date.now();
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, title, content, updatedAt } : n)),
    }));
    try {
      const db = await getDb();
      await db.execute(
        "UPDATE notes SET title = $1, content = $2, updatedAt = $3 WHERE id = $4",
        [title, content, updatedAt, id]
      );
      logger.info({ id }, "[Notes] Updated");
    } catch (err) {
      logger.error({ err }, "[Notes] Failed to update");
      throw err;
    }
  },

  deleteNote: async (id) => {
    const prev = get().notes;
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    try {
      const db = await getDb();
      await db.execute("DELETE FROM notes WHERE id = $1", [id]);
      logger.info({ id }, "[Notes] Deleted");
    } catch (err) {
      logger.error({ err }, "[Notes] Failed to delete");
      set({ notes: prev });
      throw err;
    }
  },

  archiveNote: async (id, folderId = null) => {
    const archivedAt = Date.now();
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, archivedAt, archiveFolderId: folderId } : n
      ),
    }));
    try {
      const db = await getDb();
      await db.execute(
        "UPDATE notes SET archivedAt = $1, archiveFolderId = $2 WHERE id = $3",
        [archivedAt, folderId, id]
      );
      logger.info({ id }, "[Notes] Archived");
    } catch (err) {
      logger.error({ err }, "[Notes] Failed to archive");
      throw err;
    }
  },

  unarchiveNote: async (id) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, archivedAt: null, archiveFolderId: null } : n
      ),
    }));
    try {
      const db = await getDb();
      await db.execute(
        "UPDATE notes SET archivedAt = NULL, archiveFolderId = NULL WHERE id = $1",
        [id]
      );
      logger.info({ id }, "[Notes] Unarchived");
    } catch (err) {
      logger.error({ err }, "[Notes] Failed to unarchive");
      throw err;
    }
  },
}));
