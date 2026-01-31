import React, { useState } from 'react';
import {
  Shield,
  Zap,
  AlertTriangle,
  Plus,
  X,
  Check
} from 'lucide-react';
import { clsx } from 'clsx';

// --- Types ---
interface ClassificationRule {
  id: string;
  name: string;
  condition: string;
  category: string;
  isActive: boolean;
}

// --- Mock Data ---
const mockRules: ClassificationRule[] = [
  { id: '1', name: 'Standup Detection', condition: 'title contains "Standup" OR "Daily"', category: 'Standup', isActive: true },
  { id: '2', name: 'External Sales', condition: 'has external attendees', category: 'External Call', isActive: true },
  { id: '3', name: '1:1 Meetings', condition: 'exactly 2 attendees', category: '1:1', isActive: true },
  { id: '4', name: 'Design Reviews', condition: 'title contains "Design" OR "UX"', category: 'Design Review', isActive: false },
];

const sensitiveTopics = [
  'Layoffs', 'Acquisition', 'Salary Review', 'Legal Dispute', 'Patent Filing', 'HR Investigation'
];

// --- Components ---

const AutonomyCard: React.FC<{
  title: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
}> = ({ title, description, isSelected, onSelect, icon }) => {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "p-6 rounded-2xl border-2 text-left transition-all",
        isSelected
          ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={clsx(
          "p-3 rounded-xl",
          isSelected ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
        )}>
          {icon}
        </div>
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center">
            <Check size={14} className="text-white dark:text-zinc-900" />
          </div>
        )}
      </div>
      <h3 className={clsx(
        "font-semibold mb-1",
        isSelected ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
      )}>
        {title}
      </h3>
      <p className="text-sm text-zinc-500">{description}</p>
    </button>
  );
};

// --- Main Component ---
export const AgentsView: React.FC = () => {
  const [selectedAutonomy, setSelectedAutonomy] = useState<string>('suggest');
  const [activeSection, setActiveSection] = useState<'autonomy' | 'classification' | 'sensitive'>('autonomy');
  const [rules, setRules] = useState(mockRules);
  const [topics, setTopics] = useState(sensitiveTopics);

  const autonomyLevels = [
    {
      id: 'capture',
      title: 'Capture Only',
      description: 'Records and summarizes meetings. No outgoing actions taken.',
      icon: <Shield size={20} />
    },
    {
      id: 'suggest',
      title: 'Suggest',
      description: 'Drafts emails and actions, but waits for your approval before sending.',
      icon: <Zap size={20} />
    },
    {
      id: 'act',
      title: 'Act with Constraints',
      description: 'Sends internal summaries automatically. External communications require approval.',
      icon: <AlertTriangle size={20} />
    },
  ];

  return (
    <div className="flex h-full bg-zinc-50 dark:bg-black">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Configuration</h2>
        <nav className="space-y-1">
          {[
            { id: 'autonomy', label: 'Autonomy Levels' },
            { id: 'classification', label: 'Meeting Classification' },
            { id: 'sensitive', label: 'Sensitive Topics' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={clsx(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                activeSection === item.id
                  ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeSection === 'autonomy' && (
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Autonomy Levels</h1>
            <p className="text-zinc-500 mb-8">Choose how much independence the agent has when handling your meetings.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {autonomyLevels.map(level => (
                <AutonomyCard
                  key={level.id}
                  title={level.title}
                  description={level.description}
                  icon={level.icon}
                  isSelected={selectedAutonomy === level.id}
                  onSelect={() => setSelectedAutonomy(level.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeSection === 'classification' && (
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Meeting Classification</h1>
            <p className="text-zinc-500 mb-8">Define rules to automatically categorize your meetings.</p>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase">Rule Name</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase">Condition</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white font-medium">{rule.name}</td>
                      <td className="px-4 py-3 text-sm text-zinc-500 font-mono text-xs">{rule.condition}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded-md">
                          {rule.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setRules(rules.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))}
                          className={clsx(
                            "w-10 h-6 rounded-full transition-colors relative",
                            rule.isActive ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                          )}
                        >
                          <div className={clsx(
                            "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                            rule.isActive ? "translate-x-5" : "translate-x-1"
                          )} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
              <Plus size={16} />
              Add Rule
            </button>
          </div>
        )}

        {activeSection === 'sensitive' && (
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Sensitive Topics</h1>
            <p className="text-zinc-500 mb-8">When these topics are detected, the agent will automatically switch to "Capture Only" mode.</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {topics.map(topic => (
                <div
                  key={topic}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg group"
                >
                  <span className="text-sm text-zinc-900 dark:text-white">{topic}</span>
                  <button
                    onClick={() => setTopics(topics.filter(t => t !== topic))}
                    className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
              <Plus size={16} />
              Add Topic
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
