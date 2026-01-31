import React from 'react';
import { LifeBuoy, ExternalLink } from 'lucide-react';

export const HelpView = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-black p-8 text-center">
      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
        <LifeBuoy size={32} />
      </div>
      
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Help & Support</h1>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mb-8">
        Need assistance with Executive Lens? Browse our documentation or contact support.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        <a href="#" className="flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left group">
          <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
             <ExternalLink size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">Documentation</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Guides and API references</p>
          </div>
        </a>

        <button className="flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left group">
          <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
             <LifeBuoy size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">Contact Support</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Get help from our team</p>
          </div>
        </button>
      </div>
      
      <div className="mt-12 text-xs text-zinc-400">
        Version 2.1.0 (Build 492)
      </div>
    </div>
  );
};
