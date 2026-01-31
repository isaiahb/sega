import React, { useRef, useState, useEffect } from 'react';
import { Folder, Plus, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeTab: 'folders' | 'add' | 'settings';
  onTabChange: (tab: 'folders' | 'add' | 'settings') => void;
  onAddPress: () => void;
  onAddLongPress: () => void;
  isRecording?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onAddPress,
  onAddLongPress,
  isRecording = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = () => {
    setIsPressed(true);
    timerRef.current = setTimeout(() => {
      onAddLongPress();
      setIsPressed(false);
    }, 500);
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      if (isPressed) {
        onAddPress();
      }
    }
    setIsPressed(false);
  };
  
  useEffect(() => {
    return () => {
      if(timerRef.current) clearTimeout(timerRef.current);
    }
  }, []);

  return (
    <div className="h-[64px] flex items-center justify-between px-12 pb-2 bg-white dark:bg-black transition-colors">
      {/* Folders */}
      <button
        onClick={() => onTabChange('folders')}
        className={clsx(
          'flex flex-col items-center justify-center gap-1 transition-colors',
          activeTab === 'folders' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
        )}
      >
        <Folder
          size={24}
          strokeWidth={activeTab === 'folders' ? 2 : 1.5}
          fill={activeTab === 'folders' ? "currentColor" : "none"}
        />
      </button>

      {/* Add Button - Minimalist Center */}
      <div className="relative -top-6">
         <motion.button
            className={clsx(
                "w-14 h-14 rounded-full flex items-center justify-center shadow-sm border transition-colors",
                isRecording 
                    ? "bg-white dark:bg-zinc-800 border-red-500 text-red-500" 
                    : "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            )}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
                setIsPressed(false);
            }}
            whileTap={{ scale: 0.95 }}
         >
            {isRecording ? (
                <div className="w-5 h-5 bg-red-500 rounded-sm" />
            ) : (
                <Plus size={28} strokeWidth={1.5} />
            )}
         </motion.button>
      </div>

      {/* Settings */}
      <button
        onClick={() => onTabChange('settings')}
        className={clsx(
          'flex flex-col items-center justify-center gap-1 transition-colors',
          activeTab === 'settings' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
        )}
      >
        <Settings
          size={24}
          strokeWidth={activeTab === 'settings' ? 2 : 1.5}
        />
      </button>
    </div>
  );
};
