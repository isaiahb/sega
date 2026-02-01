import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription 
} from '@/app/components/ui/dialog';
import { X, Mic, Circle, Battery, Wifi, Clock, MessageSquare, List, AlertTriangle, Check } from 'lucide-react';

interface GlassesPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlassesPreviewModal: React.FC<GlassesPreviewModalProps> = ({
  open,
  onOpenChange
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] md:max-w-4xl h-[80vh] bg-black border-zinc-800 p-0 overflow-hidden text-white sm:rounded-3xl">
        <DialogTitle className="sr-only">Glasses HUD Preview</DialogTitle>
        <DialogDescription className="sr-only">Live preview of the smart glasses interface</DialogDescription>
        
        <div className="relative w-full h-full bg-black">
             {/* Close Button */}
             <button 
                onClick={() => onOpenChange(false)}
                className="absolute top-6 right-6 z-50 p-2 bg-zinc-900/50 hover:bg-zinc-800 text-white rounded-full transition-colors backdrop-blur-sm"
             >
                 <X size={20} />
             </button>

             {/* Background Image/Effect Simulation */}
             <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-black to-black pointer-events-none" />

             {/* Main HUD Content */}
             <div className="absolute inset-0 p-6 md:p-12 flex flex-col font-mono text-green-400 overflow-hidden">
                 
                 {/* Top Bar */}
                 <div className="flex justify-between items-start opacity-80 mb-4 shrink-0">
                     <div className="flex gap-4">
                         <div className="flex items-center gap-2">
                             <Clock size={16} />
                             <span className="text-xs md:text-sm">14:05</span>
                         </div>
                         <div className="flex items-center gap-2 text-red-500 animate-pulse">
                             <Mic size={16} />
                             <span className="text-xs md:text-sm">REC 12:04</span>
                         </div>
                     </div>
                     <div className="flex gap-4">
                         <div className="flex items-center gap-2">
                             <Wifi size={16} />
                             <span className="text-xs md:text-sm">5G</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <Battery size={16} />
                             <span className="text-xs md:text-sm">84%</span>
                         </div>
                     </div>
                 </div>

                 {/* Main Content Area */}
                 <div className="flex-1 flex items-center justify-center min-h-0 w-full">
                     <div className="max-w-lg w-full space-y-4 md:space-y-6 overflow-y-auto max-h-full p-2 custom-scrollbar">
                         
                         {/* Live Transcription Snippet */}
                         <div className="space-y-2">
                             <div className="flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-widest opacity-50">
                                 <MessageSquare size={12} /> Live Transcript
                             </div>
                             <p className="text-lg md:text-xl leading-relaxed text-white drop-shadow-md">
                                 "So the consensus is we <span className="text-green-400 font-bold bg-green-400/10 px-1 rounded">delay backend migration</span> until Q4."
                             </p>
                         </div>

                         {/* Extracted Insight */}
                         <div className="bg-zinc-900/80 border border-green-500/30 p-3 md:p-4 rounded-xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-700">
                             <div className="flex items-center gap-2 text-green-400 mb-2 font-bold uppercase text-[10px] md:text-xs tracking-wider">
                                 <Check size={14} /> Decision Detected
                             </div>
                             <p className="text-base md:text-lg text-white">Migration postponed to Q4 2026</p>
                         </div>

                         {/* Alert / Context */}
                         <div className="flex items-center gap-3 text-amber-400 opacity-80">
                             <AlertTriangle size={16} />
                             <span className="text-xs md:text-sm">Context: This contradicts the roadmap from Jan 15.</span>
                         </div>

                     </div>
                 </div>

                 {/* Bottom Bar */}
                 <div className="flex justify-between items-end opacity-60 mt-4 shrink-0">
                     <div className="flex gap-4 md:gap-6 text-xs md:text-sm">
                         <div className="flex items-center gap-2">
                             <List size={14} />
                             <span>3 Decisions</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <Check size={14} />
                             <span>5 Actions</span>
                         </div>
                     </div>
                     <div className="text-[10px] md:text-xs">
                         Executive Lens OS v2.1
                     </div>
                 </div>

             </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
