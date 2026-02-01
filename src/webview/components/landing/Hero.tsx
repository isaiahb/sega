import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import heroImage from '../../assets/landing/034babc6454a87b85d1fd41d31bfcd229efe1bd1.png';

interface HeroProps {
  onNavigate?: (path: string) => void;
}

export function Hero({ onNavigate }: HeroProps) {
  return (
    <section className="h-full w-full relative flex flex-col justify-center px-6 lg:px-8 overflow-hidden pt-12 lg:pt-16">
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_120%,rgba(255,237,213,0.3),rgba(255,255,255,0)_50%)]" />

      <div className="max-w-[1440px] w-full mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center h-auto">

        {/* Left: Text Content */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left z-20 max-w-xl mx-auto lg:mx-0">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-[11px] font-bold tracking-wide text-orange-600 mb-6 shadow-sm uppercase"
            >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                </span>
                New Public Beta
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl sm:text-6xl xl:text-[5rem] font-bold tracking-tight text-zinc-900 leading-[1] mb-6"
            >
                Executive Lens
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl md:text-2xl text-zinc-500 font-medium leading-tight mb-8 max-w-[520px]"
            >
                The smart glasses executive assistant that turns your reality into decisions.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4 mb-8 w-full sm:w-auto"
            >
                <button
                  onClick={() => onNavigate?.('/app')}
                  className="w-full sm:w-auto px-8 py-4 bg-zinc-900 text-white rounded-full font-bold hover:bg-zinc-800 transition-all hover:translate-y-[-1px] hover:shadow-xl active:translate-y-[1px] flex items-center justify-center gap-2 text-sm md:text-base"
                >
                    See the demo
                    <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate?.('/app')}
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-zinc-200 text-zinc-600 rounded-full font-bold hover:text-zinc-900 hover:border-zinc-300 transition-all active:scale-95 text-sm md:text-base"
                >
                    Log in
                </button>
            </motion.div>

             <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-xs text-zinc-400 font-medium flex items-center gap-2"
            >
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                Ask anything. Get a cited answer.
            </motion.p>
        </div>

        {/* Right: Visual */}
        <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full flex items-center justify-center lg:justify-end"
        >
            {/* The Container for the Asset - No border, no clip, Larger max-width */}
            <div className="relative w-full max-w-[800px] flex items-center justify-center group -mr-8 lg:-mr-16">
                 <img
                    src={heroImage}
                    alt="Executive Lens Interface"
                    className="w-full h-auto object-contain drop-shadow-2xl scale-110 lg:scale-125 origin-right"
                 />

                {/* Status Block - Floating */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="absolute bottom-10 right-20 bg-white/90 backdrop-blur-md border border-zinc-200/50 p-4 rounded-xl shadow-lg w-44 z-10 hidden md:block"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-wider">System Nominal</span>
                    </div>
                    <div className="space-y-1.5">
                         <StatusRow label="Glasses" value="Connected" />
                         <StatusRow label="Battery" value="84%" />
                         <StatusRow label="Uplink" value="5G Active" />
                    </div>
                </motion.div>
            </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatusRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-center text-[10px]">
            <span className="text-zinc-500 font-medium">{label}</span>
            <span className="text-zinc-900 font-mono">{value}</span>
        </div>
    )
}
