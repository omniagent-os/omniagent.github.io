import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap, Brain, Layers, Shield, GitMerge, Activity,
  ArrowRight, ChevronRight, Code2, Globe, Sparkles
} from "lucide-react";

const PROVIDERS = [
  { id: "openai", label: "GPT-4o", color: "hsl(160 84% 39%)", delay: 0 },
  { id: "anthropic", label: "Claude", color: "hsl(30 100% 60%)", delay: 0.15 },
  { id: "google", label: "Gemini", color: "hsl(199 89% 48%)", delay: 0.3 },
  { id: "mistral", label: "Mistral", color: "hsl(262 83% 58%)", delay: 0.45 },
  { id: "deepseek", label: "DeepSeek", color: "hsl(220 100% 60%)", delay: 0.6 },
  { id: "groq", label: "Groq", color: "hsl(330 81% 60%)", delay: 0.75 },
];

const FEATURES = [
  {
    icon: GitMerge,
    title: "Parallel Intelligence",
    desc: "Every query fires simultaneously to all enabled models. No waiting in line — pure parallel computation.",
    color: "hsl(262 83% 68%)",
  },
  {
    icon: Brain,
    title: "Synthesis Engine",
    desc: "A dedicated synthesis pass combines the best of every model response into one superior, unified answer.",
    color: "hsl(199 89% 58%)",
  },
  {
    icon: Activity,
    title: "Live Response Feed",
    desc: "Watch each model respond in real time. See who's fastest, who's deepest, who's most creative.",
    color: "hsl(160 84% 49%)",
  },
  {
    icon: Layers,
    title: "Model Transparency",
    desc: "Every individual model response is preserved and viewable. No black boxes — full visibility into the reasoning.",
    color: "hsl(30 100% 60%)",
  },
  {
    icon: Shield,
    title: "Your Keys, Your Data",
    desc: "API keys are stored locally in your browser. Nothing is sent to any server. Fully self-hosted.",
    color: "hsl(43 96% 56%)",
  },
  {
    icon: Code2,
    title: "Zero Lock-in",
    desc: "Open source, no accounts, no subscription. Deploy to GitHub Pages and run it anywhere.",
    color: "hsl(330 81% 60%)",
  },
];

const STEPS = [
  { n: "01", title: "Send a message", desc: "Type your question or prompt in the Synergy Chat interface." },
  { n: "02", title: "Models activate in parallel", desc: "All enabled AI models receive your message simultaneously via their respective APIs." },
  { n: "03", title: "Watch responses arrive", desc: "Each model's response streams in as it completes, with timing and token data." },
  { n: "04", title: "Synthesis runs", desc: "A meta-prompt combines all responses into one superior, unified answer." },
  { n: "05", title: "Compare and explore", desc: "Review the synthesized answer or dive into each individual model's perspective." },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-full bg-background text-foreground">

      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 py-24 overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-center max-w-4xl mx-auto"
        >
          <Badge variant="outline" className="mb-6 text-xs font-mono tracking-widest uppercase border-primary/30 text-primary bg-primary/5">
            Multi-Model Synergy Engine
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none mb-6">
            <span className="gradient-text">Not one model.</span>
            <br />
            <span className="text-foreground">All of them.</span>
            <br />
            <span className="text-muted-foreground text-4xl md:text-6xl font-light">Simultaneously.</span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            OmniAgent Synergy sends every prompt to GPT-4o, Claude, Gemini, Mistral, and DeepSeek
            at the same time — then synthesizes their collective intelligence into one superior answer.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="gap-2 text-base h-12 px-8 synergy-glow"
              onClick={() => navigate("/chat")}
              data-testid="button-start-synergy"
            >
              Start Synergy Chat
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-base h-12 px-8"
              onClick={() => navigate("/settings")}
              data-testid="button-configure"
            >
              Configure API Keys
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Animated synergy visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative mt-20 w-full max-w-3xl mx-auto"
        >
          <div className="relative bg-card border border-border rounded-2xl p-6 synergy-glow overflow-hidden">
            {/* Top row: models */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              {PROVIDERS.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: p.delay + 0.5 }}
                  className="rounded-lg border p-2 text-center"
                  style={{ borderColor: `${p.color}40`, background: `${p.color}08` }}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2 h-2 rounded-full synergy-pulse" style={{ backgroundColor: p.color }} />
                    <span className="text-xs font-mono font-medium" style={{ color: p.color }}>{p.label}</span>
                  </div>
                  <div className="space-y-1">
                    {[1, 0.7, 0.4].map((op, i) => (
                      <div
                        key={i}
                        className="h-1 rounded-full"
                        style={{ backgroundColor: p.color, opacity: op, width: `${60 + i * 15}%` }}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Converging arrows */}
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono">
                <GitMerge className="w-4 h-4 text-primary" />
                <span className="text-primary">Synthesizing</span>
                <span className="inline-flex gap-1">
                  <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                </span>
              </div>
            </div>

            {/* Synthesis output */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="rounded-lg border border-primary/20 bg-primary/5 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-primary font-medium uppercase tracking-widest">Synthesized Answer</span>
              </div>
              <div className="space-y-2">
                {[1, 0.8, 0.6, 0.4].map((op, i) => (
                  <div
                    key={i}
                    className="h-2 rounded-full bg-primary"
                    style={{ opacity: op, width: `${95 - i * 15}%` }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 border-t border-border bg-card/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-xs font-mono uppercase tracking-widest border-border">
              How it works
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Intelligence at machine speed</h2>
          </div>
          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-6 py-8 border-b border-border last:border-0"
              >
                <div className="font-mono text-2xl font-bold text-primary/30 w-12 shrink-0 pt-1">{step.n}</div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-xs font-mono uppercase tracking-widest border-border">
              Capabilities
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Built different</h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
              Every design decision was made to surface the maximum possible intelligence from modern AI models.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: `${f.color}15`, color: f.color }}
                >
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Models grid */}
      <section className="py-24 px-6 border-t border-border bg-card/30">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-4 text-xs font-mono uppercase tracking-widest border-border">
            Supported Models
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">The full constellation</h2>
          <p className="text-muted-foreground mb-12 max-w-xl mx-auto">
            Configure any combination of providers. The more you enable, the richer the synthesis.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PROVIDERS.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border p-5 text-left"
                style={{ borderColor: `${p.color}30`, background: `${p.color}05` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="font-semibold text-sm" style={{ color: p.color }}>{p.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-mono">{p.id}.com</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to activate the swarm?
          </h2>
          <p className="text-muted-foreground mb-8">
            Add your API keys, enable your models, and experience what happens when AI models work together instead of alone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2 h-12 px-8 synergy-glow" onClick={() => navigate("/chat")} data-testid="button-cta-chat">
              Open Synergy Chat
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 h-12 px-8" onClick={() => navigate("/settings")} data-testid="button-cta-settings">
              Configure Providers
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <span className="text-sm font-semibold gradient-text">OmniAgent Synergy OS</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Open source — no server, no tracking, no subscription
          </p>
        </div>
      </footer>
    </div>
  );
}
