import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { AppLayout } from "@/components/AppLayout";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import Settings from "@/pages/Settings";
import History from "@/pages/History";
import Share from "@/pages/Share";
import ApiKeys from "@/pages/ApiKeys";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat" component={Chat} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/settings" component={Settings} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route path="/history" component={History} />
      <Route path="/share" component={Share} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Wouter base path: strip trailing slash from Vite's BASE_URL.
  // In dev BASE_URL is "/", which becomes "" (no base). On GitHub Pages it
  // becomes "/omniagent.github.io" so deep links resolve correctly.
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  return (
    <AppProvider>
      <TooltipProvider>
        <WouterRouter base={base}>
          <AppLayout>
            <Router />
          </AppLayout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </AppProvider>
  );
}

export default App;
