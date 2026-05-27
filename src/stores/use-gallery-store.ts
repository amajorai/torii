import { create } from "zustand";

export interface GalleryFile {
  id: string;
  path: string;
  name: string;
  folderId: string | null;
  addedAt: number;
}

export interface GalleryFolder {
  id: string;
  name: string;
  sortOrder: number;
}

interface GalleryStore {
  files: GalleryFile[];
  folders: GalleryFolder[];
  addFiles: (paths: string[]) => void;
  removeFiles: (ids: Set<string>) => void;
  addFolder: (name: string) => GalleryFolder;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFilesToFolder: (fileIds: Set<string>, folderId: string | null) => void;
}

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  files: [],
  folders: [],

  addFiles: (paths) => {
    const incoming: GalleryFile[] = paths.map((path) => ({
      id: crypto.randomUUID(),
      path,
      name: path.split(/[\\/]/).pop() ?? path,
      folderId: null,
      addedAt: Date.now(),
    }));
    set((s) => ({ files: [...s.files, ...incoming] }));
  },

  removeFiles: (ids) => {
    set((s) => ({ files: s.files.filter((f) => !ids.has(f.id)) }));
  },

  addFolder: (name) => {
    const folder: GalleryFolder = {
      id: crypto.randomUUID(),
      name,
      sortOrder: get().folders.length,
    };
    set((s) => ({ folders: [...s.folders, folder] }));
    return folder;
  },

  renameFolder: (id, name) => {
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
  },

  deleteFolder: (id) => {
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      files: s.files.map((f) => (f.folderId === id ? { ...f, folderId: null } : f)),
    }));
  },

  moveFilesToFolder: (fileIds, folderId) => {
    set((s) => ({
      files: s.files.map((f) => (fileIds.has(f.id) ? { ...f, folderId } : f)),
    }));
  },
}));
