import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Mic, Send, Sparkles, FileText, Check } from "lucide-react";
import glassesImage from '../../assets/landing/67b9c61f3e95ed7aee7a570afe80cbc7db18c386.png';
import glassesCapture from '../../assets/landing/ce64b9302e64221fb3c861f73234a3c3fd536234.png';
import glassesImageUnderstand from "../../assets/landing/608ba2d2ddefbabb20c9a6fbe0f514a29b2a204d.png";
import docImage from "../../assets/landing/aae35abca28187cd050c79667e1458a98739e1d2.png";

export function Workflow() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 5000); // 5 seconds per slide
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      id: "capture",
      title: "Capture",
      desc: "Live audio intelligence that listens, transcribes, and identifies context in real-time.",
      icon: <Mic className="w-5 h-5" />,
    },
    {
      id: "understand",
      title: "Understand",
      desc: "Deep research agents analyze entities, validate claims, and connect the dots.",
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      id: "ship",
      title: "Ship",
      desc: "Instant follow-through. Meeting docs, emails, and tickets created automatically.",
      icon: <Send className="w-5 h-5" />,
    }
  ];

  return (
    <section className="h-full w-full relative flex flex-col justify-center bg-zinc-50 border-t border-zinc-200 px-6 lg:px-8 py-12">
      <div className="max-w-[1280px] w-full mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center h-auto">

        {/* Left: Steps & Content */}
        <div className="flex flex-col justify-center max-w-lg">
             <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-12"
             >
                <div className="flex items-center gap-2 mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">Always On</span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 leading-[1.1] tracking-tight">
                    From raw audio to<br/>finished outcome.
                </h2>
             </motion.div>

             <div className="flex flex-col">
                {steps.map((step, index) => (
                    <StepItem
                        key={step.id}
                        index={index}
                        step={step}
                        isActive={activeStep === index}
                        isCompleted={activeStep > index}
                        isLast={index === steps.length - 1}
                        onClick={() => setActiveStep(index)}
                    />
                ))}
             </div>
        </div>

        {/* Right: Dynamic Visual Card */}
        <div className="w-full flex justify-center lg:justify-end h-[500px] items-center">
             <div className="relative w-full max-w-[600px] aspect-square lg:aspect-auto lg:h-[400px]">
                 {/* Decorative background blob/glow */}
                 <div className="absolute inset-0 bg-gradient-to-tr from-zinc-200/50 to-orange-100/50 rounded-full blur-3xl opacity-50 -z-10 transform scale-110" />

                 <AnimatePresence mode="wait">
                    {activeStep === 0 && <CaptureVisual key="capture" />}
                    {activeStep === 1 && <UnderstandVisual key="understand" />}
                    {activeStep === 2 && <ShipVisual key="ship" />}
                 </AnimatePresence>
             </div>
        </div>
      </div>
    </section>
  );
}

function StepItem({ step, isActive, isCompleted, isLast, onClick, index }: { step: any, isActive: boolean, isCompleted: boolean, isLast: boolean, onClick: () => void, index: number }) {
    return (
        <div
            onClick={onClick}
            className="group relative flex items-start gap-6 cursor-pointer pb-8 last:pb-0"
        >
            {/* Connecting Lines */}
            {!isLast && (
                <>
                    {/* Background Line */}
                    <div className="absolute left-[23px] top-[48px] bottom-0 w-0.5 bg-zinc-200" />

                    {/* Progress Line (Animated) */}
                    <div className="absolute left-[23px] top-[48px] bottom-0 w-0.5 overflow-hidden">
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: isActive ? "100%" : (isCompleted ? "100%" : "0%") }}
                            transition={{ duration: isActive ? 5 : 0.3, ease: "linear" }}
                            className="w-full h-full bg-zinc-900 origin-top"
                        />
                    </div>
                </>
            )}

            {/* Number/Icon Bubble */}
            <div className={`relative z-10 w-12 h-12 rounded-full border flex items-center justify-center shrink-0 transition-all duration-500
                ${isActive || isCompleted
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-md scale-105'
                    : 'bg-white border-zinc-200 text-zinc-400 group-hover:border-zinc-300'
                }`}
            >
                {isActive || isCompleted ? step.icon : <span className="text-sm font-bold font-mono">0{index + 1}</span>}
            </div>

            <div className="pt-2">
                <h3 className={`text-xl font-bold transition-colors duration-300 mb-2 ${isActive ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600'}`}>
                    {step.title}
                </h3>

                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isActive ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-base text-zinc-500 leading-relaxed font-medium max-w-sm">
                        {step.desc}
                    </p>
                </div>
            </div>
        </div>
    )
}

function CaptureVisual() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center"
        >
            <div className="relative w-[500px] h-[350px]">
                {/* Recording UI Card (Background/Bottom-Right) */}
                <div className="absolute right-0 bottom-0 w-[300px] sm:w-[320px] bg-[#18181b] rounded-2xl p-6 border border-zinc-800 shadow-2xl z-0 transform translate-y-4">
                    {/* Card Header */}
                    <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#fb2c36] opacity-50 animate-pulse" />
                            <span className="text-[10px] font-bold tracking-[1.1px] text-[#9f9fa9] uppercase">Recording</span>
                        </div>
                        <div className="text-[10px] text-[#71717b] font-mono">00:14:23</div>
                    </div>

                    {/* Card Content - Full Streaming Transcript */}
                    <div className="mb-6 space-y-3 h-[120px] overflow-hidden relative">
                         <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#18181b] to-transparent z-10" />

                         <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-[#71717b] text-xs font-medium"
                         >
                            "Competitor X just dropped pricing to $0.04..."
                         </motion.p>

                         <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.5 }}
                            className="text-[#d4d4d8] text-sm font-medium leading-relaxed"
                         >
                            "We need to verify that."
                         </motion.p>

                         <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 2.5 }}
                         >
                            <p className="text-[#d4d4d8] text-sm font-medium leading-relaxed">
                                "If true, let's move forward with the <br/>
                                <span className="bg-[#27272a] text-white px-2 py-0.5 rounded mt-1 inline-block border border-zinc-800 shadow-sm">usage-based model</span>."
                            </p>
                         </motion.div>
                    </div>

                    {/* Animated Waveform */}
                    <div className="flex items-end gap-[3px] h-6 opacity-80">
                        {[...Array(24)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{ height: [4, Math.random() * 24 + 4, 4] }}
                                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.05 }}
                                className="w-1 bg-[#ff6900] rounded-full"
                            />
                        ))}
                    </div>
                </div>

                {/* Glasses Image (Foreground/Top-Left) with Multiply Blend */}
                <div className="absolute left-[-20px] top-[-30px] z-10 w-[420px] sm:w-[450px] pointer-events-none">
                    <img
                        src={glassesCapture}
                        alt="Smart Glasses"
                        className="w-full drop-shadow-2xl mix-blend-multiply"
                    />
                </div>
            </div>
        </motion.div>
    )
}

function UnderstandVisual() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center"
        >
            <div className="relative w-[500px] h-[350px]">

                {/* Result Card (Top Right) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="absolute top-0 right-0 w-[240px] bg-white rounded-xl shadow-xl border border-zinc-200 z-20 overflow-hidden"
                >
                    <div className="bg-zinc-50 p-3 border-b border-zinc-100 flex items-center gap-2">
                         <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center text-orange-600">
                             <Sparkles className="w-3.5 h-3.5" />
                         </div>
                         <div className="text-[10px] font-bold text-zinc-900">Analysis Complete</div>
                    </div>
                    <div className="p-3">
                         <div className="flex gap-2 items-start mb-3">
                             <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">CX</div>
                             <div>
                                 <div className="text-[10px] font-bold text-zinc-900">Competitor X</div>
                                 <div className="text-[9px] text-zinc-500">Tier Change Detected</div>
                             </div>
                         </div>
                         <div className="p-2 bg-blue-50 border border-blue-100 rounded text-[9px] font-medium text-blue-800">
                             Confirmed: $0.04/req pricing tier is live.
                         </div>
                    </div>
                </motion.div>

                {/* Document Stream (Bottom Center -> Moving Up) */}
                <div className="absolute bottom-[-20px] left-[80px] w-full h-[250px] pointer-events-none z-10 overflow-visible">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ y: 200, x: (i % 2 === 0 ? -20 : 20) + Math.random() * 40, opacity: 0, scale: 0.8, rotate: Math.random() * 20 - 10 }}
                            animate={{
                                y: -100,
                                x: 0,
                                opacity: [0, 1, 1, 0],
                                scale: [0.8, 1, 0.4],
                                rotate: 0
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: i * 0.6,
                                ease: "easeInOut"
                            }}
                            className="absolute left-[100px] bottom-0"
                        >
                            <div className="relative w-16 h-20 bg-white border border-zinc-200 shadow-lg rounded-lg flex items-center justify-center transform hover:scale-105 transition-transform">
                                <img src={docImage} alt="" className="w-full h-full object-cover rounded-lg opacity-90" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-zinc-400 drop-shadow-md" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Glasses Image (Left Center) */}
                <div className="absolute top-[60px] left-0 w-[380px] z-30">
                    <img
                        src={glassesImage}
                        alt="Smart Glasses"
                        className="w-full drop-shadow-2xl transform -rotate-2"
                    />
                     {/* Lens Scan Effect */}
                     <motion.div
                        animate={{ opacity: [0, 0.4, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute top-[40%] left-[10%] w-[120px] h-[60px] bg-green-400/20 blur-xl rounded-full"
                    />
                </div>
            </div>
        </motion.div>
    )
}

function ShipVisual() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: "blur(5px)" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center p-6"
        >
            <div className="w-full max-w-[420px] bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden ring-1 ring-zinc-900/5">
                {/* Mac-style Header */}
                <div className="bg-zinc-50 border-b border-zinc-100 p-3 flex items-center justify-between">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80 border border-red-500/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80 border border-amber-500/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 border border-emerald-500/10" />
                    </div>
                    <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-orange-500" />
                        AI Draft
                    </div>
                    <div className="w-8" /> {/* Spacer */}
                </div>

                {/* Email Header Fields */}
                <div className="px-5 py-4 space-y-3 bg-white">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-zinc-400 w-8">To:</span>
                        <div className="flex gap-1">
                             <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded text-xs font-medium border border-zinc-200">
                                product-team@company.com
                             </span>
                        </div>
                    </div>
                    <div className="h-px bg-zinc-50" />
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-zinc-400 w-8">Sub:</span>
                        <span className="text-sm font-medium text-zinc-900">
                            Action Required: Competitor Pricing Update
                        </span>
                    </div>
                </div>

                {/* Email Body */}
                <div className="px-5 py-2 pb-6">
                    <div className="prose prose-sm max-w-none">
                        <p className="text-zinc-600 text-xs leading-relaxed mb-4">
                            Team,
                            <br /><br />
                            Executive Lens picked up a critical update during the market scan. <strong>Competitor X</strong> has officially lowered their API pricing to <strong>$0.04/request</strong>.
                            <br /><br />
                            I recommend we accelerate our usage-based pricing rollout to match. Attached is the full analysis and transcript.
                        </p>
                    </div>

                    {/* Attachment Chip */}
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-zinc-100 bg-zinc-50/50 mb-6 w-fit hover:bg-zinc-50 transition-colors cursor-pointer group">
                        <div className="w-8 h-8 bg-white rounded flex items-center justify-center border border-zinc-200 shadow-sm group-hover:border-red-200 group-hover:text-red-500 transition-colors">
                            <FileText className="w-4 h-4 text-zinc-400 group-hover:text-red-500" />
                        </div>
                        <div className="pr-2">
                            <div className="text-[10px] font-bold text-zinc-700">Transcript_Analysis.pdf</div>
                            <div className="text-[9px] text-zinc-400">1.2 MB</div>
                        </div>
                    </div>

                    {/* Send Button */}
                    <SendButton />
                </div>
            </div>

            {/* Background elements to integrate it better */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-gradient-to-tr from-zinc-200/30 to-orange-100/30 rounded-full blur-3xl opacity-50" />
        </motion.div>
    )
}

function SendButton() {
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

    useEffect(() => {
        // Simple timeline for the demo loop
        const t1 = setTimeout(() => setStatus('sending'), 1500);
        const t2 = setTimeout(() => setStatus('sent'), 3000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <motion.button
            animate={{
                backgroundColor: status === 'sent' ? "#10b981" : "#18181b",
                scale: status === 'sent' ? 0.98 : 1
            }}
            transition={{ duration: 0.3 }}
            className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all relative overflow-hidden"
        >
            <AnimatePresence mode="wait">
                {status === 'idle' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        <span>Send Update</span>
                    </motion.div>
                )}
                {status === 'sending' && (
                    <motion.div
                        key="sending"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2"
                    >
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending...</span>
                    </motion.div>
                )}
                {status === 'sent' && (
                    <motion.div
                        key="sent"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        <span>Sent</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
