import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Frame from "@/imports/Frame";
import { Radio, Database, Search, Send, Clock, ChevronRight, Loader2, Sparkles } from "lucide-react";

export function ProductProof() {
  const [activeTab, setActiveTab] = useState<'capture' | 'act'>('capture');

  return (
    <section className="py-24 bg-zinc-50 border-t border-zinc-200">
      <div className="max-w-[1400px] mx-auto px-6">
        
        <div className="flex flex-col md:flex-row items-start justify-between gap-12 mb-16">
            <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 mb-6">
                    A complete feedback loop. <br/>
                    <span className="text-zinc-400">From messy reality to clean output.</span>
                </h2>
                <div className="flex gap-1">
                    <TabButton 
                        isActive={activeTab === 'capture'} 
                        onClick={() => setActiveTab('capture')}
                        label="01. Capture & Context"
                    />
                     <TabButton 
                        isActive={activeTab === 'act'} 
                        onClick={() => setActiveTab('act')}
                        label="02. Research & Action"
                    />
                </div>
            </div>
            
            <div className="hidden md:block w-px h-32 bg-zinc-200" />
            
            <div className="max-w-xs text-sm text-zinc-500 leading-relaxed pt-2">
                <p>
                    Most assistants just record. Executive Assistant thinks. It connects the dots between your meetings, documents, and external data to drive work forward.
                </p>
            </div>
        </div>

        {/* Interface Display */}
        <div className="relative rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden h-[700px] flex flex-col md:flex-row">
            
            {/* Sidebar / Controls */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-100 bg-zinc-50/50 p-6 flex flex-col gap-6 shrink-0">
                <div className="space-y-4">
                     <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Live Activity</h3>
                     
                     {/* Activity Item 1 */}
                     <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm hover:border-orange-200 transition-colors cursor-default group">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-2 h-2 rounded-full ${activeTab === 'capture' ? 'bg-red-500 animate-pulse' : 'bg-zinc-300'}`} />
                            <span className="text-xs font-medium text-zinc-900">Weekly Product Sync</span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            {activeTab === 'capture' ? 'Recording audio & capturing screen context...' : 'Meeting ended 12m ago.'}
                        </p>
                     </div>

                     {/* Activity Item 2 */}
                     <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm hover:border-blue-200 transition-colors cursor-default group">
                        <div className="flex items-center gap-3 mb-2">
                            <Loader2 className={`w-3 h-3 ${activeTab === 'act' ? 'text-blue-500 animate-spin' : 'text-zinc-300'}`} />
                            <span className="text-xs font-medium text-zinc-900">Background Research</span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            {activeTab === 'act' ? 'Cross-referencing linear roadmap with competitor pricing...' : 'Waiting for triggers.'}
                        </p>
                     </div>
                </div>

                <div className="mt-auto p-4 rounded-xl bg-orange-50/50 border border-orange-100 text-orange-900 text-xs leading-relaxed">
                    <Sparkles className="w-3 h-3 text-orange-500 mb-2 fill-current" />
                    <strong>System Note:</strong><br/>
                    Autonomy level set to <span className="underline decoration-orange-300 decoration-dotted cursor-help">Semi-Active</span>. All external emails require approval.
                </div>
            </div>

            {/* Main Viewport */}
            <div className="flex-1 relative bg-white overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeTab === 'capture' ? (
                        <motion.div 
                            key="capture"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.4 }}
                            className="absolute inset-0 bg-zinc-50"
                        >
                            <div className="absolute inset-0 flex items-center justify-center p-8 md:p-12">
                                <div className="w-full h-full relative shadow-2xl rounded-lg overflow-hidden border border-zinc-200">
                                    <div className="absolute inset-0 origin-top-left scale-[0.6] sm:scale-[0.8] w-[1103px] h-[900px] bg-white">
                                        <Frame />
                                    </div>
                                    {/* Overlay UI for Context */}
                                    <div className="absolute bottom-8 left-8 right-8 bg-zinc-900/90 backdrop-blur text-white p-4 rounded-xl flex items-center justify-between border border-white/10 shadow-xl max-w-lg mx-auto">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                                <Radio className="w-5 h-5 text-red-500" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">Listening & Observing</div>
                                                <div className="text-xs text-zinc-400">Identifying action items...</div>
                                            </div>
                                        </div>
                                        <div className="h-8 w-px bg-white/20" />
                                        <div className="font-mono text-xs text-zinc-400">00:14:23</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="act"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.4 }}
                            className="absolute inset-0 bg-zinc-900 flex flex-col"
                        >
                            {/* Dark Mode "Terminal/Backend" View */}
                            <div className="h-10 border-b border-zinc-800 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                <div className="ml-4 px-3 py-1 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono">
                                    task_id: 8f92-ac10
                                </div>
                            </div>
                            
                            <div className="flex-1 p-8 overflow-y-auto font-mono text-sm">
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="text-zinc-400"
                                    >
                                        <span className="text-blue-400">➜</span> Analyzing transcript for "Competitor Pricing"...
                                    </motion.div>
                                    
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="pl-4 border-l border-zinc-800 space-y-2"
                                    >
                                        <div className="flex items-center gap-2 text-zinc-300">
                                            <Search className="w-3 h-3" />
                                            <span>Searching Internal Wiki...</span>
                                            <span className="text-green-500 text-xs ml-2">[Found 3 docs]</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-300">
                                            <Database className="w-3 h-3" />
                                            <span>Querying Firecrawl for "Lumina Pricing 2025"...</span>
                                            <span className="text-green-500 text-xs ml-2">[Success]</span>
                                        </div>
                                    </motion.div>

                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.8 }}
                                        className="bg-zinc-800/50 rounded p-4 border border-zinc-700/50"
                                    >
                                        <div className="text-zinc-500 text-xs mb-2">GENERATED OUTPUT</div>
                                        <p className="text-zinc-300 leading-relaxed">
                                            Based on the meeting and web scan, Lumina has shifted to a usage-based model ($0.04/req). <br/><br/>
                                            <span className="text-orange-400">Recommendation:</span> Update our Q1 pricing deck to highlight our flat-rate tier.
                                        </p>
                                    </motion.div>
                                    
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1.2 }}
                                        className="flex gap-3"
                                    >
                                        <button className="px-3 py-1.5 bg-zinc-100 text-zinc-900 rounded text-xs font-bold hover:bg-white transition-colors">
                                            Approve Draft
                                        </button>
                                        <button className="px-3 py-1.5 bg-transparent border border-zinc-700 text-zinc-400 rounded text-xs hover:text-white transition-colors">
                                            Edit Context
                                        </button>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
      </div>
    </section>
  );
}

function TabButton({ isActive, onClick, label }: { isActive: boolean; onClick: () => void; label: string }) {
    return (
        <button 
            onClick={onClick}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive 
                ? 'bg-zinc-900 text-white shadow-lg' 
                : 'bg-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
        >
            {label}
        </button>
    )
}
