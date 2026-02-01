import React, { useState, useEffect } from "react";
import {
  Bot,
  Shield,
  Sliders,
  Check,
  Zap,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { api, type UserSettings, type MeetingPreset } from "../api/client";
import { fetchWithFallback } from "../lib/devMode";
import { SkeletonLoader, ErrorState } from "../components/shared";

type AgentSection = "autonomy" | "classification" | "sensitive";

export const AgentsView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AgentSection>("autonomy");
  const [autonomyLevel, setAutonomyLevel] = useState<
    "capture_only" | "suggest" | "act_with_constraints"
  >("suggest");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [presets, setPresets] = useState<MeetingPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from backend
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: realSettings } = await fetchWithFallback(
        () => api.getSettings(),
        null,
        "Failed to load settings",
      );

      const { data: realPresets } = await fetchWithFallback(
        () => api.getPresets(),
        [],
        "Failed to load presets",
      );

      if (realSettings) {
        setSettings(realSettings);
        setAutonomyLevel(realSettings.autonomyLevel);
      }

      if (realPresets && realPresets.length > 0) {
        setPresets(realPresets);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const updated = await api.updateSettings(newSettings);
      setSettings(updated);
      setAutonomyLevel(updated.autonomyLevel);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  const renderContent = () => {
    if (loading) return <SkeletonLoader variant="card" count={3} />;
    if (error) return <ErrorState message={error} onRetry={loadSettings} />;

    switch (activeSection) {
      case "autonomy":
        return (
          <AutonomySettings
            level={autonomyLevel}
            setLevel={(l) => {
              setAutonomyLevel(
                l as "capture_only" | "suggest" | "act_with_constraints",
              );
              saveSettings({
                autonomyLevel: l as
                  | "capture_only"
                  | "suggest"
                  | "act_with_constraints",
              });
            }}
          />
        );
      case "classification":
        return <ClassificationSettings presets={presets} />;
      case "sensitive":
        return <SensitiveTopicsSettings />;
      default:
        return (
          <AutonomySettings
            level={autonomyLevel}
            setLevel={(l) => {
              setAutonomyLevel(
                l as "capture_only" | "suggest" | "act_with_constraints",
              );
              saveSettings({
                autonomyLevel: l as
                  | "capture_only"
                  | "suggest"
                  | "act_with_constraints",
              });
            }}
          />
        );
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-black">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 px-2">
          Configuration
        </h2>
        <div className="space-y-1">
          <NavButton
            active={activeSection === "autonomy"}
            onClick={() => setActiveSection("autonomy")}
            icon={Bot}
            label="Autonomy Levels"
          />
          <NavButton
            active={activeSection === "classification"}
            onClick={() => setActiveSection("classification")}
            icon={Sliders}
            label="Meeting Classification"
          />
          <NavButton
            active={activeSection === "sensitive"}
            onClick={() => setActiveSection("sensitive")}
            icon={Shield}
            label="Sensitive Topics"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// --- Sub Components ---

const NavButton = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={clsx(
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
      active
        ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white"
        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200",
    )}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const AutonomySettings = ({
  level,
  setLevel,
}: {
  level: string;
  setLevel: (l: "capture_only" | "suggest" | "act_with_constraints") => void;
}) => (
  <>
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
        Autonomy Settings
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        Control when and how the assistant acts on your behalf.
      </p>
    </div>

    {/* Autonomy Selector */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
      <AutonomyCard
        title="Capture Only"
        description="Records and summarizes. No outgoing actions."
        active={level === "capture_only"}
        onClick={() => setLevel("capture_only")}
        icon={Bot}
      />
      <AutonomyCard
        title="Suggest"
        description="Drafts emails and researches. Waits for approval."
        active={level === "suggest"}
        onClick={() => setLevel("suggest")}
        icon={Zap}
      />
      <AutonomyCard
        title="Act with Constraints"
        description="Sends internal summaries automatically. Asks for external."
        active={level === "act_with_constraints"}
        onClick={() => setLevel("act_with_constraints")}
        icon={Check}
      />
    </div>

    {/* Detailed Rules */}
    <div className="space-y-6">
      <Section title="Integrations & Permissions">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800">
          <IntegrationRow
            name="Google Calendar"
            status="Connected"
            description="Read-only access to meeting details"
          />
          <IntegrationRow
            name="Gmail"
            status="Connected"
            description="Draft creation enabled. Sending requires approval."
          />
          <IntegrationRow
            name="Slack"
            status="Disconnected"
            description="Post summaries to channels"
            isDisconnected
          />
        </div>
      </Section>
    </div>
  </>
);

const ClassificationSettings = ({
  presets = [],
}: {
  presets?: MeetingPreset[];
}) => {
  const [rules, setRules] = useState(
    presets.length > 0
      ? presets
      : [
          {
            id: "1",
            userId: "",
            name: "Standups",
            condition: "Title contains 'Standup' or 'Daily'",
            category: "Standup",
            isActive: true,
            userContext: "",
            noteRules: {
              detailLevel: "minimal",
              captureDecisions: false,
              captureActionItems: true,
            },
            researchTriggers: {
              autoResearchAttendees: false,
              autoResearchCompanies: false,
              autoResearchTopics: false,
            },
          },
          {
            id: "2",
            userId: "",
            name: "External Sales",
            condition: "Attendees include external domains",
            category: "External Call",
            isActive: true,
            userContext: "",
            noteRules: {
              detailLevel: "detailed",
              captureDecisions: true,
              captureActionItems: true,
            },
            researchTriggers: {
              autoResearchAttendees: true,
              autoResearchCompanies: true,
              autoResearchTopics: false,
            },
          },
          {
            id: "3",
            userId: "",
            name: "1:1s",
            condition: "Exactly 2 attendees",
            category: "Personnel",
            isActive: true,
            userContext: "",
            noteRules: {
              detailLevel: "standard",
              captureDecisions: true,
              captureActionItems: true,
            },
            researchTriggers: {
              autoResearchAttendees: false,
              autoResearchCompanies: false,
              autoResearchTopics: false,
            },
          },
          {
            id: "4",
            userId: "",
            name: "Design Reviews",
            condition: "Title contains 'Design' or 'UX'",
            category: "Design Review",
            isActive: false,
            userContext: "",
            noteRules: {
              detailLevel: "detailed",
              captureDecisions: true,
              captureActionItems: true,
            },
            researchTriggers: {
              autoResearchAttendees: false,
              autoResearchCompanies: false,
              autoResearchTopics: true,
            },
          },
        ],
  );

  const toggleRule = (index: number) => {
    setRules(
      rules.map((r, i) => (i === index ? { ...r, isActive: !r.isActive } : r)),
    );
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          Meeting Classification
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Rules for automatically categorizing meetings.
        </p>
      </div>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-medium">
            <tr>
              <th className="px-6 py-3">Rule Name</th>
              <th className="px-6 py-3">Condition</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3 text-right">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rules.map((rule, i) => (
              <tr
                key={i}
                className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                  {rule.name}
                </td>
                <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                  {rule.condition}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-700">
                    {rule.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => toggleRule(i)}
                    className={clsx(
                      "inline-flex w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors",
                      rule.isActive
                        ? "bg-emerald-500"
                        : "bg-zinc-300 dark:bg-zinc-700",
                    )}
                  >
                    <div
                      className={clsx(
                        "w-3 h-3 bg-white rounded-full shadow-sm transition-transform",
                        rule.isActive ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <button className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700">
            <Plus size={16} /> Add New Rule
          </button>
        </div>
      </div>
    </>
  );
};

const SensitiveTopicsSettings = () => {
  const [topics, setTopics] = useState([
    "Layoffs",
    "Acquisition",
    "Salary Review",
    "Legal Dispute",
    "Patent Filing",
    "HR Investigation",
  ]);

  const removeTopic = (topic: string) => {
    setTopics(topics.filter((t) => t !== topic));
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          Sensitive Topics
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Keywords that trigger enhanced privacy or redaction.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle
          className="text-amber-600 dark:text-amber-400 shrink-0"
          size={20}
        />
        <p className="text-sm text-amber-900 dark:text-amber-200">
          When these topics are detected, "Capture Only" mode is automatically
          enforced and no external summaries will be drafted.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics.map((topic) => (
          <div
            key={topic}
            className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm"
          >
            <span className="font-medium text-zinc-900 dark:text-white">
              {topic}
            </span>
            <button
              onClick={() => removeTopic(topic)}
              className="text-zinc-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button className="flex items-center justify-center gap-2 p-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
          <Plus size={16} />
          <span>Add Topic</span>
        </button>
      </div>
    </>
  );
};

// --- Shared Components ---

const AutonomyCard = ({
  title,
  description,
  active,
  onClick,
  icon: Icon,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
}) => (
  <div
    onClick={onClick}
    className={clsx(
      "p-5 rounded-xl border cursor-pointer transition-all relative overflow-hidden",
      active
        ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-900 dark:border-white ring-1 ring-zinc-900 dark:ring-white"
        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
    )}
  >
    <div className="flex items-center gap-3 mb-3">
      <div
        className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          active
            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
        )}
      >
        <Icon size={16} />
      </div>
      <h3 className="font-semibold text-zinc-900 dark:text-white">{title}</h3>
    </div>
    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      {description}
    </p>

    {active && (
      <div className="absolute top-3 right-3 text-zinc-900 dark:text-white">
        <Check size={16} />
      </div>
    )}
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div>
    <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
      {title}
    </h3>
    {children}
  </div>
);

const IntegrationRow = ({
  name,
  status,
  description,
  isDisconnected,
}: {
  name: string;
  status: string;
  description: string;
  isDisconnected?: boolean;
}) => (
  <div className="p-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div
        className={clsx(
          "w-2 h-2 rounded-full",
          isDisconnected ? "bg-zinc-300 dark:bg-zinc-700" : "bg-emerald-500",
        )}
      />
      <div>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
          {name}
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
    </div>
    <button
      className={clsx(
        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
        isDisconnected
          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent hover:opacity-90"
          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800",
      )}
    >
      {isDisconnected ? "Connect" : "Manage"}
    </button>
  </div>
);
