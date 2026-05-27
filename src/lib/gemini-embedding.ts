import { GoogleGenerativeAI } from "@google/generative-ai";

const EMBEDDING_MODEL = "text-embedding-004";

export async function embedText(
  apiKey: string,
  text: string
): Promise<number[]> {
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function embedTexts(
  apiKey: string,
  texts: string[]
): Promise<number[][]> {
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });
  const results = await Promise.all(
    texts.map((text) => model.embedContent(text))
  );
  return results.map((r) => r.embedding.values);
}
