import { useState, useCallback, useEffect } from "react";
  import { motion, AnimatePresence } from "framer-motion";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Badge } from "@/components/ui/badge";
  import { ScrollArea } from "@/components/ui/scroll-area";
  import { useAppContext } from "@/contexts/AppContext";
  import { validateKey, fetchFreeLLMKeys, type KeyStatus, type FreeLLMKey } from "@/lib/keyValidator";
  import { AVAILABLE_MODELS, PEKPIK_BASE_URL } from "@/lib/providers";
  import { toast } from "sonner";
  import {
    Key, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock,
    ChevronDown, ChevronUp, ExternalLink, Zap, Copy, Check, Loader2,
  } from "lucide-react";
  import { cn } from "@/lib/utils";

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  function StatusBadge({ status, latencyMs }: { status: KeyStatus; latencyMs?: number }) {
    if (status === "checking") return (
      <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />Checking…
      </Badge>
    );
    if (status === "ok") return (
      <Badge variant="outline" className="text-xs border-green-500/30 text-green-400 gap-1">
        <CheckCircle2 className="w-3 h-3" />Active{latencyMs ? ` · ${latencyMs}ms` : ""}
      </Badge>
    );
    if (status === "error") return (
      <Badge variant="outline" className="text-xs border-red-500/30 text-red-400 gap-1">
        <XCircle className="w-3 h-3" />Invalid
      </Badge>
    );
    if (status === "missing") return (
      <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground gap-1">
        <AlertCircle className="w-3 h-3" />Not set
      </Badge>
    );
    return null;
  }

  function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
      <button
        className="p-1 rounded hover:bg-secondary transition-colors"
        onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        title="Copy key"
      >
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
      </button>
    );
  }

  const PROVIDER_META: Record<string, { docsUrl: string; label: string; isPekpik?: boolean }> = {
    openai:    { label: "OpenAI",         docsUrl: "https://platform.openai.com/api-keys" },
    anthropic: { label: "Anthropic",      docsUrl: "https://console.anthropic.com/settings/keys" },
    google:    { label: "Google Gemini",  docsUrl: "https://aistudio.google.com/app/apikey" },
    mistral:   { label: "Mistral AI",     docsUrl: "https://console.mistral.ai/api-keys" },
    deepseek:  { label: "DeepSeek",       docsUrl: "https://platform.deepseek.com/api_keys" },
    groq:      { label: "Groq",           docsUrl: "https://console.groq.com/keys" },
    cerebras:  { label: "Cerebras",       docsUrl: "https://cloud.cerebras.ai/platform/apikeys" },
    pekpik:    { label: "FreeLLM Hub",    docsUrl: "https://github.com/alistaitsacle/free-llm-api-keys", isPekpik: true },
    xai:       { label: "xAI Grok",       docsUrl: "https://github.com/alistaitsacle/free-llm-api-keys", isPekpik: true },
    kimi:      { label: "Kimi",           docsUrl: "https://github.com/alistaitsacle/free-llm-api-keys", isPekpik: true },
  };

  /* ── FreeLLM key picker ──────────────────────────────────────────────── */
  function FreeLLMDrawer({
    keys, onPick,
  }: { keys: FreeLLMKey[]; onPick: (providerId: string, key: string) => void }) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("");

    const pekpikProviders = ["pekpik", "xai", "kimi"];
    const modelMap: Record<string, string[]> = {
      pekpik: ["smart-chat", "gpt-5.5", "gpt-5.4", "claude-opus-4-7", "claude-sonnet-4-6", "deepseek-chat", "gemini-2.5-flash", "mistral-medium", "GLM-4.7", "Mercury", "codestral-latest", "devstral-latest", "kimi-k2.5"],
      xai:    ["grok-4.20-beta", "grok-4.20-multi-agent-beta"],
      kimi:   ["kimi-k2.5"],
    };

    const filtered = keys.filter(k =>
      !filter || k.model.toLowerCase().includes(filter.toLowerCase()) || k.key.includes(filter)
    );

    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-sm font-medium"
          onClick={() => setOpen(!open)}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>Clés FreeLLM disponibles ({keys.length})</span>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">Gratuites · 24-48h</Badge>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="p-3 border-t border-border space-y-3">
                <Input placeholder="Filtrer par modèle ou clé…" value={filter} onChange={e => setFilter(e.target.value)} className="h-8 text-xs" />
                <ScrollArea className="h-52">
                  <div className="space-y-1 pr-2">
                    {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucune clé trouvée.</p>}
                    {filtered.map((k, i) => {
                      // Determine which providers can use this key
                      const targets = pekpikProviders.filter(pid =>
                        (modelMap[pid] ?? []).some(m => k.model.toLowerCase().includes(m.split('-')[0]) || m === k.model)
                        || k.model === 'smart-chat'
                      );
                      return (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/40 group text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-mono text-primary truncate">{k.key.slice(0, 20)}…</span>
                              <CopyButton text={k.key} />
                            </div>
                            <div className="text-muted-foreground flex items-center gap-2">
                              <span className="font-medium text-foreground">{k.model}</span>
                              <span>·</span><span>{k.budget}</span>
                              <span>·</span><span>{k.expires}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {targets.slice(0, 2).map(pid => (
                              <Button key={pid} size="sm" variant="outline" className="h-6 px-2 text-xs"
                                onClick={() => onPick(pid, k.key)}>
                                → {PROVIDER_META[pid]?.label ?? pid}
                              </Button>
                            ))}
                            {targets.length === 0 && (
                              <Button size="sm" variant="outline" className="h-6 px-2 text-xs"
                                onClick={() => onPick("pekpik", k.key)}>
                                → FreeLLM Hub
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ── Main page ────────────────────────────────────────────────────────── */
  export default function ApiKeys() {
    const { settings, updateProvider } = useAppContext();
    const [statuses, setStatuses] = useState<Record<string, { status: KeyStatus; latencyMs?: number; error?: string }>>({});
    const [freeLLMKeys, setFreeLLMKeys] = useState<FreeLLMKey[]>([]);
    const [fetchingFreeLLM, setFetchingFreeLLM] = useState(false);
    const [expandedError, setExpandedError] = useState<string | null>(null);

    // Check all keys on mount
    useEffect(() => {
      settings.providers.forEach(p => {
        if (p.apiKey) checkKey(p.id, p.apiKey);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkKey = useCallback(async (providerId: string, apiKey: string) => {
      if (!apiKey) { setStatuses(s => ({ ...s, [providerId]: { status: 'missing' } })); return; }
      setStatuses(s => ({ ...s, [providerId]: { status: 'checking' } }));
      const result = await validateKey(providerId, apiKey);
      setStatuses(s => ({ ...s, [providerId]: result }));
      if (result.status === 'ok') toast.success(`${PROVIDER_META[providerId]?.label ?? providerId} — clé valide ✓`);
      if (result.status === 'error') toast.error(`${PROVIDER_META[providerId]?.label ?? providerId} — clé invalide`);
    }, []);

    const handleKeyChange = (providerId: string, value: string) => {
      updateProvider(providerId, { apiKey: value });
      setStatuses(s => ({ ...s, [providerId]: { status: 'idle' } }));
    };

    const handlePickFreeLLMKey = (providerId: string, key: string) => {
      updateProvider(providerId, { apiKey: key });
      setStatuses(s => ({ ...s, [providerId]: { status: 'idle' } }));
      checkKey(providerId, key);
      toast.success(`Clé appliquée à ${PROVIDER_META[providerId]?.label ?? providerId}`);
    };

    const handleRefreshFreeLLM = async () => {
      setFetchingFreeLLM(true);
      try {
        const keys = await fetchFreeLLMKeys();
        setFreeLLMKeys(keys);
        toast.success(`${keys.length} clés FreeLLM récupérées depuis GitHub`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Échec du chargement des clés FreeLLM");
      } finally {
        setFetchingFreeLLM(false);
      }
    };

    const handleCheckAll = () => {
      settings.providers.forEach(p => checkKey(p.id, p.apiKey));
    };

    const pekpikProviders = settings.providers.filter(p => PROVIDER_META[p.id]?.isPekpik);
    const standardProviders = settings.providers.filter(p => !PROVIDER_META[p.id]?.isPekpik);

    const activeCount = Object.values(statuses).filter(s => s.status === 'ok').length;

    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />Clés API
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeCount} clé{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""} sur {settings.providers.length} providers
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCheckAll}>
              <RefreshCw className="w-3.5 h-3.5" />Tout vérifier
            </Button>
          </div>

          {/* FreeLLM Hub section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                FreeLLM Hub
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">90+ modèles · Gratuit</Badge>
              </h2>
              <Button variant="outline" size="sm" className="gap-1.5 h-7 px-2 text-xs" onClick={handleRefreshFreeLLM} disabled={fetchingFreeLLM}>
                {fetchingFreeLLM ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Actualiser les clés
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Base URL : <code className="font-mono bg-secondary/50 px-1 py-0.5 rounded">{PEKPIK_BASE_URL}</code> — compatible OpenAI · clés valides 24-48h.{" "}
              <a href="https://github.com/alistaitsacle/free-llm-api-keys" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                Obtenir des clés gratuites <ExternalLink className="w-3 h-3" />
              </a>
            </p>

            {pekpikProviders.map(provider => {
              const meta = PROVIDER_META[provider.id];
              const st = statuses[provider.id];
              return (
                <div key={provider.id} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: provider.color }} />
                      <span className="text-sm font-medium">{meta?.label ?? provider.id}</span>
                      <span className="text-xs text-muted-foreground font-mono">{provider.model}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {st && <StatusBadge status={st.status} latencyMs={st.latencyMs} />}
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                        onClick={() => checkKey(provider.id, provider.apiKey)} disabled={!provider.apiKey || st?.status === 'checking'}>
                        <RefreshCw className={cn("w-3 h-3", st?.status === 'checking' && "animate-spin")} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={provider.apiKey}
                      onChange={e => handleKeyChange(provider.id, e.target.value)}
                      className="font-mono text-xs h-8 flex-1"
                    />
                    <Button size="sm" className="h-8 px-3 text-xs" onClick={() => checkKey(provider.id, provider.apiKey)} disabled={!provider.apiKey}>
                      Tester
                    </Button>
                  </div>
                  {st?.status === 'error' && (
                    <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                      <button className="flex items-center gap-1 w-full" onClick={() => setExpandedError(expandedError === provider.id ? null : provider.id)}>
                        <XCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{st.error}</span>
                        {expandedError !== provider.id && <ChevronDown className="w-3 h-3 ml-auto shrink-0" />}
                      </button>
                      {expandedError === provider.id && <div className="mt-1 break-all">{st.error}</div>}
                    </div>
                  )}
                </div>
              );
            })}

            {freeLLMKeys.length > 0 && (
              <FreeLLMDrawer keys={freeLLMKeys} onPick={handlePickFreeLLMKey} />
            )}
            {freeLLMKeys.length === 0 && (
              <button
                className="w-full border border-dashed border-border rounded-xl py-4 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors flex items-center justify-center gap-2"
                onClick={handleRefreshFreeLLM} disabled={fetchingFreeLLM}
              >
                {fetchingFreeLLM ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Charger les clés gratuites depuis GitHub
              </button>
            )}
          </div>

          {/* Standard providers */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium">Providers standards</h2>
            {standardProviders.map(provider => {
              const meta = PROVIDER_META[provider.id];
              const st = statuses[provider.id];
              const models = AVAILABLE_MODELS[provider.id] ?? [];
              return (
                <div key={provider.id} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: provider.color }} />
                      <span className="text-sm font-medium">{meta?.label ?? provider.id}</span>
                      <a href={meta?.docsUrl} target="_blank" rel="noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      {st && <StatusBadge status={st.status} latencyMs={st.latencyMs} />}
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                        onClick={() => checkKey(provider.id, provider.apiKey)} disabled={!provider.apiKey || st?.status === 'checking'}>
                        <RefreshCw className={cn("w-3 h-3", st?.status === 'checking' && "animate-spin")} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={provider.id === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
                      value={provider.apiKey}
                      onChange={e => handleKeyChange(provider.id, e.target.value)}
                      className="font-mono text-xs h-8 flex-1"
                    />
                    <Button size="sm" className="h-8 px-3 text-xs" onClick={() => checkKey(provider.id, provider.apiKey)} disabled={!provider.apiKey}>
                      Tester
                    </Button>
                  </div>
                  {st?.status === 'error' && (
                    <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-2 flex items-start gap-1.5">
                      <XCircle className="w-3 h-3 shrink-0 mt-0.5" /><span className="break-all">{st.error}</span>
                    </div>
                  )}
                  {models.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {models.map(m => (
                        <Badge key={m} variant="outline" className={cn("text-xs border-border", m === provider.model && "border-primary/40 text-primary")}>
                          {m === provider.model && <Clock className="w-3 h-3 mr-1" />}{m}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center pb-4">
            Les clés sont stockées localement dans votre navigateur. Aucune clé n'est envoyée à nos serveurs.
          </p>
        </div>
      </div>
    );
  }
  