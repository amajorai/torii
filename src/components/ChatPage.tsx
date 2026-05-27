import { KeyRound, Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type ChatMessage, streamChatMessage } from "@/lib/gemini-chat";
import { getGeminiApiKey } from "@/lib/gemini-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatPageProps {
  onOpenApiKeyDialog: () => void;
}

export function ChatPage({ onOpenApiKeyDialog }: ChatPageProps) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGeminiApiKey().then((k) => setHasKey(!!k));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, streamingText]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      setHasKey(false);
      return;
    }

    setInput("");
    setIsStreaming(true);
    setStreamingText("");

    const userMsg: ChatMessage = { role: "user", text };
    setHistory((h) => [...h, userMsg]);

    try {
      let full = "";
      await streamChatMessage(apiKey, history, text, (chunk) => {
        full += chunk;
        setStreamingText(full);
      });
      setHistory((h) => [...h, { role: "model", text: full }]);
    } catch (err) {
      setHistory((h) => [
        ...h,
        { role: "model", text: `Error: ${err instanceof Error ? err.message : String(err)}` },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
  };

  if (hasKey === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <KeyRound className="size-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-sm">No Gemini API key configured</p>
          <p className="text-muted-foreground text-xs">
            Add your API key to start chatting with AI
          </p>
        </div>
        <Button onClick={onOpenApiKeyDialog} size="sm">
          Configure API Key
        </Button>
      </div>
    );
  }

  if (hasKey === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {history.length === 0 && !isStreaming && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
            Start a conversation with Gemini
          </div>
        )}

        {history.map((msg, i) => (
          <div
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
            key={i}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground">
              {streamingText ? (
                <p className="whitespace-pre-wrap">{streamingText}</p>
              ) : (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            disabled={isStreaming}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Gemini... (Enter to send, Shift+Enter for newline)"
            rows={1}
            style={{
              minHeight: "42px",
              maxHeight: "160px",
              height: "auto",
            }}
            value={input}
          />
          <Button
            className="shrink-0"
            disabled={!input.trim() || isStreaming}
            onClick={sendMessage}
            size="icon"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
