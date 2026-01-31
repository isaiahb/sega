import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Play,
  Sparkles,
  Calendar,
  MessageSquareText,
  Search,
  Building2,
  TrendingUp,
  UserCheck,
  LayoutGrid,
  List
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import svgPaths from "@/imports/svg-xrkbo2yamu";
import imgGlassesG11 from "figma:asset/3f76fb251e80cce61cf144dcf30292b48ca0b96a.png";
import imgGlassesHUD from "figma:asset/b17b2802ab57199b451339b9842859c28c5f8fb8.png";

// --- Components ---

const DeviceCard = ({ isRecording, hudText }: { isRecording: boolean; hudText: string }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm h-full relative group">
      <AnimatePresence mode="wait">
        {!isRecording ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 flex flex-col justify-between p-5"
          >
              {/* Header: Brand & Status */}
              <div className="flex items-center justify-between z-10 w-full">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-5 relative text-zinc-900 dark:text-white">
                        <svg className="block size-full" fill="currentColor" viewBox="0 0 19.0403 16.7852">
                            <path clipRule="evenodd" d={svgPaths.p1f5cee00} fillRule="evenodd" />
                        </svg>
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-white tracking-tight text-sm">Even Realities G1</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Connected</span>
                </div>
              </div>

              {/* Center: Hero Image */}
              <div className="relative flex-1 flex items-center justify-center z-10 group-hover:scale-105 transition-transform duration-500 my-1">
                <motion.img 
                    layoutId="glasses-image"
                    alt="Even Realities G1" 
                    className="w-full h-full object-contain max-h-[90px] drop-shadow-xl transform -rotate-1" 
                    src={imgGlassesG11} 
                />
              </div>

              {/* Footer: Detailed Status Grid */}
              <div className="grid grid-cols-3 gap-2 z-10 w-full">
                 <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 flex flex-col gap-0.5 border border-zinc-100 dark:border-zinc-800">
                     <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Battery</span>
                     <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">84%</span>
                 </div>
                 <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 flex flex-col gap-0.5 border border-zinc-100 dark:border-zinc-800">
                     <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Signal</span>
                     <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">5G</span>
                 </div>
                 <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 flex flex-col gap-0.5 border border-zinc-100 dark:border-zinc-800">
                     <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Uplink</span>
                     <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">Active</span>
                 </div>
              </div>
              
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-50/30 to-zinc-100/50 dark:via-zinc-800/10 dark:to-zinc-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </motion.div>
        ) : (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.2 } }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 flex items-center p-4 lg:p-6 gap-4 lg:gap-6 bg-zinc-50 dark:bg-zinc-800"
          >
              {/* Left: HUD Visual */}
              <div className="relative w-[60%] flex items-center justify-center">
                 <img 
                     src={imgGlassesHUD} 
                     alt="HUD View" 
                     className="w-full h-auto object-contain" 
                 />
                 
                 {/* Text Overlay */}
                 <div 
                    className="absolute text-left overflow-hidden flex items-center"
                    style={{
                        left: '39.5%',
                        top: '30.8%',
                        width: '42.3%',
                        bottom: '25%'
                    }}
                 >
                     <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={hudText} // Re-animate on text change
                        className="font-mono text-[#00b869] text-[6px] lg:text-[8px] leading-relaxed whitespace-pre-wrap break-words"
                     >
                         {hudText}
                         <motion.span 
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                         >_</motion.span>
                     </motion.p>
                 </div>
              </div>

              {/* Right: Glasses Information Panel */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-1 min-w-0 space-y-3"
              >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700/50 pb-2">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-white">G1 STATUS</h3>
                      <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">LIVE</span>
                      </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-black/20 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800/50">
                          <div className="flex items-center gap-1.5 mb-0.5 text-emerald-500">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>
                              <span className="text-[10px] font-bold">84%</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-500">~4h Left</span>
                      </div>
                      <div className="bg-white dark:bg-black/20 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800/50">
                          <div className="flex items-center gap-1.5 mb-0.5 text-blue-500">
                               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                              <span className="text-[10px] font-bold">5G</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-500">Strong</span>
                      </div>
                  </div>

                  {/* System Specs */}
                  <div className="space-y-1.5">
                      <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-2 flex items-center justify-between">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Uplink</span>
                          <span className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300">12ms</span>
                      </div>

                      <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-2 flex items-center justify-between">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Storage</span>
                          <span className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300">12GB</span>
                      </div>
                  </div>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ResearchEntity = ({ type, title, subtitle, details, status }: any) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "p-2 rounded-lg",
                        type === 'person' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : 
                        type === 'company' ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600" :
                        "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                    )}>
                        {type === 'person' ? <UserCheck size={16} /> : type === 'company' ? <Building2 size={16} /> : <TrendingUp size={16} />}
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h4>
                        <p className="text-xs text-zinc-500">{subtitle}</p>
                    </div>
                </div>
                <div className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                    status === 'verified' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-zinc-200 text-zinc-500"
                )}>
                    {status}
                </div>
            </div>
            
            <div className="space-y-2 pl-11">
                {details.map((detail: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <div className="mt-0.5 w-1 h-1 rounded-full bg-zinc-400 shrink-0" />
                        <span>{detail}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export const TodayView = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Simulated Data
  const [notes, setNotes] = useState<any[]>([
      { time: "10:02", text: "Meeting started. Agenda: Pitch review for 'Lumina' (Generative UI Platform)." },
      { time: "10:03", text: "Speaker introduces himself as Alex Rivera." },
      { time: "10:04", text: "Claim: Lumina reduces frontend dev time by 80% using context-aware LLMs." },
  ]);
  
  const [researchItems, setResearchItems] = useState<any[]>([]);
  const [hudText, setHudText] = useState("");
  
  // Scripted event sequence
  useEffect(() => {
      if (!isRecording) return;
      
      // Reset HUD initially
      setHudText("Initializing capture...\nListening for entities...");

      const sequence = [
          {
              time: 2,
              type: 'research',
              hud: "Detecting entity: Person\nRunning background check: 'Alex Rivera'...",
              data: {
                  type: 'person',
                  title: "Alex Rivera",
                  subtitle: "Founder & CEO @ Lumina",
                  status: "verified",
                  details: [
                      "Ex-Staff Engineer at Stripe (4y). Led the Payments UI team.",
                      "Previous exit: Sold 'StackFlow' to Atlassian in 2021.",
                      "Stanford CS '16. Active angel investor in dev-tools."
                  ]
              }
          },
          {
              time: 5,
              type: 'note',
              hud: "Processing technical claims...\nStack detected: Rust, React, Llama 3.",
              data: { time: "10:05", text: "Tech Stack: React, Rust for the compiler, custom fine-tuned Llama 3." }
          },
          {
              time: 8,
              type: 'research',
              hud: "Analyzing organization: 'Lumina'\nFetching Crunchbase data...",
              data: {
                  type: 'company',
                  title: "Lumina",
                  subtitle: "San Francisco, CA • Seed Stage",
                  status: "verified",
                  details: [
                      "Raised $4.2M Seed led by Sequoia (Jan 2024).",
                      "Team size: 12 (8 Engineers).",
                      "Product Hunt 'Product of the Month' in March."
                  ]
              }
          },
          {
              time: 12,
              type: 'research',
              hud: "Validating market segment: Gen-UI\nComparing against competitors...",
              data: {
                  type: 'market',
                  title: "Domain Validation: Gen-UI",
                  subtitle: "Market Analysis & Competitors",
                  status: "verified",
                  details: [
                      "CAGR: 35% projected growth for AI code generation tools.",
                      "Competitors: Vercel v0, Bolt.new, Lovable.",
                      "Risk: High saturation. Differentiation via 'Context Awareness' is critical."
                  ]
              }
          },
          {
              time: 15,
              type: 'note',
              hud: "Generating action items...\nDrafting proposal request.",
              data: { time: "10:06", text: "Action Item: Request access to the private beta for the engineering team." }
          }
      ];

      const timeouts: NodeJS.Timeout[] = [];

      sequence.forEach(event => {
          const t = setTimeout(() => {
              if (event.hud) {
                  setHudText(event.hud);
              }
              if (event.type === 'note') {
                  setNotes(prev => [...prev, event.data]);
              } else {
                  setResearchItems(prev => [event.data, ...prev]);
              }
          }, event.time * 1000);
          timeouts.push(t);
      });

      return () => timeouts.forEach(clearTimeout);
  }, [isRecording]);

  useEffect(() => {
    const clockInterval = setInterval(() => {
        setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 100);
    } else {
      setDuration(0);
      setResearchItems([]);
      setHudText("");
      setNotes([
          { time: "10:02", text: "Meeting started. Agenda: Pitch review for 'Lumina' (Generative UI Platform)." },
          { time: "10:03", text: "Speaker introduces himself as Alex Rivera." },
          { time: "10:04", text: "Claim: Lumina reduces frontend dev time by 80% using context-aware LLMs." },
      ]);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedTime = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  const formattedDate = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-black p-6 gap-6 overflow-hidden">
       
       {/* HEADER: Date, Time & Status */}
       <header className="flex items-end justify-between shrink-0 pb-2">
           <div className="flex flex-col gap-1">
               <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                   {formattedTime}
                   <span className="text-lg font-medium text-zinc-400 dark:text-zinc-500 font-mono bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md">UTC-7</span>
               </h2>
               <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium">
                   <Calendar size={16} />
                   <span>{formattedDate}</span>
               </div>
           </div>
           
           <div className="flex items-center gap-3">
               <div className="text-right hidden sm:block">
                   <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">System Status</div>
                   <div className={clsx("text-sm font-semibold", isRecording ? "text-red-500" : "text-emerald-500")}>
                       {isRecording ? "ACTIVE UPLINK" : "ALL SYSTEMS NOMINAL"}
                   </div>
               </div>
               <div className={clsx(
                   "w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] transition-all duration-500", 
                   isRecording ? "bg-red-500 text-red-500 animate-pulse" : "bg-emerald-500 text-emerald-500"
               )} />
           </div>
       </header>

       {/* ROW 1: Control & Device (Reduced Height) */}
       {/* We use LayoutGroup to sync layout changes between these two cards */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 h-[200px]">
           
           {/* Live Session Control - DYNAMIC COL SPAN */}
           <motion.div 
               layout
               transition={{ type: "spring", stiffness: 300, damping: 30 }}
               className={clsx(
                   "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group",
                   isRecording ? "lg:col-span-1" : "lg:col-span-2"
               )}
           >
                {/* Header */}
                <div className="flex items-start justify-between z-10">
                    <div className="flex items-center gap-3">
                        <motion.div 
                            layout
                            className={clsx("p-2.5 rounded-xl transition-colors shrink-0", isRecording ? "bg-red-50 text-red-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500")}
                        >
                             <Mic size={20} />
                        </motion.div>
                        <motion.div layout>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Audio Intelligence</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", isRecording ? "bg-red-500 animate-pulse" : "bg-zinc-300 dark:bg-zinc-600")} />
                                <span className="text-xs text-zinc-500 font-medium">{isRecording ? "Live Monitor" : "System Ready"}</span>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Center - Timer Display */}
                <div className="flex-1 flex flex-col items-center justify-center py-6 z-10">
                    <AnimatePresence mode="wait">
                    {isRecording ? (
                        <motion.div 
                            key="recording-timer"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center"
                        >
                             <div className="relative">
                                 <span className="font-mono text-4xl font-bold text-zinc-900 dark:text-white tracking-tighter tabular-nums">
                                    {formatDuration(duration)}
                                 </span>
                                 <div className="absolute -right-3 -top-1">
                                     <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                 </div>
                             </div>
                             <span className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-[0.2em] border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded-full">Recording</span>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="idle-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center gap-3"
                        >
                            <div className="flex gap-1">
                                {[1,2,3,4].map(i => (
                                    <motion.div 
                                        key={i} 
                                        className="w-1 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" 
                                        animate={{ height: [32, 24, 32] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                                    />
                                ))}
                            </div>
                            <span className="text-xs font-medium text-zinc-400">Waiting for input...</span>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>

                {/* Footer - Controls */}
                <div className="z-10">
                     <button 
                        onClick={() => setIsRecording(!isRecording)}
                        className={clsx(
                            "absolute bottom-6 left-6 right-6 z-20 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm text-sm border",
                            isRecording 
                                ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400" 
                                : "bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                        )}
                     >
                        {isRecording ? (
                            <><Square size={16} fill="currentColor"/> End Session</>
                        ) : (
                            <><Play size={16} fill="currentColor"/> Start Recording</>
                        )}
                     </button>
                </div>
           </motion.div>

           {/* Device Card - DYNAMIC COL SPAN */}
           <motion.div 
               layout
               transition={{ type: "spring", stiffness: 300, damping: 30 }}
               className={clsx(
                   isRecording ? "lg:col-span-2" : "lg:col-span-1"
               )}
           >
               <DeviceCard isRecording={isRecording} hudText={hudText} />
           </motion.div>

       </div>

       {/* ROW 2: Notes & Research (Fill Remaining Height) */}
       <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Live Summary (Left 1/3) */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col shadow-sm h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <MessageSquareText size={16} className="text-zinc-500" />
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Live Transcript</h3>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    <AnimatePresence initial={false}>
                    {notes.map((note, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3"
                        >
                           <span className="text-xs font-mono text-zinc-400 shrink-0 mt-0.5">{note.time}</span>
                           <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                               {note.text}
                           </p>
                        </motion.div>
                    ))}
                    </AnimatePresence>
                    {isRecording && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 px-0 py-2 text-xs text-zinc-400 pl-11"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                            Transcribing...
                        </motion.div>
                    )}
                </div>
            </div>

            {/* 2. Deep Intelligence (Right 2/3) */}
            <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col shadow-sm h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-500" />
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Deep Intelligence</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg mr-2 border border-zinc-200 dark:border-zinc-700">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'grid' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-400 hover:text-zinc-600"
                                )}
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'list' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-400 hover:text-zinc-600"
                                )}
                            >
                                <List size={14} />
                            </button>
                        </div>
                        
                        <span className="hidden sm:inline-block text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-md font-medium border border-purple-100 dark:border-purple-800">
                            AUTO-RESEARCH ACTIVE
                        </span>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {researchItems.length === 0 && !isRecording ? (
                         <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-3">
                             <Search size={32} className="opacity-20" />
                             <p className="text-sm">Start recording to activate entity research...</p>
                         </div>
                    ) : (
                        <motion.div 
                            layout
                            className={clsx(
                                "gap-4",
                                viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2" : "flex flex-col"
                            )}
                        >
                            <AnimatePresence>
                                {researchItems.map((item, i) => (
                                    <ResearchEntity key={i} {...item} />
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </div>

       </div>
    </div>
  );
};
