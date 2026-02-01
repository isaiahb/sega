/**
 * Executive Lens - Smart Executive Glasses Assistant
 *
 * Main webview interface with:
 * - Multi-view dashboard (Today, Notes, Actions, Agents, Settings, Help)
 * - Collapsible sidebar navigation
 * - Real-time transcription via SSE
 * - Onboarding flow for user profile setup
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useMentraAuth } from "@mentra/react";
import { Toaster } from "sonner";
import { clsx } from "clsx";
import { useSSE } from "./hooks/useSSE";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";

// Views
import { TodayView } from "./views/TodayView";
import { NotesView } from "./views/NotesView";
import { ActionsView } from "./views/ActionsView";
import { AgentsView } from "./views/AgentsView";
import { SettingsView } from "./views/SettingsView";
import { HelpView } from "./views/HelpView";
import { LandingView } from "./views/LandingView";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";


// =============================================================================
// Types
// =============================================================================

type ViewType = 'today' | 'notes' | 'actions' | 'agents' | 'settings' | 'help';

// =============================================================================
// App Component
// =============================================================================

export function App() {
  const { userId, isLoading, error, isAuthenticated } = useMentraAuth();
  const { isConnected } = useSSE(userId || null);

  // App state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('today');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentRoute, setCurrentRoute] = useState<'/' | '/app' | '/onboarding'>(
    window.location.pathname === '/onboarding'
      ? '/onboarding'
      : window.location.pathname === '/app'
      ? '/app'
      : '/'
  );

  // Check if on onboarding page or landing page
  const isOnboarding = useMemo(
    () => currentRoute === "/onboarding",
    [currentRoute],
  );

  const isLanding = useMemo(
    () => currentRoute === "/",
    [currentRoute],
  );

  // Toggle Theme Function
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Keyboard Navigation for Views
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "1" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setActiveView('today');
      }
      if (e.key === "3" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setActiveView('notes');
      }
      if (e.key === "5" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setActiveView('actions');
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/onboarding') {
        setCurrentRoute('/onboarding');
      } else if (path === '/app') {
        setCurrentRoute('/app');
      } else {
        setCurrentRoute('/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg"
          >
            <span className="text-white dark:text-zinc-900 font-bold text-2xl">E</span>
          </motion.div>
          <p className="text-zinc-500 dark:text-zinc-400">Loading Executive Lens...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500 mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-red-500 mb-2">
            Authentication Error
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">{error}</p>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-2">
            Open this page from the MentraOS app.
          </p>
        </motion.div>
      </div>
    );
  }

  // Route navigation handler
  const handleRouteNavigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentRoute(path as '/' | '/app' | '/onboarding');
    if (path === '/app') {
      setActiveView('today');
    }
  };

  // Render onboarding flow
  if (isOnboarding) {
    return (
      <OnboardingWizard
        userId={userId || ""}
        onComplete={() => handleRouteNavigate('/app')}
      />
    );
  }

  // Render landing page
  if (isLanding) {
    return <LandingView onNavigate={handleRouteNavigate} />;
  }

  // Navigation handler
  const handleNavigate = (view: string) => setActiveView(view as ViewType);

  // Render view based on activeView
  const renderView = () => {
    switch(activeView) {
      case 'today': return <TodayView onNavigate={handleNavigate} userId={userId || ""} />;
      case 'notes': return <NotesView />;
      case 'actions': return <ActionsView />;
      case 'agents': return <AgentsView />;
      case 'settings': return <SettingsView isDarkMode={theme === 'dark'} onToggleTheme={toggleTheme} />;
      case 'help': return <HelpView />;
      default: return <TodayView onNavigate={handleNavigate} userId={userId || ""} />;
    }
  };

  const getBreadcrumb = () => {
    return activeView.charAt(0).toUpperCase() + activeView.slice(1);
  };

  return (
    <div className={clsx("flex h-screen w-full font-sans bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800", theme)}>
      <Toaster position="top-center" theme={theme} />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        activeItem={activeView}
        onNavigate={(item) => setActiveView(item as ViewType)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-black relative transition-all duration-300">

        <TopBar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          title={getBreadcrumb()}
          onNavigate={(view) => setActiveView(view as ViewType)}
          isConnected={isConnected}
        />

        <main className="flex-1 overflow-hidden relative">
          {renderView()}
        </main>

      </div>
    </div>
  );
}
