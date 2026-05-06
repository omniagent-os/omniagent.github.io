import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { AVAILABLE_MODELS } from "@/lib/providers";
import { toast } from "sonner";
import {
  Eye, EyeOff, CheckCircle2, XCircle, Zap, Shield, Layers,
  Settings as SettingsIcon, Key, AlertTriangle
} from "lucide-react";

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  openai: "OpenAI — GPT-4o, GPT-4-turbo",
  anthropic: "Anthropic Claude — Requires CORS proxy for browser use",
  google: "Google Gemini — Gemini 1.5 Pro/Flash",
  mistral: "Mistral AI — Mistral Large, Medium",
  deepseek: "DeepSeek — Chat and Coder models",
  groq: "Groq — Ultra-fast inference (Llama, Mixtral)",
};

const SYNERGY_MODES = [
  {
    id: "quality",
    label: "Quality",
    icon: Layers,
    desc: "Use all enabled models with maximum context. Best results, slower response.",
  },
  {
    id: "balanced",
    label: "Balanced",
    icon: SettingsIcon,
    desc: "Use the top 4 models by speed. Good balance of quality and latency.",
  },
  {
    id: "speed",
    label: "Speed",
    icon: Zap,
    desc: "Use only the 3 fastest models. Prioritize response time.",
  },
];

function ProviderCard({ providerId }: { providerId: string }) {
  const { settings, updateProvider } = useAppContext();
  const provider = settings.providers.find(p => p.id === providerId);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  if (!provider) return null;

  const handleTestConnection = async () => {
    if (!provider.apiKey) {
      toast.error("Please enter an API key first");
      return;
    }
    if (provider.id === "anthropic") {
      toast.error("Anthropic blocks browser CORS requests. A proxy server is required.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      let endpoint = "";
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      let body: Record<string, unknown> = {};

      if (provider.id === "google") {
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`;
        body = { contents: [{ role: "user", parts: [{ text: "Hi" }] }] };
      } else {
        const endpoints: Record<string, string> = {
          openai: "https://api.openai.com/v1/chat/completions",
          mistral: "https://api.mistral.ai/v1/chat/completions",
          deepseek: "https://api.deepseek.com/chat/completions",
          groq: "https://api.groq.com/openai/v1/chat/completions",
        };
        endpoint = endpoints[provider.id];
        headers["Authorization"] = `Bearer ${provider.apiKey}`;
        body = {
          model: provider.model,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 5,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setTestResult("success");
        toast.success(`${provider.label} connection successful`);
      } else {
        setTestResult("error");
        toast.error(`${provider.label}: HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestResult("error");
      toast.error(`Connection failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
      style={{ borderColor: provider.enabled ? `${provider.color}30` : undefined }}
      data-testid={`provider-card-${providerId}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: provider.color }} />
          <div>
            <div className="font-semibold text-sm">{provider.label}</div>
            <div className="text-xs text-muted-foreground">{PROVIDER_DESCRIPTIONS[provider.id]}</div>
          </div>
        </div>
        <Switch
          checked={provider.enabled}
          onCheckedChange={(val) => updateProvider(providerId, { enabled: val })}
          data-testid={`switch-provider-${providerId}`}
        />
      </div>

      {provider.id === "anthropic" && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-500/80">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Anthropic blocks direct browser requests due to CORS. A local proxy server is required.
        </div>
      )}

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">API Key</Label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={provider.apiKey}
                onChange={(e) => updateProvider(providerId, { apiKey: e.target.value })}
                placeholder="sk-..."
                className="pr-9 text-sm font-mono"
                data-testid={`input-apikey-${providerId}`}
              />
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !provider.apiKey}
              className="shrink-0 gap-1 text-xs"
              data-testid={`button-test-${providerId}`}
            >
              {testing ? (
                "Testing..."
              ) : testResult === "success" ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> OK</>
              ) : testResult === "error" ? (
                <><XCircle className="w-3.5 h-3.5 text-destructive" /> Fail</>
              ) : (
                "Test"
              )}
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Model</Label>
          <Select
            value={provider.model}
            onValueChange={(val) => updateProvider(providerId, { model: val })}
          >
            <SelectTrigger className="text-sm" data-testid={`select-model-${providerId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(AVAILABLE_MODELS[providerId] || []).map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
}

export default function Settings() {
  const { settings, updateSettings } = useAppContext();
  const enabledCount = settings.providers.filter(p => p.enabled).length;
  const configuredCount = settings.providers.filter(p => p.apiKey).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your AI providers and synergy preferences. All data is stored locally in your browser.
        </p>
        <div className="flex gap-3 mt-4">
          <Badge variant="outline" className="gap-1 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {enabledCount} models enabled
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Key className="w-3 h-3" />
            {configuredCount} API keys configured
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Shield className="w-3 h-3" />
            Stored locally only
          </Badge>
        </div>
      </div>

      {/* Synergy Mode */}
      <div>
        <h2 className="font-semibold mb-1">Synergy Mode</h2>
        <p className="text-muted-foreground text-xs mb-4">Controls which models are used and how responses are prioritized.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SYNERGY_MODES.map((mode) => {
            const active = settings.synergyMode === mode.id;
            return (
              <button
                key={mode.id}
                className={`rounded-xl border p-4 text-left transition-all ${
                  active ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/20"
                }`}
                onClick={() => updateSettings({ synergyMode: mode.id as any })}
                data-testid={`button-mode-${mode.id}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <mode.icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${active ? "text-primary" : ""}`}>{mode.label}</span>
                  {active && <Badge className="ml-auto text-xs py-0 h-4">Active</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{mode.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Synthesis provider */}
      <div>
        <h2 className="font-semibold mb-1">Synthesis Model</h2>
        <p className="text-muted-foreground text-xs mb-3">Which provider handles the synthesis step (combining all responses).</p>
        <Select
          value={settings.synthesisProvider}
          onValueChange={(val) => updateSettings({ synthesisProvider: val })}
        >
          <SelectTrigger className="w-64 text-sm" data-testid="select-synthesis-provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settings.providers.filter(p => p.id !== "anthropic").map(p => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Provider Cards */}
      <div>
        <h2 className="font-semibold mb-1">AI Providers</h2>
        <p className="text-muted-foreground text-xs mb-4">
          Enter API keys for each provider you want to include in the synergy. Keys are saved to localStorage and never leave your device.
        </p>
        <div className="grid gap-4">
          {settings.providers.map(p => (
            <ProviderCard key={p.id} providerId={p.id} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Privacy & Security
        </h2>
        <div className="space-y-2 text-xs text-muted-foreground mt-2">
          <p>API keys are stored exclusively in your browser's localStorage. They are never transmitted to any server operated by this application.</p>
          <p>All AI requests are made directly from your browser to the respective provider's API endpoints. Your conversations are stored locally only.</p>
          <p>Clearing your browser's localStorage will remove all stored keys and conversations.</p>
        </div>
      </div>
    </div>
  );
}
