import { invoke } from "@tauri-apps/api/core";

export async function storeEmbedding(
  recordId: string,
  embedding: number[],
  modelVersion?: string
): Promise<void> {
  await invoke("store_embedding", { recordId, embedding, modelVersion });
}

export async function markEmbeddingFailed(
  recordId: string,
  reason: string
): Promise<void> {
  await invoke("mark_embedding_failed", { recordId, reason });
}

export async function deleteEmbedding(recordId: string): Promise<void> {
  await invoke("delete_embedding", { recordId });
}

export async function searchSimilarEmbeddings(
  embedding: number[],
  limit = 50
): Promise<string[]> {
  return invoke<string[]>("search_similar_embeddings", { embedding, limit });
}

export async function getEmbeddedRecordIds(): Promise<string[]> {
  return invoke<string[]>("get_embedded_record_ids");
}

export async function getEmbeddingStats(): Promise<{
  embedded: number;
  failed: number;
}> {
  return invoke<{ embedded: number; failed: number }>("get_embedding_stats");
}

export async function resetFailedEmbeddings(): Promise<void> {
  await invoke("reset_failed_embeddings");
}
