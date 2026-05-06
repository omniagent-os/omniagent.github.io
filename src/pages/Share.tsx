import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { decodeConversation } from "@/lib/share";
import { saveConversation } from "@/lib/storage";
import type { Conversation, ModelResponse } from "@/lib/types";
import { useAppContext } from "@/contexts/AppContext";
import {
  GitMerge, Sparkles, ChevronDown, ChevronUp, Clock,
  AlertCircle, Download, ArrowLeft, Share2
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function ModelPanel({ response, color }: { response: ModelResponse; color: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${color}30` }}>
      <button
        className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/30 transition-colors"
        style={{ background: `${color}06` }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium font-mono" style={{ color }}>{response.model}</span>
          {response.status === "done" && (
            <Badge variant="outline" className="text-xs py-0 h-5 font-mono border-border">
              <Clock className="w-3 h-3 mr-1" />
              {(response.responseTimeMs / 1000).toFixed(1)}s
            </Badge>
          )}
          {response.status === "error" && (
            <Badge variant="outline" className="text-xs py-0 h-5 border-destructive/30 text-destructive">
              <AlertCircle className="w-3 h-3 mr-1" />Error
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="p-3 text-sm text-muted-foreground leading-relaxed border-t border-border/50 whitespace-pre-wrap">
          {response.content || <span className="italic opacity-50">No content</span>}
        </div>
      )}
    </div>
  );
}

export default function Share() {
  const [, navigate] = useLocation();
  const { settings } = useAppContext();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) { setError(true); return; }
    const decoded = decodeConversation(hash);
    if (!decoded) { setError(true); return; }
    setConv(decoded);
  }, []);

  const handleImport = () => {
    if (!conv) return;
    const imported = { ...conv, id: Math.random().toString(36).slice(2) };
    saveConversation(imported);
    toast.success("Conversation imported to your history");
    navigate(`/chat/${imported.id}`);
  };

  const getColor = (providerId: string) =>
    settings.providers.find(p => p.id === providerId)?.color ?? "hsl(var(--muted-foreground))";

  if (error) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">Invalid share link</h2>
        <p className="text-muted-foreground text-sm mb-6">
          This link is malformed or has been truncated. Ask the sender to regenerate it.
        </p>
        <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Go home
        </Button>
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 0.15, 0.3].map((d, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary/40 synergy-pulse" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const assistantMessages = conv.messages.filter(m => m.role === "assistant");
  const userMessages = conv.messages.filter(m => m.role === "user");

  return (
    <div className="min-h-full bg-background">
      {/* Header banner */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">Shared Synergy</span>
            <Badge variant="outline" className="text-xs border-border hidden sm:flex">
              Read-only
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => navigate("/")} className="gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> App
            </Button>
            <Button size="sm" onClick={handleImport} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Import
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Conversation header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl border border-border bg-card p-5">
            <h1 className="text-xl font-bold mb-2 leading-tight">{conv.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true })}
              </span>
              <span>{userMessages.length} prompt{userMessages.length !== 1 ? "s" : ""}</span>
              <span>{assistantMessages.length} synthesis{assistantMessages.length !== 1 ? "es" : ""}</span>
              {conv.modelsUsed.length > 0 && (
                <span className="flex items-center gap-1.5">
                  {conv.modelsUsed.map(id => (
                    <span
                      key={id}
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: getColor(id) }}
                      title={id}
                    />
                  ))}
                  {conv.modelsUsed.length} model{conv.modelsUsed.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Messages */}
        <div className="space-y-6">
          {conv.messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Synthesis */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/20">
                      <GitMerge className="w-4 h-4 text-primary" />
                      <span className="text-xs font-mono font-medium text-primary uppercase tracking-widest">
                        Synthesized Answer
                      </span>
                      <Badge variant="outline" className="ml-auto text-xs border-primary/30 text-primary py-0 h-5">
                        <Sparkles className="w-3 h-3 mr-1" /> Synergy
                      </Badge>
                    </div>
                    <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {msg.content}
                    </div>
                  </div>

                  {/* Individual model responses */}
                  {msg.modelResponses && msg.modelResponses.length > 0 && (
                    <ModelAccordion responses={msg.modelResponses} getColor={getColor} />
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="rounded-xl border border-border bg-card p-5 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Want to run your own synergy queries with multiple AI models simultaneously?
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => navigate("/")} className="gap-2">
              <GitMerge className="w-4 h-4" /> Try OmniAgent Synergy
            </Button>
            <Button variant="outline" onClick={handleImport} className="gap-2">
              <Download className="w-4 h-4" /> Import this conversation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelAccordion({
  responses,
  getColor,
}: {
  responses: ModelResponse[];
  getColor: (id: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors mb-2"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? "Hide" : "Show"} individual model responses ({responses.length})
      </button>
      {open && (
        <div className="grid gap-2">
          {responses.map(r => (
            <ModelPanel key={r.providerId} response={r} color={getColor(r.providerId)} />
          ))}
        </div>
      )}
    </div>
  );
}
