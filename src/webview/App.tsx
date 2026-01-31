/**
 * SEGA - Smart Executive Glasses Assistant
 *
 * Main webview interface with:
 * - Onboarding flow for user profile setup
 * - Chat interface for AI conversations
 * - Real-time transcription display
 * - Notes and research panel
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMentraAuth } from "@mentra/react";
import { useSSE } from "./hooks/useSSE";
import {
  Wifi,
  WifiOff,
  User,
  Send,
  Trash2,
  Bot,
  Loader2,
  Settings,
  FileText,
  Mic,
  MicOff,
  ChevronRight,
  Sparkles,
  Search,
  Mail,
  StickyNote,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  glassesDisplay?: string;
  timestamp: Date;
}

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

// =============================================================================
// App Component
// =============================================================================

export function App() {
  const { userId, isLoading, error, isAuthenticated } = useMentraAuth();

  // Check if on onboarding page
  const isOnboarding = useMemo(
    () => window.location.pathname === "/onboarding",
    [],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-slate-400">Loading SEGA...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500 mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-red-400 mb-2">
            Authentication Error
          </h2>
          <p className="text-slate-400 text-sm">{error}</p>
          <p className="text-slate-500 text-xs mt-2">
            Open this page from the MentraOS app.
          </p>
        </motion.div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Authentication Required
          </h2>
          <p className="text-slate-400 text-sm">
            Open this webview from MentraOS to authenticate.
          </p>
        </motion.div>
      </div>
    );
  }

  // Render onboarding or main chat
  if (isOnboarding) {
    return <OnboardingFlow userId={userId} />;
  }

  return <SegaChat userId={userId} />;
}

// =============================================================================
// Onboarding Flow
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Progress */}
      <div className="p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i <= step
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    i < step ? "bg-indigo-500" : "bg-slate-700"
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
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">
                Welcome to SEGA
              </h1>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Your Smart Executive Glasses Assistant. Tell me about yourself
                and I'll adapt to help with meetings, research, notes, and more.
              </p>
              <button
                onClick={() => setStep(1)}
                className="px-8 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors inline-flex items-center gap-2"
              >
                Get Started <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6">
                Tell me about yourself
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={profile.name || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    placeholder="John Smith"
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white border border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Your Role
                  </label>
                  <input
                    type="text"
                    value={profile.role || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, role: e.target.value })
                    }
                    placeholder="e.g., Sales Rep, Investor, Engineer, Doctor, Journalist..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white border border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Company / Organization (optional)
                  </label>
                  <input
                    type="text"
                    value={profile.company || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, company: e.target.value })
                    }
                    placeholder="Where you work"
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white border border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Email (for reports, optional)
                  </label>
                  <input
                    type="email"
                    value={profile.email || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white border border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors inline-flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-2">
                What are you interested in?
              </h2>
              <p className="text-slate-400 text-sm mb-6">
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
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors inline-flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-2">
                What should I listen for?
              </h2>
              <p className="text-slate-400 text-sm mb-6">
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
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors inline-flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-green-500/30">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">
                You're all set!
              </h1>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                SEGA is ready to assist you. Put on your glasses and start
                speaking - I'll adapt to your needs and help however I can.
              </p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={handleComplete}
                  className="px-8 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors inline-flex items-center justify-center gap-2"
                >
                  Open SEGA <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="px-8 py-3 rounded-xl text-slate-400 hover:text-white transition-colors"
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

// =============================================================================
// Main Chat Interface
// =============================================================================

function SegaChat({ userId }: { userId: string }) {
  const { isConnected, lastEvent } = useSSE(userId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle SSE events
  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case "transcription":
        if (lastEvent.isFinal) {
          // Add user message when transcription is final
          setMessages((prev) => [
            ...prev,
            {
              id: `user-voice-${Date.now()}`,
              role: "user",
              content: lastEvent.text,
              timestamp: new Date(),
            },
          ]);
          setTranscription(null);
          setIsProcessing(true);
        } else {
          setTranscription(lastEvent.text);
        }
        break;

      case "agent_progress":
        setAgentStatus(lastEvent.message || "Processing...");
        break;

      case "agent_complete":
        setAgentStatus(null);
        setIsProcessing(false);
        setTranscription(null);
        if (lastEvent.response) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: lastEvent.response.webviewContent,
              glassesDisplay: lastEvent.response.glassesDisplay,
              timestamp: new Date(),
            },
          ]);
        }
        break;

      case "agent_error":
        setAgentStatus(null);
        setIsProcessing(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `Error: ${lastEvent.error}`,
            timestamp: new Date(),
          },
        ]);
        break;
    }
  }, [lastEvent]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput("");
    setIsProcessing(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      },
    ]);

    try {
      const response = await fetch("/api/agent/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: userMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      setIsProcessing(false);
      setAgentStatus(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Clear history
  const handleClear = async () => {
    try {
      await fetch("/api/agent/clear", {
        method: "POST",
        credentials: "include",
      });
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 px-4 py-3 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">SEGA</h1>
              <p className="text-xs text-slate-400">
                Smart Executive Glasses Assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ${
                isConnected
                  ? "bg-green-500/10 text-green-400"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Disconnected</span>
                </>
              )}
            </div>
            {/* Clear Button */}
            <button
              onClick={handleClear}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {/* Settings */}
            <button
              onClick={() => (window.location.href = "/onboarding")}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Live Transcription Banner */}
      <AnimatePresence>
        {transcription && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-indigo-500/10 border-b border-indigo-500/20 px-4 py-2"
          >
            <div className="max-w-4xl mx-auto flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-indigo-300 text-sm">{transcription}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">
                Ready to assist
              </h2>
              <p className="text-slate-400 max-w-md mx-auto mb-8">
                Speak through your glasses or type below. I can help with
                research, note-taking, and sending email summaries.
              </p>

              {/* Quick Actions */}
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setInput("Research ")}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
                >
                  <Search className="w-4 h-4" /> Research
                </button>
                <button
                  onClick={() => setInput("Take a note: ")}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
                >
                  <StickyNote className="w-4 h-4" /> Take Note
                </button>
                <button
                  onClick={() => setInput("Email me a summary of ")}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" /> Email Summary
                </button>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-800 border border-slate-700"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
                        <Bot className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs text-slate-400">SEGA</span>
                      </div>
                    )}
                    <div
                      className={`text-sm whitespace-pre-wrap ${
                        message.role === "user"
                          ? "text-white"
                          : "text-slate-200"
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.glassesDisplay && (
                      <div className="mt-3 pt-2 border-t border-slate-700">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <span>👓</span> {message.glassesDisplay}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Agent Status */}
          {(agentStatus || isProcessing) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-sm text-slate-400 bg-slate-800/50 rounded-xl px-4 py-3"
            >
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>{agentStatus || "Processing..."}</span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="bg-slate-800/50 backdrop-blur border-t border-slate-700 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-700 text-white border border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="px-4 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Speak through your glasses or type here • Research • Notes • Email
          </p>
        </div>
      </footer>
    </div>
  );
}
