import React from 'react';
import {
  HelpCircle,
  BookOpen,
  MessageCircle,
  Mail,
  ExternalLink,
  Keyboard,
  Glasses
} from 'lucide-react';

export const HelpView: React.FC = () => {
  const shortcuts = [
    { keys: ['⌘', 'K'], description: 'Open command palette' },
    { keys: ['⌘', '1'], description: 'Go to Today view' },
    { keys: ['⌘', '3'], description: 'Go to Notes view' },
    { keys: ['⌘', '5'], description: 'Go to Actions view' },
  ];

  const resources = [
    { title: 'Getting Started Guide', description: 'Learn the basics of Executive Lens', icon: BookOpen },
    { title: 'Keyboard Shortcuts', description: 'Master productivity with shortcuts', icon: Keyboard },
    { title: 'Glasses Setup', description: 'Configure your Even Realities G1', icon: Glasses },
  ];

  return (
    <div className="h-full bg-zinc-50 dark:bg-black p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Help & Support</h1>
        <p className="text-zinc-500 mb-8">Get help with Executive Lens</p>

        {/* Quick Resources */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Quick Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resources.map((resource, i) => (
              <button
                key={i}
                className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group"
              >
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-fit mb-3 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                  <resource.icon size={20} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <h3 className="font-medium text-zinc-900 dark:text-white mb-1">{resource.title}</h3>
                <p className="text-sm text-zinc-500">{resource.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Keyboard Shortcuts</h2>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {shortcuts.map((shortcut, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-4 ${i < shortcuts.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
              >
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <kbd
                      key={j}
                      className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Support */}
        <section>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Contact Support</h2>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <HelpCircle size={24} className="text-zinc-600 dark:text-zinc-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-zinc-900 dark:text-white mb-1">Need more help?</h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Our support team is available 24/7 to help you with any questions or issues.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90">
                    <MessageCircle size={16} />
                    Start Chat
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700">
                    <Mail size={16} />
                    Email Support
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-sm">
                    <ExternalLink size={16} />
                    Documentation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
