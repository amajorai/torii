import { Brain, KeyRound, Loader2, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { hasGeminiApiKey } from "@/lib/gemini-store";
import { useEmbeddingStore } from "@/stores/use-embedding-store";
import { useNotesStore } from "@/stores/use-notes-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmbeddingsPageProps {
  onOpenApiKeyDialog: () => void;
}

export function EmbeddingsPage({ onOpenApiKeyDialog }: EmbeddingsPageProps) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [resultIds, setResultIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { notes, isLoaded, loadFromDb } = useNotesStore();
  const {
    isEmbedding,
    progress,
    stats,
    loadStats,
    checkAndEmbedMissing,
    performSemanticSearch,
  } = useEmbeddingStore();

  useEffect(() => {
    hasGeminiApiKey().then(setHasKey);
    if (!isLoaded) loadFromDb();
    loadStats();
  }, [isLoaded, loadFromDb, loadStats]);

  const activeNotes = notes.filter((n) => !n.archivedAt);

  const handleEmbedAll = async () => {
    const records = activeNotes.map((n) => ({
      id: n.id,
      text: `${n.title}\n\n${n.content}`.trim(),
    }));
    await checkAndEmbedMissing(records, (p) => {
      if (p.current === p.total) {
        toast.success(`Embedded ${p.current - p.failed} notes`);
      }
    });
    await loadStats();
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    try {
      const ids = await performSemanticSearch(q);
      setResultIds(ids);
      if (ids.length === 0) toast.info("No similar notes found");
    } catch {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const resultNotes = resultIds
    .map((id) => notes.find((n) => n.id === id))
    .filter(Boolean) as typeof notes;

  if (hasKey === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <KeyRound className="size-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-sm">No Gemini API key configured</p>
          <p className="text-muted-foreground text-xs">
            Semantic search uses Gemini to generate embeddings
          </p>
        </div>
        <Button onClick={onOpenApiKeyDialog} size="sm">
          Configure API Key
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="size-5 text-muted-foreground" />
        <h2 className="font-medium text-sm">Semantic Search</h2>
        {stats && (
          <span className="ml-auto text-muted-foreground text-xs">
            {stats.embedded} / {activeNotes.length} notes embedded
          </span>
        )}
      </div>

      {/* Embed all button */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="mb-3 text-sm font-medium">Index your notes</p>
        <p className="mb-4 text-muted-foreground text-xs">
          Generate embeddings for all your notes to enable semantic (meaning-based) search.
          This uses the Gemini text-embedding-004 model.
        </p>

        {isEmbedding ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              <span>
                Embedding {progress.current} / {progress.total}...
                {progress.failed > 0 && ` (${progress.failed} failed)`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <Button
            disabled={activeNotes.length === 0}
            onClick={handleEmbedAll}
            size="sm"
          >
            <Sparkles className="mr-1.5 size-3.5" />
            Embed All Notes
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="space-y-3">
        <p className="font-medium text-sm">Search by meaning</p>
        <div className="flex gap-2">
          <Input
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Describe what you're looking for..."
            value={query}
          />
          <Button
            disabled={!query.trim() || isSearching || (stats?.embedded ?? 0) === 0}
            onClick={handleSearch}
            size="icon"
          >
            {isSearching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
          </Button>
        </div>
        {stats?.embedded === 0 && (
          <p className="text-muted-foreground text-xs">
            Embed your notes first to enable search
          </p>
        )}
      </div>

      {/* Results */}
      {resultNotes.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            {resultNotes.length} results for "{query}"
          </p>
          <div className="space-y-2">
            {resultNotes.map((note) => (
              <div
                className="rounded-xl border border-border bg-background p-3"
                key={note.id}
              >
                <p className="font-medium text-sm">{note.title || "Untitled"}</p>
                <p className="mt-0.5 line-clamp-3 text-muted-foreground text-xs">
                  {note.content || "No content"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
