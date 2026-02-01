import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Toaster, toast } from 'sonner';
import { Sidebar } from '@/app/components/Sidebar';
import { TopBar } from '@/app/components/TopBar';

// Views
import { TodayView } from '@/app/views/TodayView';
import { ActionsView } from '@/app/views/ActionsView';
import { AgentsView } from '@/app/views/AgentsView';
import { SettingsView } from '@/app/views/Settings';
import { HelpView } from '@/app/views/HelpView';
import { NotesView } from '@/app/views/NotesView';
import { OnboardingWizard } from '@/app/components/onboarding/OnboardingWizard';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('today');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hasOnboarded, setHasOnboarded] = useState(false);

  // Check Onboarding Status
  useEffect(() => {
    const boarded = localStorage.getItem('executive-lens-onboarded');
    if (boarded) setHasOnboarded(true);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('executive-lens-onboarded', 'true');
    setHasOnboarded(true);
  };

  // Toggle Theme Function
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Keyboard Navigation for Views
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "1" && (e.metaKey || e.ctrlKey)) setActiveView('today');
      if (e.key === "3" && (e.metaKey || e.ctrlKey)) setActiveView('notes');
      if (e.key === "5" && (e.metaKey || e.ctrlKey)) setActiveView('actions');
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const renderView = () => {
      switch(activeView) {
          case 'today': return <TodayView onNavigate={setActiveView} />;
          case 'notes': return <NotesView />;
          case 'actions': return <ActionsView />;
          case 'agents': return <AgentsView />;
          case 'settings': return <div className="p-8"><SettingsView isDarkMode={theme === 'dark'} onToggleTheme={toggleTheme} /></div>;
          case 'help': return <HelpView />;
          default: return <TodayView onNavigate={setActiveView} />;
      }
  };

  const getBreadcrumb = () => {
      return activeView.charAt(0).toUpperCase() + activeView.slice(1);
  };

  return (
    <div className={clsx("flex h-screen w-full font-sans bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800", theme)}>
      <Toaster position="top-center" theme={theme} />
      
      {!hasOnboarded && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      
      {/* Sidebar */}
      <Sidebar 
          isOpen={sidebarOpen} 
          activeItem={activeView} 
          onNavigate={setActiveView} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-black relative transition-all duration-300">
          
          <TopBar 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
            title={getBreadcrumb()}
            onNavigate={setActiveView}
          />

          <main className="flex-1 overflow-hidden relative">
              {renderView()}
          </main>

      </div>
    </div>
  );
}
