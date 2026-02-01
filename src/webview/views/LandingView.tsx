import { Navbar } from "../components/landing/Navbar";
import { Hero } from "../components/landing/Hero";
import { Workflow } from "../components/landing/Workflow";
import { Features } from "../components/landing/Features";
import { TechnicalCredibility } from "../components/landing/TechnicalCredibility";

interface LandingViewProps {
  onNavigate: (path: string) => void;
}

export function LandingView({ onNavigate }: LandingViewProps) {
  return (
    <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-white text-zinc-900 selection:bg-orange-100 selection:text-orange-900">
      <Navbar onNavigate={onNavigate} />

      <div className="snap-start h-screen w-full overflow-hidden">
        <Hero onNavigate={onNavigate} />
      </div>

      <div className="snap-start h-screen w-full overflow-hidden">
        <Workflow />
      </div>

      <div className="snap-start h-screen w-full overflow-hidden">
        <Features />
      </div>

      <div className="snap-start h-screen w-full overflow-hidden">
        <TechnicalCredibility onNavigate={onNavigate} />
      </div>
    </div>
  );
}
