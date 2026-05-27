import { invoke } from "@tauri-apps/api/core";
import { logger } from "@/lib/logger";

const KEY = "gemini_api_key";

export async function getGeminiApiKey(): Promise<string | null> {
  try {
    return await invoke<string | null>("secure_storage_retrieve", { key: KEY });
  } catch (error) {
    logger.error({ err: error }, "Failed to load Gemini API key");
    return null;
  }
}

export async function setGeminiApiKey(apiKey: string): Promise<void> {
  try {
    if (!apiKey) {
      await removeGeminiApiKey();
      return;
    }
    await invoke("secure_storage_store", { key: KEY, value: apiKey });
  } catch (error) {
    logger.error({ err: error }, "Failed to save Gemini API key");
    throw error;
  }
}

export async function removeGeminiApiKey(): Promise<void> {
  try {
    await invoke("secure_storage_remove_encrypted", { key: KEY });
  } catch (error) {
    logger.error({ err: error }, "Failed to remove Gemini API key");
    throw error;
  }
}

export async function hasGeminiApiKey(): Promise<boolean> {
  try {
    return await invoke<boolean>("secure_storage_exists", { key: KEY });
  } catch (error) {
    logger.error({ err: error }, "Failed to check Gemini API key");
    return false;
  }
}
