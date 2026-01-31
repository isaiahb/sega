import React, { useState } from 'react';
import {
  LifeBuoy,
  Search,
  Book,
  MessageCircle,
  Server,
  ChevronDown,
  Mail,
  Zap,
  Shield,
  CreditCard,
  Globe
} from 'lucide-react';
import { clsx } from 'clsx';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {question}
        </span>
        <div className={clsx(
          "text-zinc-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )}>
          <ChevronDown size={18} />
        </div>
      </button>
      <div
        className={clsx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-48 opacity-100 pb-4" : "max-h-0 opacity-0"
        )}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
};

export const HelpView: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-black overflow-hidden">

      {/* Header with Search */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-8 pb-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              How can we help you?
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
              Search our knowledge base or browse categories below.
            </p>
          </div>

          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-zinc-400" />
            </div>
            <input
              type="text"
              className="w-full pl-11 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:outline-none transition-all shadow-sm"
              placeholder="Search for articles, guides, and troubleshooting..."
            />
          </div>
        </div>
      </div>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-8 space-y-12">

          {/* Quick Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {[
               { icon: Book, title: "Documentation", desc: "Start here" },
               { icon: Zap, title: "API Reference", desc: "For developers" },
               { icon: MessageCircle, title: "Community", desc: "Join the chat" },
               { icon: Server, title: "System Status", desc: "All operational", color: "text-emerald-500" },
             ].map((item, i) => (
               <button
                  key={i}
                  className="flex flex-col items-start p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-blue-500/50 hover:shadow-md transition-all group text-left"
               >
                  <div className={clsx(
                    "p-2.5 rounded-lg mb-3 transition-colors",
                    "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20",
                    item.color ? item.color : "text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  )}>
                    <item.icon size={20} />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    {item.desc}
                  </p>
               </button>
             ))}
          </div>

          {/* Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: FAQ */}
            <div className="space-y-6">
               <h2 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                 <LifeBuoy className="text-blue-500" size={20} />
                 Frequently Asked Questions
               </h2>

               <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-6 py-2 shadow-sm">
                  <FAQItem
                    question="How do I connect my calendar?"
                    answer="Navigate to Settings > Integrations > Google Calendar. Click 'Connect' and follow the OAuth flow to sync your meetings."
                  />
                  <FAQItem
                    question="Is my audio data private?"
                    answer="Yes. All audio processing happens locally on your device or via our encrypted private cloud (depending on your settings). We do not train on your data."
                  />
                  <FAQItem
                    question="Can I export my research notes?"
                    answer="Absolutely. You can export to Markdown, PDF, or directly to Notion/Linear from the Actions menu in any note."
                  />
                  <FAQItem
                    question="How does the glasses HUD work?"
                    answer="Ensure your Even Realities G1 glasses are paired via Bluetooth. The HUD preview will automatically activate when a session starts."
                  />
               </div>
            </div>

            {/* Right Column: Topics & Contact */}
            <div className="space-y-8">

              {/* Browse Topics */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Browse by Topic</h2>
                <div className="grid grid-cols-2 gap-3">
                   {[
                     { label: "Account & Billing", icon: CreditCard },
                     { label: "Privacy & Security", icon: Shield },
                     { label: "Integrations", icon: Globe },
                     { label: "Desktop App", icon: Zap },
                   ].map((topic, i) => (
                     <button key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left">
                        <topic.icon size={16} className="text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{topic.label}</span>
                     </button>
                   ))}
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <LifeBuoy size={120} />
                  </div>

                  <h3 className="text-lg font-bold mb-2 relative z-10">Still need help?</h3>
                  <p className="text-blue-100 text-sm mb-6 relative z-10 max-w-[80%]">
                    Our engineering support team is available Mon-Fri, 9am-6pm PST.
                  </p>

                  <button className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm relative z-10">
                     <Mail size={16} />
                     Contact Support
                  </button>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center text-xs text-zinc-500 dark:text-zinc-500">
            <p>&copy; 2026 Mentra Inc. All rights reserved.</p>
            <div className="flex gap-4 mt-2 md:mt-0">
               <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-300">Privacy Policy</a>
               <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-300">Terms of Service</a>
               <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-300">System Status</a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
