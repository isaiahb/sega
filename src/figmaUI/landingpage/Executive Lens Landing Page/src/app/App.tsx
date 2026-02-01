import { Navbar } from "@/app/components/Navbar";
import { Hero } from "@/app/components/Hero";
import { Features } from "@/app/components/Features";
import { Workflow } from "@/app/components/Workflow";
import { TechnicalCredibility } from "@/app/components/TechnicalCredibility";

export default function App() {
  return (
    <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-white text-zinc-900 selection:bg-orange-100 selection:text-orange-900">
      <Navbar />
      
      <div className="snap-start h-screen w-full overflow-hidden">
        <Hero />
      </div>
      
      {/* 2nd Section: Workflow ("What we do") */}
      <div className="snap-start h-screen w-full overflow-hidden">
        <Workflow />
      </div>
      
      {/* 3rd Section: Functionality (Features) */}
      <div className="snap-start h-screen w-full overflow-hidden">
        <Features />
      </div>
      
      <div className="snap-start h-screen w-full overflow-hidden">
        <TechnicalCredibility />
      </div>
    </div>
  );
}
