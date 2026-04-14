import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Router, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import { useEffect } from "react";

// Service Worker kaydi - Sel uyari sistemi icin
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/flood-hub-clone/sw.js', { scope: '/flood-hub-clone/' });
      console.log('[App] Service Worker basariyla kaydedildi.');
    } catch (err) {
      console.warn('[App] Service Worker kayit hatasi:', err);
    }
  }
}

// GitHub Pages base path - production'da /flood-hub-clone, dev'de /
const BASE_PATH = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <Router base={BASE_PATH}>
            <AppRoutes />
          </Router>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
