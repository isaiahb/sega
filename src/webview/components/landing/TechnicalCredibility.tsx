import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import resendLogo from '../../assets/landing/d5f9b752eb89871a52e895172f51ec5cfb53cc8f.png';
import firecrawlLogo from '../../assets/landing/e6210c94243b30b4d2c1d25dfda0aaf9a4b0a383.png';
import reductoLogo from '../../assets/landing/0a1142e339beff716e6955688416b77c5dcfec5b.png';

interface TechnicalCredibilityProps {
  onNavigate?: (path: string) => void;
}

export function TechnicalCredibility({ onNavigate }: TechnicalCredibilityProps) {
  return (
    <section className="h-full w-full relative flex flex-col justify-between bg-white px-6 lg:px-8 py-10 lg:py-16">

      {/* Centered Content Wrapper */}
      <div className="flex-1 flex flex-col justify-center max-w-[1280px] w-full mx-auto">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-12">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
            >
                <h2 className="text-[11px] font-bold tracking-[0.2em] text-orange-600 uppercase mb-4">Built on real infrastructure</h2>
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 leading-[1.1] tracking-tight">
                     Research, document parsing, and delivery are first class, not bolted on.
                </h3>
            </motion.div>
        </div>

        {/* Infrastructure Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 lg:mb-16 w-full">
            <InfraCard
                logoSrc={firecrawlLogo}
                alt="Firecrawl"
                hover="hover:border-orange-200"
                desc="Powers deep web research, extraction, and change detection."
            />
            <InfraCard
                logoSrc={reductoLogo}
                alt="Reducto"
                hover="hover:border-rose-200"
                desc="Turns PDFs and screenshots into structured, searchable data."
            />
            <InfraCard
                logoSrc={resendLogo}
                alt="Resend"
                hover="hover:border-zinc-300"
                desc="Delivers summaries, digests, and approval questions that actually land."
            />
        </div>

        {/* Big Footer CTA - Compact Version for Slide */}
        <div className="bg-zinc-900 rounded-[2rem] p-8 md:p-12 text-center relative overflow-hidden flex flex-col justify-center items-center shadow-2xl ring-1 ring-black/5">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-orange-500/20 to-rose-500/20 rounded-full blur-[80px] opacity-40 pointer-events-none translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-[80px] opacity-40 pointer-events-none -translate-x-1/3 translate-y-1/3" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-2xl md:text-4xl font-bold tracking-tight text-white leading-tight"
                >
                    Stop losing time to context switching.
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-base md:text-lg text-zinc-400 max-w-lg mx-auto"
                >
                    Executive Lens turns the internet, your docs, and your work into decisions.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                >
                    <button
                        onClick={() => onNavigate?.('/app')}
                        className="px-6 py-3 bg-white text-zinc-900 rounded-full font-bold hover:bg-zinc-100 transition-all shadow-xl hover:scale-105 active:scale-95 w-full sm:w-auto text-sm"
                    >
                        See the demo
                    </button>
                    <button
                        onClick={() => onNavigate?.('/app')}
                        className="px-6 py-3 bg-transparent border border-zinc-700 text-white rounded-full font-medium hover:bg-zinc-800 transition-all active:scale-95 w-full sm:w-auto text-sm"
                    >
                        Log in
                    </button>
                </motion.div>
            </div>
        </div>
      </div>

      {/* Footer Links - Pushed to bottom */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] md:text-xs text-zinc-400 pt-6 mt-6 border-t border-zinc-100 w-full max-w-[1280px] mx-auto">
            <p>© 2026 Executive Assistant Inc.</p>
            <div className="flex gap-6 font-medium">
                <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
                <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
                <a href="#" className="hover:text-zinc-900 transition-colors">Twitter</a>
            </div>
        </div>
    </section>
  );
}

function InfraCard({ logoSrc, alt, hover, desc }: { logoSrc: string, alt: string, hover: string, desc: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`bg-white rounded-xl p-6 border border-zinc-200 shadow-sm transition-all group ${hover} hover:shadow-md h-full flex flex-col`}
        >
            <div className="h-8 mb-5 flex items-center justify-start">
                <img src={logoSrc} alt={alt} className="h-full w-auto object-contain max-w-[140px]" />
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                {desc}
            </p>
        </motion.div>
    )
}
