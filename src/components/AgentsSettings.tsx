import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { sileo } from "sileo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as sounds from "@/lib/sounds";
import {
  type AcpAgent,
  type AcpAgentEnvVar,
  useAppSettingsStore,
} from "@/stores/use-app-settings-store";

const AGENT_PRESETS: Pick<AcpAgent, "name" | "command" | "args" | "envVars">[] = [
  {
    name: "Claude Code",
    command: "npx",
    args: ["-y", "@zed-industries/claude-code-acp"],
    envVars: [],
  },
  {
    name: "Gemini CLI",
    command: "gemini",
    args: ["--experimental-acp"],
    envVars: [],
  },
  {
    name: "OpenAI Codex",
    command: "npx",
    args: ["-y", "@zed-industries/codex-acp"],
    envVars: [],
  },
  {
    name: "Cursor",
    command: "cursor-agent",
    args: ["acp"],
    envVars: [],
  },
];

function serializeEnvVars(vars: AcpAgentEnvVar[]): string {
  return vars.map((v) => `${v.key}=${v.value}`).join("\n");
}

function parseEnvVars(text: string): AcpAgentEnvVar[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const eq = line.indexOf("=");
      if (eq === -1) return { key: line, value: "" };
      return { key: line.slice(0, eq).trim(), value: line.slice(eq + 1).trim() };
    })
    .filter((v) => v.key);
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 px-4 py-3">
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function AgentsSettings() {
  const acpAgents = useAppSettingsStore((s) => s.acpAgents);
  const setAcpAgents = useAppSettingsStore((s) => s.setAcpAgents);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCommand, setFormCommand] = useState("");
  const [formArgs, setFormArgs] = useState("");
  const [formEnv, setFormEnv] = useState("");

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormName("");
    setFormCommand("");
    setFormArgs("");
    setFormEnv("");
  };

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const startEdit = (agent: AcpAgent) => {
    setIsAdding(false);
    setEditingId(agent.id);
    setFormName(agent.name);
    setFormCommand(agent.command);
    setFormArgs(agent.args.join(" "));
    setFormEnv(serializeEnvVars(agent.envVars));
  };

  const applyPreset = (name: string | null) => {
    const preset = AGENT_PRESETS.find((p) => p.name === name);
    if (!preset) return;
    setFormName(preset.name);
    setFormCommand(preset.command);
    setFormArgs(preset.args.join(" "));
    setFormEnv(serializeEnvVars(preset.envVars));
  };

  const save = async () => {
    const name = formName.trim();
    const command = formCommand.trim();
    if (!(name && command)) {
      sileo.error({ title: "Name and command are required" });
      return;
    }
    const agent: AcpAgent = {
      id: editingId ?? crypto.randomUUID(),
      name,
      command,
      args: formArgs.trim() ? formArgs.trim().split(/\s+/) : [],
      envVars: parseEnvVars(formEnv),
    };
    const next = editingId
      ? acpAgents.map((a) => (a.id === editingId ? agent : a))
      : [...acpAgents, agent];
    await setAcpAgents(next);
    sounds.success();
    sileo.success({ title: editingId ? "Agent updated" : "Agent added" });
    resetForm();
  };

  const remove = async (id: string) => {
    await setAcpAgents(acpAgents.filter((a) => a.id !== id));
    sounds.delete_();
    if (editingId === id) resetForm();
  };

  const showForm = isAdding || editingId !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">AI Agents</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            ACP-compatible agent CLIs the Assistant can talk to. They run locally
            over stdio — install the CLI first.
          </p>
        </div>
        {!showForm && (
          <Button onClick={startAdd} size="sm">
            <Plus className="size-4" />
            Add agent
          </Button>
        )}
      </div>

      {/* Agent list */}
      {acpAgents.length === 0 && !showForm && (
        <div className="rounded-xl border border-border border-dashed px-4 py-8 text-center">
          <p className="text-muted-foreground text-sm">No agents configured</p>
          <p className="mt-1 text-muted-foreground text-xs">
            Add one to start chatting in the Assistant.
          </p>
        </div>
      )}

      {acpAgents.map((agent) => (
        <SettingRow
          description={`${agent.command} ${agent.args.join(" ")}`.trim()}
          key={agent.id}
          title={agent.name}
        >
          <div className="flex items-center gap-1">
            <Button
              onClick={() => {
                sounds.click();
                startEdit(agent);
              }}
              size="icon-sm"
              title="Edit"
              variant="ghost"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              className="text-destructive hover:text-destructive"
              onClick={() => remove(agent.id)}
              size="icon-sm"
              title="Remove"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </SettingRow>
      ))}

      {/* Add / edit form */}
      {showForm && (
        <div className="space-y-3 rounded-xl border border-border p-4">
          {isAdding && (
            <div className="space-y-1.5">
              <span className="text-muted-foreground text-xs">
                Start from a preset
              </span>
              <Select onValueChange={applyPreset}>
                <SelectTrigger className="w-full" size="sm">
                  <SelectValue placeholder="Choose a preset (optional)…" />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_PRESETS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs">Name</span>
            <Input
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Claude Code"
              value={formName}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs">Command</span>
            <Input
              onChange={(e) => setFormCommand(e.target.value)}
              placeholder="e.g. npx or gemini"
              value={formCommand}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs">
              Arguments (space-separated)
            </span>
            <Input
              onChange={(e) => setFormArgs(e.target.value)}
              placeholder="e.g. -y @zed-industries/claude-code-acp"
              value={formArgs}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs">
              Environment variables (one KEY=value per line)
            </span>
            <textarea
              className="min-h-20 w-full resize-y rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              onChange={(e) => setFormEnv(e.target.value)}
              placeholder="GEMINI_API_KEY=..."
              value={formEnv}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => {
                sounds.click();
                resetForm();
              }}
              size="sm"
              variant="ghost"
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button onClick={save} size="sm">
              <Check className="size-4" />
              {editingId ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
