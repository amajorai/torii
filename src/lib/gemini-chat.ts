import {
  GoogleGenerativeAI,
  type Content,
  type GenerateContentStreamResult,
} from "@google/generative-ai";

const MODEL = "gemini-2.0-flash-lite";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export async function sendChatMessage(
  apiKey: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: MODEL });

  const contents: Content[] = history.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const chat = model.startChat({ history: contents });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

export async function streamChatMessage(
  apiKey: string,
  history: ChatMessage[],
  userMessage: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: MODEL });

  const contents: Content[] = history.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const chat = model.startChat({ history: contents });
  const result: GenerateContentStreamResult =
    await chat.sendMessageStream(userMessage);

  let full = "";
  for await (const chunk of result.stream) {
    const text = chunk.text();
    full += text;
    onChunk(text);
  }
  return full;
}
