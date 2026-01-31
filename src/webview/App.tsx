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

import {
  Sparkles,
  User,
  Search,
  Mic,
  Bot,
  ChevronRight,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface UserProfile {
  name: string;
  role: string;
  company: string;
  email: string;
  interests: string[];
  listenFor: string[];
  researchFocus: string[];
  noteStyle: string;
  customInstructions?: string;
}

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

  // Check if on onboarding page
  const isOnboarding = useMemo(
    () => window.location.pathname === "/onboarding",
    [],
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

  // Render onboarding or main app
  if (isOnboarding) {
    return <OnboardingFlow userId={userId || ""} />;
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

// =============================================================================
// Onboarding Flow (Preserved and restyled)
// =============================================================================

function OnboardingFlow({ userId }: { userId: string }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: "",
    role: "",
    company: "",
    email: "",
    interests: [],
    listenFor: [],
    researchFocus: [],
    noteStyle: "Concise bullet points with key metrics highlighted",
  });

  const steps = [
    { title: "Welcome", icon: Sparkles },
    { title: "About You", icon: User },
    { title: "Interests", icon: Search },
    { title: "Listening", icon: Mic },
    { title: "Ready", icon: Bot },
  ];

  const handleComplete = async () => {
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profile),
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col">
      {/* Progress */}
      <div className="p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i <= step
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    i < step ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full max-w-xl"
        >
          {step === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-zinc-900 dark:bg-white mx-auto mb-6 flex items-center justify-center shadow-lg">
                <span className="text-white dark:text-zinc-900 font-bold text-3xl">E</span>
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                Welcome to Executive Lens
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
                Your Smart Executive Glasses Assistant. Tell me about yourself
                and I'll adapt to help with meetings, research, notes, and more.
              </p>
              <button
                onClick={() => setStep(1)}
                className="px-8 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:opacity-90 transition-colors inline-flex items-center gap-2"
              >
                Get Started <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">
                Tell me about yourself
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={profile.name || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    placeholder="John Smith"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                    Your Role
                  </label>
                  <input
                    type="text"
                    value={profile.role || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, role: e.target.value })
                    }
                    placeholder="e.g., Sales Rep, Investor, Engineer, Doctor, Journalist..."
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                    Company / Organization (optional)
                  </label>
                  <input
                    type="text"
                    value={profile.company || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, company: e.target.value })
                    }
                    placeholder="Where you work"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                    Email (for reports, optional)
                  </label>
                  <input
                    type="email"
                    value={profile.email || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:opacity-90 transition-colors inline-flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                What are you interested in?
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                Select topics you care about. I'll tailor research and notes to
                these areas.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  "Technology",
                  "Business",
                  "Finance",
                  "Healthcare",
                  "Legal",
                  "Sales",
                  "Marketing",
                  "Engineering",
                  "Research",
                  "Education",
                  "Media",
                  "Real Estate",
                  "Consulting",
                  "Startups",
                ].map((interest) => (
                  <button
                    key={interest}
                    onClick={() => {
                      const current = profile.interests || [];
                      setProfile({
                        ...profile,
                        interests: current.includes(interest)
                          ? current.filter((i) => i !== interest)
                          : [...current, interest],
                      });
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      profile.interests?.includes(interest)
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:opacity-90 transition-colors inline-flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                What should I listen for?
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                During meetings and conversations, I'll pay special attention to
                these.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  "Action items",
                  "Key decisions",
                  "Names & contacts",
                  "Dates & deadlines",
                  "Questions asked",
                  "Follow-ups needed",
                  "Numbers & metrics",
                  "Problems mentioned",
                  "Ideas & suggestions",
                  "Agreements made",
                  "Concerns raised",
                  "Next steps",
                ].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      const current = profile.listenFor || [];
                      setProfile({
                        ...profile,
                        listenFor: current.includes(item)
                          ? current.filter((i) => i !== item)
                          : [...current, item],
                      });
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      profile.listenFor?.includes(item)
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:opacity-90 transition-colors inline-flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500 mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                You're all set!
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
                Executive Lens is ready to assist you. Put on your glasses and start
                speaking - I'll adapt to your needs and help however I can.
              </p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={handleComplete}
                  className="px-8 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:opacity-90 transition-colors inline-flex items-center justify-center gap-2"
                >
                  Open Executive Lens <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="px-8 py-3 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
