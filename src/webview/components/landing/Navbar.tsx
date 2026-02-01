import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

interface NavbarProps {
  onNavigate?: (path: string) => void;
}

export function Navbar({ onNavigate }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-zinc-200 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-zinc-900">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white shadow-md font-serif text-xl leading-none pt-0.5">
            E
          </div>
          <span>Executive Lens</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
          <a href="#" className="hover:text-zinc-900 transition-colors">Capabilities</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Workflow</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Infrastructure</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Security</a>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate?.('/app')}
            className="hidden sm:block text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => onNavigate?.('/app')}
            className="text-sm font-medium bg-zinc-900 text-white px-5 py-2.5 rounded-full hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
}
