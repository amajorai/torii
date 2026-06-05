import { Bot } from "lucide-react";
import { useRef, useState } from "react";
import { AgentChat } from "@/components/agent-elements/agent-chat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { acpPrompt } from "@/lib/acp-client";
import {
  chatStatusFor,
  type SimpleChatMessage,
  toUIMessages,
} from "@/lib/agent-chat-adapter";
import { useAppSettingsStore } from "@/stores/use-app-settings-store";

const SYSTEM_PREAMBLE =
  "You are the in-app assistant for a desktop app built on the Torii boilerplate. " +
  "You can use your own tools (and any app tools provided) to help the user. " +
  "Keep replies concise.";

/**
 * Generic AI agent chat. Talks to the selected ACP agent (Claude/Gemini/Codex/…)
 * configured in Settings → AI Agents, spawned over stdio by the Rust ACP
 * transport. The message feed and composer come from the agent-elements
 * library, which renders the agent's tool calls (bash, edit, search, …).
 */
export function AgentChatPage() {
  const [messages, setMessages] = useState<SimpleChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Each send bumps this; a stopped or superseded turn is discarded on resolve.
  const turnIdRef = useRef(0);

  const acpAgents = useAppSettingsStore((s) => s.acpAgents);
  const acpTextGenAgentId = useAppSettingsStore((s) => s.acpTextGenAgentId);
  const setAcpTextGenAgentId = useAppSettingsStore(
    (s) => s.setAcpTextGenAgentId
  );

  const selectedAgent = acpTextGenAgentId
    ? (acpAgents.find((a) => a.id === acpTextGenAgentId) ?? null)
    : null;

  const handleSend = async (userMessage: string) => {
    const trimmed = userMessage.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const turnId = turnIdRef.current + 1;
    turnIdRef.current = turnId;

    // Snapshot the transcript before this turn so the prompt carries multi-turn
    // context (ACP sessions are stateless per call).
    const history = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
    ]);
    setIsLoading(true);

    const appendAssistant = (content: string) => {
      if (turnIdRef.current !== turnId) {
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content },
      ]);
    };

    try {
      if (!selectedAgent) {
        appendAssistant(
          "No AI agent is selected. Choose one above, or set one up in Settings → AI Agents."
        );
        return;
      }

      const prompt = `${SYSTEM_PREAMBLE}\n\n${
        history ? `Conversation so far:\n${history}\n\n` : ""
      }User: ${trimmed}`;

      const response = await acpPrompt(selectedAgent, prompt);
      appendAssistant(response);
    } catch (err) {
      appendAssistant(
        err instanceof Error
          ? `Error: ${err.message}`
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      if (turnIdRef.current === turnId) {
        setIsLoading(false);
      }
    }
  };

  const handleStop = () => {
    // ACP turns can't truly be cancelled. Invalidate the in-flight turn so its
    // eventual response is dropped, and close the turn with a marker so the feed
    // stops showing the processing indicator.
    turnIdRef.current += 1;
    setIsLoading(false);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content: "Stopped." },
    ]);
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-border border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="size-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Assistant</p>
            <p className="text-muted-foreground text-xs">
              Chat with an ACP agent.
            </p>
          </div>
        </div>

        {/* Agent selector */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-muted-foreground text-xs">Agent</span>
          <Select
            onValueChange={(v) => setAcpTextGenAgentId(v === "none" ? null : v)}
            value={acpTextGenAgentId ?? "none"}
          >
            <SelectTrigger className="w-48" size="sm">
              <SelectValue>
                {selectedAgent?.name ?? "Select an agent"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {acpAgents.length === 0 ? (
                <SelectItem disabled value="none">
                  No agents configured — add one in Settings
                </SelectItem>
              ) : (
                acpAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Message feed + composer (agent-elements) */}
      <AgentChat
        className="min-h-0 flex-1"
        emptyState={
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="size-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">How can I help?</p>
              <p className="max-w-[260px] text-muted-foreground text-xs">
                Ask the agent anything. It can run its own tools to read, search,
                and edit.
              </p>
            </div>
          </div>
        }
        messages={toUIMessages(messages)}
        onSend={({ content }) => handleSend(content)}
        onStop={handleStop}
        status={chatStatusFor(isLoading)}
      />
    </div>
  );
}
