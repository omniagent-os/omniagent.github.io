import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/contexts/AppContext";
import { processSynergy, getBackendStatus } from "@/lib/synergyEngine";
import { getConversations, saveConversation, deleteConversation } from "@/lib/storage";
import type { Conversation, Message, ModelResponse } from "@/lib/types";
import {
  Send, Plus, Trash2, MessageSquare, GitMerge, Sparkles,
  Clock, Zap, ChevronDown, ChevronUp, AlertCircle, Share2, Check, Server
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { copyShareUrl } from "@/lib/share";

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
      <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
      <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
    </span>
  );
}

function ModelPanel({ response, color }: { response: ModelResponse; color: string }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="rounded-lg border overflow-hidden transition-colors" style={{ borderColor: `${color}30` }} data-testid={`panel-model-${response.providerId}`}>
      <button
        className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
        style={{ background: `${color}06` }}
      >
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", response.status === "streaming" && "synergy-pulse")} style={{ backgroundColor: color }} />
          <span className="text-sm font-medium font-mono" style={{ color }}>{response.model}</span>
          {response.status === "streaming" && <span className="text-xs text-muted-foreground"><ThinkingDots /></span>}
          {response.status === "done" && (
            <Badge variant="outline" className="text-xs py-0 h-5 font-mono border-border">
              <Clock className="w-3 h-3 mr-1" />{(response.responseTimeMs / 1000).toFixed(1)}s
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
        <div className="p-3 text-sm text-muted-foreground leading-relaxed border-t border-border/50">
          {response.status === "pending"   && <span className="text-muted-foreground/50 text-xs font-mono">Queued...</span>}
          {response.status === "streaming" && <span className="text-muted-foreground/70 text-xs font-mono italic">Processing...</span>}
          {response.status === "done"      && <div className="whitespace-pre-wrap stream-in">{response.content}</div>}
          {response.status === "error"     && <span className="text-destructive text-xs">{response.error}</span>}
        </div>
      )}
    </div>
  );
}

function SynthesisPanel({ content, isSynthesizing }: { content: string; isSynthesizing: boolean }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden synergy-glow">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/20">
        <GitMerge className="w-4 h-4 text-primary" />
        <span className="text-sm font-mono font-medium text-primary uppercase tracking-widest">Synthesized Answer</span>
        {isSynthesizing && (
          <span className="ml-auto text-xs text-primary/60 flex items-center gap-1">
            <span>Synthesizing</span><ThinkingDots />
          </span>
        )}
        {!isSynthesizing && content && (
          <Badge variant="outline" className="ml-auto text-xs border-primary/30 text-primary py-0 h-5">
            <Sparkles className="w-3 h-3 mr-1" />Complete
          </Badge>
        )}
      </div>
      <div className="p-4 text-sm leading-relaxed">
        {isSynthesizing && !content && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex gap-1">
              {[0, 0.15, 0.3].map((d, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary/40 synergy-pulse" style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
            <span className="text-xs font-mono">Combining perspectives...</span>
          </div>
        )}
        {content && <div className="whitespace-pre-wrap stream-in text-foreground">{content}</div>}
      </div>
    </div>
  );
}

function MessageBubble({ message, providers }: { message: Message; providers: { id: string; color: string }[] }) {
  const [showModels, setShowModels] = useState(false);
  if (message.role === "user") {
    return (
      <div className="flex justify-end" data-testid={`message-user-${message.id}`}>
        <div className="max-w-[75%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
          {message.content}
        </div>
      </div>
    );
  }
  const hasModelResponses = message.modelResponses && message.modelResponses.length > 0;
  return (
    <div className="space-y-3" data-testid={`message-assistant-${message.id}`}>
      <SynthesisPanel content={message.content} isSynthesizing={false} />
      {hasModelResponses && (
        <div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors mb-2"
            onClick={() => setShowModels(!showModels)}
          >
            {showModels ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showModels ? "Hide" : "Show"} individual model responses ({message.modelResponses!.length})
          </button>
          {showModels && (
            <div className="grid gap-2">
              {message.modelResponses!.map((r) => {
                const p = providers.find(p => p.id === r.providerId);
                return <ModelPanel key={r.providerId} response={r} color={p?.color || "hsl(var(--muted-foreground))"} />;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { settings } = useAppContext();
  const [conversations, setConversations]     = useState<Conversation[]>(() => getConversations());
  const [activeConvId, setActiveConvId]       = useState<string | null>(params.id || null);
  const [input, setInput]                     = useState("");
  const [isProcessing, setIsProcessing]       = useState(false);
  const [liveResponses, setLiveResponses]     = useState<ModelResponse[]>([]);
  const [liveSynthesis, setLiveSynthesis]     = useState("");
  const [isSynthesizing, setIsSynthesizing]   = useState(false);
  const [backendReady, setBackendReady]       = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) || null;

  // Check backend status on mount
  useEffect(() => {
    getBackendStatus().then(setBackendReady);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages, liveResponses, liveSynthesis]);

  const createNewConversation = useCallback(() => {
    setActiveConvId(null); setLiveResponses([]); setLiveSynthesis(""); setIsSynthesizing(false);
    navigate("/chat");
  }, [navigate]);

  const selectConversation = useCallback((id: string) => {
    setActiveConvId(id); setLiveResponses([]); setLiveSynthesis(""); setIsSynthesizing(false);
    navigate(`/chat/${id}`);
  }, [navigate]);

  const handleDeleteConversation = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
    setConversations(getConversations());
    if (activeConvId === id) { setActiveConvId(null); navigate("/chat"); }
  }, [activeConvId, navigate]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    setInput(""); setIsProcessing(true); setLiveResponses([]); setLiveSynthesis(""); setIsSynthesizing(false);

    let conv: Conversation;
    const now = Date.now();
    if (activeConv) {
      conv = { ...activeConv };
    } else {
      conv = { id: Math.random().toString(36).slice(2), title: trimmed.slice(0, 60), messages: [], createdAt: now, updatedAt: now, modelsUsed: [] };
    }

    const userMsg: Message = { id: Math.random().toString(36).slice(2), role: "user", content: trimmed, timestamp: now };
    conv.messages = [...conv.messages, userMsg];
    conv.updatedAt = now;
    saveConversation(conv);
    setConversations(getConversations());
    setActiveConvId(conv.id);
    navigate(`/chat/${conv.id}`, { replace: true });

    try {
      const enabledProviders = settings.providers.filter(p => p.enabled);
      setLiveResponses(enabledProviders.map(p => ({ providerId: p.id, model: p.model, content: "", responseTimeMs: 0, tokensUsed: 0, status: "pending" as const })));

      const history = conv.messages.slice(0, -1);

      const result = await processSynergy(trimmed, settings.providers, history, (partial) => {
        setLiveResponses(prev => {
          const idx = prev.findIndex(r => r.providerId === partial.providerId);
          if (idx >= 0) { const u = [...prev]; u[idx] = partial; return u; }
          return [...prev, partial];
        });
        setLiveResponses(current => {
          const allDone = current.every(r => r.status === "done" || r.status === "error");
          if (allDone && current.length > 0) setIsSynthesizing(true);
          return current;
        });
      });

      setIsSynthesizing(false);
      setLiveSynthesis(result.synthesis);

      const assistantMsg: Message = {
        id: Math.random().toString(36).slice(2), role: "assistant",
        content: result.synthesis, modelResponses: result.modelResponses, timestamp: Date.now(),
      };
      conv.messages = [...conv.messages, assistantMsg];
      conv.updatedAt = Date.now();
      conv.modelsUsed = [...new Set([...conv.modelsUsed, ...result.modelResponses.map(r => r.providerId)])];
      saveConversation(conv);
      setConversations(getConversations());
      setLiveResponses([]); setLiveSynthesis("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process synergy request";
      toast.error(msg);
      setLiveResponses([]); setLiveSynthesis(""); setIsSynthesizing(false);
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, activeConv, settings.providers, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const [shareCopied, setShareCopied] = useState(false);
  const handleShare = useCallback(async () => {
    if (!activeConv || activeConv.messages.length === 0) { toast.error("No conversation to share yet"); return; }
    const ok = await copyShareUrl(activeConv);
    if (ok) { setShareCopied(true); toast.success("Share link copied to clipboard"); setTimeout(() => setShareCopied(false), 2500); }
    else toast.error("Failed to copy — check browser permissions");
  }, [activeConv]);

  const enabledCount = settings.providers.filter(p => p.enabled).length;
  const hasBackendKeys = Object.values(backendReady).some(Boolean);
  const hasLocalKeys   = settings.providers.some(p => p.apiKey);
  const isDemoMode     = !hasBackendKeys && !hasLocalKeys;
  const backendActive  = hasBackendKeys;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 lg:w-64 border-r border-border bg-sidebar flex-col hidden md:flex flex-shrink-0">
        <div className="p-3 border-b border-border">
          <Button size="sm" className="w-full gap-2 justify-start" variant="outline" onClick={createNewConversation} data-testid="button-new-conversation">
            <Plus className="w-4 h-4" />New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-8 px-2">No conversations yet. Start one above.</div>
            )}
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={cn("group flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors text-sm",
                  activeConvId === conv.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary")}
                onClick={() => selectConversation(conv.id)}
                data-testid={`conversation-item-${conv.id}`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 truncate text-xs">{conv.title}</span>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive"
                  onClick={(e) => handleDeleteConversation(conv.id, e)} data-testid={`button-delete-${conv.id}`}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 border-t border-border">
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <div><span className="text-primary font-medium">{enabledCount}</span> models active</div>
            {backendActive && (
              <div className="flex items-center justify-center gap-1 text-green-500/80">
                <Server className="w-3 h-3" /><span>Backend connected</span>
              </div>
            )}
            {isDemoMode && <span className="text-yellow-500/70">Demo mode</span>}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-4 py-3 flex items-center gap-3 bg-background/80 backdrop-blur sticky top-0 z-10">
          <GitMerge className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Synergy Chat</span>
          {activeConv && <span className="text-xs text-muted-foreground truncate hidden sm:block max-w-[200px]">{activeConv.title}</span>}
          <div className="ml-auto flex items-center gap-2">
            {isDemoMode && <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-500">Demo Mode</Badge>}
            {backendActive && <Badge variant="outline" className="text-xs border-green-500/30 text-green-500"><Server className="w-3 h-3 mr-1" />Live</Badge>}
            <div className="flex gap-1">
              {settings.providers.filter(p => p.enabled).map(p => (
                <div key={p.id} className="w-2 h-2 rounded-full synergy-pulse" style={{ backgroundColor: p.color }} title={p.label} />
              ))}
            </div>
            <Button size="sm" variant="outline"
              className={cn("gap-1.5 text-xs h-7 px-2.5 transition-all", shareCopied && "border-green-500/40 text-green-500")}
              onClick={handleShare} disabled={!activeConv || activeConv.messages.length === 0} data-testid="button-share">
              {shareCopied ? <><Check className="w-3.5 h-3.5" />Copied</> : <><Share2 className="w-3.5 h-3.5" />Share</>}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {!activeConv && liveResponses.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center synergy-glow">
                    <GitMerge className="w-7 h-7 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Synergy Chat</h3>
                <p className="text-muted-foreground text-sm max-w-sm mb-6">
                  Ask anything. Your query will be sent to {enabledCount} AI models simultaneously,
                  then synthesised into one superior answer.
                </p>
                {isDemoMode && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-3 text-xs text-yellow-500/80 max-w-sm">
                    <strong>Demo mode</strong> — running with simulated responses.{" "}
                    Start the backend server and add your API keys in{" "}
                    <code className="font-mono">server/.env</code>, or{" "}
                    <button className="underline underline-offset-2 hover:text-yellow-500" onClick={() => navigate("/settings")}>
                      enter keys manually
                    </button>
                    {" "}in Settings.
                  </div>
                )}
                {backendActive && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-3 text-xs text-green-500/80 max-w-sm">
                    <Server className="w-3.5 h-3.5 inline mr-1" />
                    <strong>Backend connected</strong> — real AI responses active for{" "}
                    {Object.entries(backendReady).filter(([,v]) => v).map(([k]) => k).join(", ")}.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-sm">
                  {["Explain quantum entanglement simply", "Best approach for a SaaS pricing model",
                    "Write a regex to validate email addresses", "What caused the 2008 financial crisis"].map((q) => (
                    <button key={q}
                      className="text-left text-xs p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
                      onClick={() => setInput(q)}>{q}</button>
                  ))}
                </div>
              </motion.div>
            )}

            {activeConv?.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} providers={settings.providers.map(p => ({ id: p.id, color: p.color }))} />
            ))}

            {isProcessing && (
              <div className="space-y-3">
                <SynthesisPanel content={liveSynthesis} isSynthesizing={isSynthesizing || (!isSynthesizing && !liveSynthesis && liveResponses.length > 0)} />
                {liveResponses.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <span>Model responses</span>
                      <span className="text-primary">({liveResponses.filter(r => r.status === "done").length}/{liveResponses.length} complete)</span>
                    </div>
                    <div className="grid gap-2">
                      {liveResponses.map(r => {
                        const p = settings.providers.find(p => p.id === r.providerId);
                        return <ModelPanel key={r.providerId} response={r} color={p?.color || "hsl(var(--muted-foreground))"} />;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4 bg-background/80 backdrop-blur">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-end">
              <Textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={`Send to ${enabledCount} models simultaneously...`}
                className="resize-none min-h-[44px] max-h-[160px] text-sm" rows={1} disabled={isProcessing} data-testid="input-message" />
              <Button size="icon" className="h-11 w-11 shrink-0" onClick={handleSend}
                disabled={!input.trim() || isProcessing} data-testid="button-send">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Press Enter to send · Shift+Enter for newline</p>
          </div>
        </div>
      </div>
    </div>
  );
}
