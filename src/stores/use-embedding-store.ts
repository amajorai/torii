import { create } from "zustand";
import { embedText } from "@/lib/gemini-embedding";
import { getGeminiApiKey } from "@/lib/gemini-store";
import { logger } from "@/lib/logger";
import {
  deleteEmbedding,
  getEmbeddedRecordIds,
  getEmbeddingStats,
  markEmbeddingFailed,
  searchSimilarEmbeddings,
  storeEmbedding,
} from "@/lib/semantic-search";

const CONCURRENCY = 3;

interface EmbeddingProgress {
  current: number;
  total: number;
  failed: number;
}

interface EmbeddingState {
  isEmbedding: boolean;
  progress: EmbeddingProgress;
  embeddedIds: Set<string>;
  stats: { embedded: number; failed: number } | null;

  loadEmbeddedIds: () => Promise<void>;
  loadStats: () => Promise<void>;

  embedSingle: (recordId: string, text: string) => Promise<string | null>;

  checkAndEmbedMissing: (
    records: { id: string; text: string }[],
    onProgress?: (p: EmbeddingProgress) => void
  ) => Promise<void>;

  removeEmbedding: (recordId: string) => Promise<void>;

  performSemanticSearch: (query: string) => Promise<string[]>;
}

export const useEmbeddingStore = create<EmbeddingState>()((set, get) => ({
  isEmbedding: false,
  progress: { current: 0, total: 0, failed: 0 },
  embeddedIds: new Set(),
  stats: null,

  loadEmbeddedIds: async () => {
    try {
      const ids = await getEmbeddedRecordIds();
      set({ embeddedIds: new Set(ids) });
    } catch (err) {
      logger.error({ err }, "[Embedding] Failed to load embedded IDs");
    }
  },

  loadStats: async () => {
    try {
      const stats = await getEmbeddingStats();
      set({ stats });
    } catch (err) {
      logger.error({ err }, "[Embedding] Failed to load stats");
    }
  },

  embedSingle: async (recordId, text) => {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) return "No Gemini API key configured";

    try {
      const embedding = await embedText(apiKey, text);
      await storeEmbedding(recordId, embedding);

      set((state) => ({
        embeddedIds: new Set([...state.embeddedIds, recordId]),
      }));

      logger.info({ recordId }, "[Embedding] Embedded successfully");
      return null;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.error({ err, recordId }, "[Embedding] Failed to embed");
      await markEmbeddingFailed(recordId, reason).catch(() => {});
      return reason;
    }
  },

  checkAndEmbedMissing: async (records, onProgress) => {
    if (get().isEmbedding) return;

    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      logger.warn("[Embedding] No API key, skipping");
      return;
    }

    const embeddedIds = await getEmbeddedRecordIds();
    const embeddedSet = new Set(embeddedIds);
    const missing = records.filter((r) => !embeddedSet.has(r.id));

    if (missing.length === 0) {
      set({ embeddedIds: embeddedSet });
      return;
    }

    logger.info({ count: missing.length }, "[Embedding] Starting batch embed");
    set({
      isEmbedding: true,
      embeddedIds: embeddedSet,
      progress: { current: 0, total: missing.length, failed: 0 },
    });

    let current = 0;
    let failed = 0;

    for (let i = 0; i < missing.length; i += CONCURRENCY) {
      const batch = missing.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (record) => {
          const err = await get().embedSingle(record.id, record.text);
          current += 1;
          if (err) failed += 1;
          const progress = { current, total: missing.length, failed };
          set({ progress });
          onProgress?.(progress);
        })
      );
    }

    await get().loadStats();
    set({ isEmbedding: false, progress: { current, total: missing.length, failed } });
    logger.info({ embedded: current - failed, failed }, "[Embedding] Batch complete");
  },

  removeEmbedding: async (recordId) => {
    try {
      await deleteEmbedding(recordId);
      set((state) => {
        const next = new Set(state.embeddedIds);
        next.delete(recordId);
        return { embeddedIds: next };
      });
    } catch (err) {
      logger.error({ err, recordId }, "[Embedding] Failed to remove");
    }
  },

  performSemanticSearch: async (query) => {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) return [];

    try {
      const embedding = await embedText(apiKey, query);
      return searchSimilarEmbeddings(embedding, 100);
    } catch (err) {
      logger.error({ err }, "[Embedding] Search failed");
      return [];
    }
  },
}));
