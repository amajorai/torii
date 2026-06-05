import { invoke } from "@tauri-apps/api/core";

export interface AcpToolCall {
  callId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

type ToolResult = Record<string, unknown>;

/**
 * App-provided tool handlers, keyed by the tool name declared in the Rust
 * `tool_definitions()` (src-tauri/src/acp.rs). These let an ACP agent drive
 * your app. The generic boilerplate ships none — register your own here and add
 * a matching entry to `tool_definitions()`.
 *
 * Example:
 * ```ts
 * import { useGalleryStore } from "@/stores/use-gallery-store";
 *
 * const TOOL_HANDLERS = {
 *   torii_get_files: () => ({
 *     success: true,
 *     files: useGalleryStore.getState().files.map((f) => ({ id: f.id, name: f.name })),
 *   }),
 * } satisfies Record<string, (args: Record<string, unknown>) => ToolResult | Promise<ToolResult>>;
 * ```
 */
const TOOL_HANDLERS: Record<
  string,
  (args: Record<string, unknown>) => ToolResult | Promise<ToolResult>
> = {};

/**
 * Runs an app-provided tool requested by the agent and returns the result to
 * the waiting Rust ACP session. Driven by the "acp-tool-call" event via
 * `useAcpToolRunner`.
 */
export async function dispatchAcpToolCall(call: AcpToolCall): Promise<void> {
  const handler = TOOL_HANDLERS[call.toolName];

  if (!handler) {
    await invoke("acp_tool_result", {
      callId: call.callId,
      result: `Unknown tool: ${call.toolName}`,
      isError: true,
    });
    return;
  }

  try {
    const result = await Promise.resolve(handler(call.arguments));
    await invoke("acp_tool_result", {
      callId: call.callId,
      result: JSON.stringify(result),
      isError: false,
    });
  } catch (err) {
    await invoke("acp_tool_result", {
      callId: call.callId,
      result: String(err),
      isError: true,
    });
  }
}
