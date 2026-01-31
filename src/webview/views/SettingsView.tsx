import React from 'react';
import {
  User,
  Bell,
  Database,
  Moon,
  Sun,
  Mic,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsViewProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ isDarkMode, onToggleTheme }) => {
  return (
    <div className="h-full bg-zinc-50 dark:bg-black p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">Settings</h1>

        {/* General Section */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">General</h2>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <User size={18} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">Account</p>
                  <p className="text-xs text-zinc-500">Manage your profile and preferences</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <Bell size={18} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">Notifications</p>
                  <p className="text-xs text-zinc-500">Configure alerts and reminders</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <Database size={18} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">Data & Storage</p>
                  <p className="text-xs text-zinc-500">Manage your data and storage usage</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
            </button>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Preferences</h2>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <Mic size={18} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">Live Transcription</p>
                  <p className="text-xs text-zinc-500">Enable real-time speech-to-text</p>
                </div>
              </div>
              <button className="w-10 h-6 rounded-full bg-emerald-500 relative">
                <div className="absolute top-1 translate-x-5 w-4 h-4 rounded-full bg-white" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  {isDarkMode ? <Moon size={18} className="text-zinc-600 dark:text-zinc-400" /> : <Sun size={18} className="text-zinc-600 dark:text-zinc-400" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">Dark Mode</p>
                  <p className="text-xs text-zinc-500">Toggle dark/light theme</p>
                </div>
              </div>
              <button
                onClick={onToggleTheme}
                className={clsx(
                  "w-10 h-6 rounded-full relative transition-colors",
                  isDarkMode ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                )}
              >
                <div className={clsx(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  isDarkMode ? "translate-x-5" : "translate-x-1"
                )} />
              </button>
            </div>
          </div>
        </section>

        {/* Version */}
        <div className="text-center text-xs text-zinc-400">
          Executive Lens v1.0.2
        </div>
      </div>
    </div>
  );
};
