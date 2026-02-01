import { motion } from "framer-motion";
import { Mic, Brain, Layers, Lock, ArrowRight } from "lucide-react";

export function Features() {
  return (
    <section className="h-full w-full relative flex flex-col justify-center bg-white px-6 lg:px-8 py-16">

      <div className="max-w-[1440px] w-full mx-auto flex flex-col justify-center h-full">

        {/* Header */}
        <div className="max-w-3xl mb-16 lg:mb-24">
             <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
             >
                <h2 className="text-[11px] font-bold tracking-[0.2em] text-orange-600 uppercase mb-4">Core Functionality</h2>
                <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold text-zinc-900 leading-[1.05] tracking-tight">
                    A full stack executive assistant.<br/>
                    <span className="text-zinc-400">Not two screens. One system.</span>
                </h3>
             </motion.div>
        </div>

        {/* 4 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 h-auto">
            <FeatureColumn
                icon={<Mic className="w-6 h-6 text-white" />}
                iconBg="bg-orange-500"
                title="Live Capture"
                desc="Audio Intelligence & Live Transcript running locally. It detects key decisions, owners, and risks in real-time."
                delay={0.1}
            />
            <FeatureColumn
                icon={<Brain className="w-6 h-6 text-white" />}
                iconBg="bg-rose-500"
                title="Deep Intelligence"
                desc="The system auto-researches entities, validates claims against the web, and monitors changes over time."
                delay={0.2}
            />
            <FeatureColumn
                icon={<Layers className="w-6 h-6 text-white" />}
                iconBg="bg-blue-500"
                title="Self-building Notes"
                desc="Proactive notes organized by project. Summaries, action items, and decisions are auto-drafted for you."
                delay={0.3}
            />
            <FeatureColumn
                icon={<Lock className="w-6 h-6 text-white" />}
                iconBg="bg-zinc-900"
                title="Agents & Control"
                desc="You define the autonomy levels. External sending or publishing requires explicit approval by default."
                delay={0.4}
            />
        </div>

      </div>
    </section>
  );
}

function FeatureColumn({ icon, iconBg, title, desc, delay }: { icon: React.ReactNode, iconBg: string, title: string, desc: string, delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className="flex flex-col h-full p-8 rounded-2xl bg-zinc-50 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/50 transition-all group"
        >
            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h4 className="font-bold text-xl text-zinc-900 mb-4">{title}</h4>
            <p className="text-base text-zinc-500 leading-relaxed font-medium">
                {desc}
            </p>

            <div className="mt-auto pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wide">
                    Learn more <ArrowRight className="w-3 h-3" />
                </div>
            </div>
        </motion.div>
    )
}
