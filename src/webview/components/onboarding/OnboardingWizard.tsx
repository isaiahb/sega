import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Database,
  FileText,
  Globe,
  Layers,
  Layout,
  Mail,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Zap,
  Battery,
  Wifi,
  UploadCloud,
  X,
  TrendingUp,
  Briefcase,
  Users,
  Building2,
  Target,
  FileBarChart
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import imgGlassesG11 from "../../assets/onboarding/3f76fb251e80cce61cf144dcf30292b48ca0b96a.png";

type Step = 'welcome' | 'mode' | 'pair' | 'autonomy' | 'classifications' | 'complete';

interface OnboardingWizardProps {
  onComplete: () => void;
  userId: string;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, userId }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [direction, setDirection] = useState(1);

  // State for selections
  const [mode, setMode] = useState('vc');
  const [pairingStatus, setPairingStatus] = useState<'scanning' | 'detected' | 'failed'>('scanning');
  const [autonomy, setAutonomy] = useState('suggest');
  const [autonomySettings, setAutonomySettings] = useState({
    emailExternal: true,
    createTasks: true
  });

  // New state for classifications
  const [rules, setRules] = useState([
    { id: 1, name: 'Standups', condition: "Title contains 'Standup' or 'Daily'", category: 'Standup', active: true },
    { id: 2, name: 'External Sales', condition: "Attendees include external domains", category: 'External Call', active: true },
    { id: 3, name: '1:1s', condition: "Exactly 2 attendees", category: 'Personnel', active: true },
    { id: 4, name: 'Design Reviews', condition: "Title contains 'Design' or 'UX'", category: 'Design Review', active: true },
  ]);

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const nextStep = (next: Step) => {
    setDirection(1);
    setStep(next);
  };

  const prevStep = (prev: Step) => {
    setDirection(-1);
    setStep(prev);
  };

  const handleComplete = async () => {
    // Save to API
    try {
      await fetch("/api/profile/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mode,
          autonomy,
          autonomySettings,
          rules: rules.map(r => ({ ...r, active: r.active }))
        }),
      });

      // Set localStorage flag
      localStorage.setItem('executive-lens-onboarded', 'true');

      // Navigate to app
      onComplete();
    } catch (error) {
      console.error("Failed to save onboarding:", error);
      // Still complete onboarding even if API fails
      localStorage.setItem('executive-lens-onboarded', 'true');
      onComplete();
    }
  };

  const skip = () => {
    handleComplete();
  };

  // Step Components

  const WelcomeStep = () => (
    <div className="flex flex-col items-center text-center space-y-6 max-w-lg mx-auto">
      <div className="w-16 h-16 bg-zinc-900 dark:bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
        <Cpu size={32} className="text-white dark:text-zinc-900" />
      </div>
      <h1 className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">
        Welcome to Executive Lens
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Your smart glasses executive assistant for deep research and follow through.
      </p>

      <div className="pt-8 flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => nextStep('mode')}
          className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          Start setup
        </button>
        <button
          onClick={skip}
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Skip, go to product
        </button>
      </div>
      <p className="text-xs text-zinc-400 mt-8">
        You can change everything later in Agents and Settings.
      </p>
    </div>
  );

  const ModeStep = () => {
    const modes = [
      { id: 'vc', icon: <TrendingUp />, title: 'VC / Investor mode', desc: 'Deal flow tracking. Portfolio intelligence. Market signals.' },
      { id: 'founder', icon: <Globe />, title: 'Founder mode', desc: 'High level clarity. Weekly narrative. Action visibility.' },
      { id: 'engineer', icon: <Cpu />, title: 'Engineer mode', desc: 'Research and decisions first. Compact UI. Technical summaries.' },
      { id: 'custom', icon: <Settings />, title: 'Custom mode', desc: 'Pick your own defaults.' }
    ];

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">What do you want Executive Lens to optimize for?</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={clsx(
                "p-6 rounded-xl border-2 text-left transition-all relative overflow-hidden group",
                mode === m.id
                  ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
              )}
            >
              <div className={clsx(
                "mb-4 w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                mode === m.id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
              )}>
                {React.cloneElement(m.icon as React.ReactElement, { size: 20 })}
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{m.title}</h3>
              <p className="text-sm text-zinc-500 leading-snug">{m.desc}</p>
              {mode === m.id && (
                <div className="absolute top-4 right-4 text-emerald-500">
                  <Check size={20} />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={() => nextStep('pair')}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const PairStep = () => {
    // Simulate detection
    React.useEffect(() => {
      const t = setTimeout(() => {
        setPairingStatus('detected');
      }, 2000);
      return () => clearTimeout(t);
    }, []);

    return (
      <div className="space-y-8 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Pair your glasses</h2>

        <div className="py-8 flex flex-col items-center justify-center min-h-[300px]">
          {pairingStatus === 'scanning' && (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                <Search size={32} className="text-zinc-400" />
              </div>
              <p className="text-zinc-500 font-medium">Scanning for nearby devices...</p>
            </div>
          )}

          {pairingStatus === 'detected' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-lg animate-in fade-in zoom-in-95 duration-500">
              <div className="flex justify-center mb-6">
                <img src={imgGlassesG11} alt="G1" className="h-20 object-contain" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Even Realities G1</h3>
              <p className="text-sm text-emerald-500 font-medium mb-6">Connected</p>

              <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <div className="flex flex-col items-center gap-1">
                  <Battery size={16} className="text-zinc-400" />
                  <span className="text-xs font-mono">84%</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Wifi size={16} className="text-zinc-400" />
                  <span className="text-xs font-mono">5G</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <UploadCloud size={16} className="text-zinc-400" />
                  <span className="text-xs font-mono">12ms</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => nextStep('autonomy')}
            className="flex items-center gap-2 px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            disabled={pairingStatus === 'scanning'}
          >
            {pairingStatus === 'scanning' ? "Searching..." : "Continue"} <ChevronRight size={16} />
          </button>

          <button className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline">
            Use Glasses Preview instead
          </button>
        </div>
      </div>
    );
  };

  const AutonomyStep = () => {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">How proactive should I be?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'capture', icon: <Database />, title: 'Capture only', desc: 'I capture and summarize. I do not send anything without you.' },
            { id: 'suggest', icon: <MessageSquare />, title: 'Suggest', desc: 'I generate drafts and ask for approval before sending.' },
            { id: 'act', icon: <Zap />, title: 'Act with constraints', desc: 'I can send internal summaries automatically. I always ask before external.' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setAutonomy(opt.id)}
              className={clsx(
                "p-6 rounded-xl border-2 text-left transition-all h-full flex flex-col",
                autonomy === opt.id
                  ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
              )}
            >
              <div className={clsx(
                "mb-4 w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0",
                autonomy === opt.id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
              )}>
                {React.cloneElement(opt.icon as React.ReactElement, { size: 20 })}
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{opt.title}</h3>
              <p className="text-sm text-zinc-500 leading-snug">{opt.desc}</p>
            </button>
          ))}
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl space-y-4 max-w-lg mx-auto border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Always ask before emailing external recipients</span>
            <div
              className={clsx("w-10 h-6 rounded-full p-1 cursor-pointer transition-colors", autonomySettings.emailExternal ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")}
              onClick={() => setAutonomySettings(p => ({...p, emailExternal: !p.emailExternal}))}
            >
              <div className={clsx("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", autonomySettings.emailExternal && "translate-x-4")} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ask before creating tasks or follow ups</span>
            <div
              className={clsx("w-10 h-6 rounded-full p-1 cursor-pointer transition-colors", autonomySettings.createTasks ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")}
              onClick={() => setAutonomySettings(p => ({...p, createTasks: !p.createTasks}))}
            >
              <div className={clsx("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", autonomySettings.createTasks && "translate-x-4")} />
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={() => nextStep('classifications')}
            className="flex items-center gap-2 px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const ClassificationsStep = () => {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Meeting Classification</h2>
          <p className="text-zinc-500">Rules for automatically categorizing meetings.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">Rule Name</th>
                  <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">Condition</th>
                  <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">Category</th>
                  <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-white text-right">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{rule.name}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs">{rule.condition}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                        {rule.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={clsx(
                          "w-10 h-6 rounded-full p-1 cursor-pointer transition-colors inline-block align-middle",
                          rule.active ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"
                        )}
                      >
                        <div className={clsx("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", rule.active ? "translate-x-4" : "translate-x-0")} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
            <button className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <div className="w-5 h-5 rounded-full border border-zinc-400 dark:border-zinc-600 flex items-center justify-center">
                <span className="text-xs leading-none">+</span>
              </div>
              Add New Rule
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <button
            onClick={skip}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Skip for now
          </button>
          <button
            onClick={() => nextStep('complete')}
            className="flex items-center gap-2 px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Finish setup <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const CompleteStep = () => (
    <div className="flex flex-col items-center text-center space-y-8 max-w-lg mx-auto">
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-500">
        <Check size={40} className="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">
          You are ready
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your first outputs will appear in Today and Notes automatically.
        </p>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={handleComplete}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
        >
          <span className="font-semibold text-zinc-900 dark:text-white">Start a live session</span>
          <ArrowRight size={20} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={handleComplete}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
        >
          <span className="font-semibold text-zinc-900 dark:text-white">Ask a research question</span>
          <ArrowRight size={20} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={handleComplete}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
        >
          <span className="font-semibold text-zinc-900 dark:text-white">Open Glasses Preview</span>
          <ArrowRight size={20} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50/95 dark:bg-black/95 backdrop-blur-sm">
      <div className="w-full max-w-4xl p-6 md:p-12 relative">
        {step !== 'welcome' && step !== 'complete' && (
          <button
            onClick={() => {
              const steps: Step[] = ['welcome', 'mode', 'pair', 'autonomy', 'classifications', 'complete'];
              const idx = steps.indexOf(step);
              if(idx > 0) prevStep(steps[idx - 1]);
            }}
            className="absolute top-8 left-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            <ChevronLeft size={24} />
            <span className="text-sm font-medium hidden sm:block">Back</span>
          </button>
        )}

        <button
          onClick={skip}
          className="absolute top-8 right-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Progress */}
        {step !== 'welcome' && step !== 'complete' && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {['mode', 'pair', 'autonomy', 'classifications'].map((s, i) => {
              const active = ['mode', 'pair', 'autonomy', 'classifications'].indexOf(step) >= i;
              return (
                <div
                  key={s}
                  className={clsx(
                    "h-1 rounded-full transition-all duration-500",
                    active ? "w-8 bg-zinc-900 dark:bg-white" : "w-2 bg-zinc-200 dark:bg-zinc-800"
                  )}
                />
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 * direction }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {step === 'welcome' && <WelcomeStep />}
            {step === 'mode' && <ModeStep />}
            {step === 'pair' && <PairStep />}
            {step === 'autonomy' && <AutonomyStep />}
            {step === 'classifications' && <ClassificationsStep />}
            {step === 'complete' && <CompleteStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
