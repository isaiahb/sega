import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Zap, 
  Terminal,
  Play,
  Sparkles,
  Calendar,
  CheckCircle2,
  Circle,
  ArrowRight,
  MessageSquareText,
  Clock,
  MoreHorizontal,
  Search,
  Building2,
  Users,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Briefcase,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { clsx } from 'clsx';
import svgPaths from "@/imports/svg-xrkbo2yamu";
import imgGlassesG11 from "figma:asset/3f76fb251e80cce61cf144dcf30292b48ca0b96a.png";
import imgGlassesHUD from "figma:asset/436020afa70372b2475b2020df3af80e22a79a0a.png";

// --- Components ---

const DeviceCard = ({ isRecording, hudText }: { isRecording: boolean; hudText: string }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm h-full relative group transition-all duration-500">
      
      {/* STATE A: IDLE (Standard View) */}
      <div className={clsx(
          "absolute inset-0 flex flex-col items-center justify-center p-6 transition-all duration-500",
          isRecording ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      )}>
          {/* Brand Header */}
          <div className="flex items-center gap-2 mb-4 z-10">
            <div className="h-4 w-5 relative text-zinc-900 dark:text-white">
                <svg className="block size-full" fill="currentColor" viewBox="0 0 19.0403 16.7852">
                    <path clipRule="evenodd" d={svgPaths.p1f5cee00} fillRule="evenodd" />
                </svg>
            </div>
            <span className="font-semibold text-zinc-900 dark:text-white tracking-tight">Even Realities</span>
          </div>

          {/* Glasses Image */}
          <div className="relative w-48 h-16 my-2 z-10 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-2">
            <img 
                alt="Even Realities G1" 
                className="w-full h-full object-contain drop-shadow-2xl" 
                src={imgGlassesG11} 
            />
          </div>

          {/* Device Name / Status */}
          <div className="mt-4 text-center z-10">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Even Realities G1</h3>
            <div className="flex items-center justify-center gap-2 mt-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Connected • 84% Battery</span>
            </div>
          </div>
          
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-50/50 to-zinc-100/50 dark:via-zinc-800/20 dark:to-zinc-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>

      {/* STATE B: RECORDING (HUD View) */}
      <div className={clsx(
          "absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out bg-zinc-50 dark:bg-zinc-800",
          isRecording ? "opacity-100 scale-100" : "opacity-0 scale-110 pointer-events-none"
      )}>
          {/* Container to maintain aspect ratio logic from Figma */}
          <div className="relative w-full max-w-[400px] px-2 flex items-center justify-center">
             <img 
                 src={imgGlassesHUD} 
                 alt="HUD View" 
                 className="w-full h-auto object-contain"
             />
             
             {/* Text Overlay - Positioned based on Figma design percentages */}
             <div 
                className="absolute text-left overflow-hidden flex items-center"
                style={{
                    left: '39.5%',
                    top: '30.8%',
                    width: '42.3%',
                    bottom: '25%' // Constrain height to stay within lens
                }}
             >
                 <p className="font-mono text-[#00b869] text-[clamp(9px,1.2vw,11px)] leading-relaxed whitespace-pre-wrap break-words animate-in fade-in duration-300">
                     {hudText}
                     <span className="animate-pulse">_</span>
                 </p>
             </div>
          </div>

          {/* Active Indicator Overlay */}
          <div className="absolute top-4 right-4 flex items-center gap-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-md border border-white/10 z-20 shadow-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00b869] animate-pulse" />
              <span className="text-[10px] font-mono text-[#00b869] uppercase tracking-wider">HUD LIVE</span>
          </div>
      </div>

    </div>
  );
};

// Research Card Component
const ResearchEntity = ({ type, title, subtitle, details, status }: any) => {
    return (
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-right-4 fade-in duration-500">
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
        </div>
    );
};

export const TodayView = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Simulated Data
  const [notes, setNotes] = useState<any[]>([
      { time: "10:02", text: "Meeting started. Agenda: Pitch review for 'Lumina' (Generative UI Platform)." },
      { time: "10:03", text: "Speaker introduces himself as Alex Rivera." },
      { time: "10:04", text: "Claim: Lumina reduces frontend dev time by 80% using context-aware LLMs." },
  ]);
  
  const [researchItems, setResearchItems] = useState<any[]>([]);
  const [waveforms, setWaveforms] = useState<number[]>(new Array(48).fill(10));
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
        setWaveforms(prev => prev.map(() => Math.max(10, Math.random() * 80)));
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
      setWaveforms(new Array(48).fill(10));
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
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 h-[200px]">
           
           {/* Live Session Control - CLEANED UP */}
           <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="flex items-start justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2.5 rounded-xl transition-colors", isRecording ? "bg-red-50 text-red-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500")}>
                             <Mic size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Audio Intelligence</h3>
                            <div className="flex items-center gap-1.5">
                                <span className={clsx("w-1.5 h-1.5 rounded-full", isRecording ? "bg-red-500 animate-pulse" : "bg-zinc-300 dark:bg-zinc-600")} />
                                <span className="text-xs text-zinc-500">{isRecording ? "Processing Live Stream" : "Ready to Capture"}</span>
                            </div>
                        </div>
                    </div>
                    {isRecording && (
                        <span className="font-mono text-xl font-medium text-zinc-900 dark:text-white tabular-nums">
                            {formatDuration(duration)}
                        </span>
                    )}
                </div>

                <div className="flex-1 flex items-end justify-center gap-[3px] w-full px-4 pb-2 z-10 opacity-50">
                    {waveforms.map((height, i) => (
                        <div 
                            key={i}
                            className={clsx(
                                "flex-1 rounded-full transition-all duration-150 ease-in-out",
                                isRecording ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-800"
                            )}
                            style={{ 
                                height: isRecording ? `${Math.max(10, height)}%` : '10%',
                                opacity: isRecording ? 1 : 0.5
                            }}
                        />
                    ))}
                </div>

                <div className="flex-1 items-center gap-4 z-10 hidden lg:flex">
                     {/* Spacer */}
                </div>

                <div className="flex items-center gap-4 z-10">
                     <button 
                        onClick={() => setIsRecording(!isRecording)}
                        className={clsx(
                            "w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm text-sm",
                            isRecording 
                                ? "bg-white border border-red-200 text-red-600 hover:bg-red-50" 
                                : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90"
                        )}
                     >
                        {isRecording ? (
                            <><Square size={14} fill="currentColor"/> Stop Session</>
                        ) : (
                            <><Play size={14} fill="currentColor"/> Start Recording</>
                        )}
                     </button>
                </div>
           </div>

           {/* Device Card */}
           <div className="lg:col-span-1">
               <DeviceCard isRecording={isRecording} hudText={hudText} />
           </div>

       </div>

       {/* ROW 2: Notes & Research (Fill Remaining Height) */}
       <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Live Summary (Left 1/3) */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <MessageSquareText size={16} className="text-zinc-500" />
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Live Transcript</h3>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {notes.map((note, i) => (
                        <div key={i} className="flex gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
                           <span className="text-xs font-mono text-zinc-400 shrink-0 mt-0.5">{note.time}</span>
                           <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                               {note.text}
                           </p>
                        </div>
                    ))}
                    {isRecording && (
                        <div className="flex items-center gap-2 px-0 py-2 text-xs text-zinc-400 animate-pulse pl-11">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                            Transcribing...
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Deep Intelligence (Right 2/3) */}
            <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-500" />
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Deep Intelligence</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-md font-medium border border-purple-100 dark:border-purple-800">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {researchItems.map((item, i) => (
                                <ResearchEntity key={i} {...item} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

       </div>
    </div>
  );
};
