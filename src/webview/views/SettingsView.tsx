import React from 'react';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsViewProps {
    isDarkMode: boolean;
    onToggleTheme: () => void;
}

const SettingsRow = ({
    label,
    value,
    type = 'arrow',
    onClick,
    active
}: {
    label: string;
    value?: string;
    type?: 'arrow' | 'toggle' | 'none';
    onClick?: () => void;
    active?: boolean;
}) => (
    <div
        onClick={type === 'toggle' ? undefined : onClick}
        className={clsx(
            "flex items-center justify-between py-5 border-b border-zinc-100 dark:border-zinc-800 transition-colors px-6 -mx-6",
            onClick && type !== 'toggle' ? "cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50" : ""
        )}
    >
        <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">{label}</span>

        <div className="flex items-center gap-3">
            {value && <span className="text-sm text-zinc-500">{value}</span>}
            {type === 'arrow' && <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-600" />}
            {type === 'toggle' && (
                <button
                    onClick={onClick}
                    className={clsx("w-11 h-6 rounded-full p-1 relative transition-colors cursor-pointer", active ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700")}
                >
                    <div className={clsx("w-4 h-4 rounded-full absolute shadow-sm transition-transform top-1",
                        active ? "bg-white dark:bg-black translate-x-5" : "bg-white dark:bg-black translate-x-0"
                    )} />
                </button>
            )}
        </div>
    </div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ isDarkMode, onToggleTheme }) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-black transition-colors">
       {/* Minimal Header matching FolderList */}
       <div className="px-6 pt-12 pb-4 sticky top-0 bg-white dark:bg-black z-10 border-b border-zinc-100 dark:border-zinc-800 transition-colors">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Settings</h1>
       </div>

       <div className="flex-1 overflow-y-auto px-6 pb-24">
           {/* General Section */}
           <div className="mt-6 mb-2">
               <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">General</h3>
               <SettingsRow label="Account" onClick={() => {}} />
               <SettingsRow label="Notifications" onClick={() => {}} />
               <SettingsRow label="Data & Storage" onClick={() => {}} />
           </div>

           {/* Preferences Section */}
           <div className="mt-8 mb-2">
               <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Preferences</h3>
               <SettingsRow label="Live Transcription" type="toggle" active={true} onClick={() => {}} />
               <SettingsRow label="Dark Mode" type="toggle" active={isDarkMode} onClick={onToggleTheme} />
           </div>

           <div className="mt-12 text-center">
               <p className="text-xs text-zinc-400 dark:text-zinc-600">Executive Lens v1.0.2</p>
           </div>
       </div>
    </div>
  );
};
