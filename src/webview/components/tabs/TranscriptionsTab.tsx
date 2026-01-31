import React, { useState } from 'react';
import { TranscriptionSegment } from '../../lib/mockData';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

interface TranscriptionsTabProps {
  transcriptions: TranscriptionSegment[];
}

export const TranscriptionsTab: React.FC<TranscriptionsTabProps> = ({ transcriptions }) => {
  const [expandedHours, setExpandedHours] = useState<Set<number>>(new Set());

  // Group transcriptions by hour
  const groupedTranscriptions = transcriptions.reduce((acc, segment) => {
    const timeStr = segment.time || "00:00";
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (!acc[hour]) {
      acc[hour] = [];
    }
    acc[hour].push(segment);
    return acc;
  }, {} as Record<number, TranscriptionSegment[]>);

  const hours = Object.keys(groupedTranscriptions)
    .map(Number)
    .sort((a, b) => a - b);

  const toggleHour = (hour: number) => {
    const newExpanded = new Set(expandedHours);
    if (newExpanded.has(hour)) {
      newExpanded.delete(hour);
    } else {
      newExpanded.add(hour);
    }
    setExpandedHours(newExpanded);
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h} ${ampm}`;
  };

  const getTitle = (segments: TranscriptionSegment[]) => {
      const firstText = segments[0]?.text || "";
      if (firstText.length > 55) {
          return firstText.substring(0, 55) + "...";
      }
      return firstText;
  };

  return (
    <div className="flex flex-col pb-32 w-full">
      <div className="py-2">
        {hours.map((hour) => {
          const segments = groupedTranscriptions[hour];
          const isExpanded = expandedHours.has(hour);
          const title = getTitle(segments);

          return (
            <div key={hour} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
              <button
                onClick={() => toggleHour(hour)}
                className="w-full flex items-center py-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors text-left px-6"
              >
                {/* Time Column */}
                <div className="w-16 shrink-0 flex flex-col items-start pt-0.5">
                     <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {formatHour(hour)}
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                       {segments.length} seg
                    </span>
                </div>

               {/* Content Preview */}
               <div className="flex-1 min-w-0 pr-4">
                   <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                       {title}
                   </p>
               </div>

                {/* Chevron */}
                <div className={clsx("text-zinc-300 dark:text-zinc-600 transition-transform duration-200 shrink-0", isExpanded && "rotate-180")}>
                  <ChevronDown size={18} />
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-6 pb-6 space-y-6 animate-in slide-in-from-top-2 duration-200 bg-zinc-50/30 dark:bg-black/20">
                    <div className="h-2" />
                    {segments.map((segment) => (
                        <div key={segment.id} className="flex flex-col gap-1.5 relative pl-16">
                            <div className="flex items-baseline justify-between gap-4">
                                <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
                                    {segment.time}
                                </span>
                                {segment.speaker && (
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                                        {segment.speaker}
                                    </span>
                                )}
                            </div>

                            <p className="text-[15px] text-zinc-900 dark:text-zinc-200 leading-relaxed font-normal">
                                {segment.text}
                            </p>
                        </div>
                    ))}
                    <div className="h-2" />
                </div>
              )}
            </div>
          );
        })}

        {transcriptions.length === 0 && (
            <div className="text-center py-20 text-zinc-400 dark:text-zinc-500 text-sm">No transcription data</div>
        )}
      </div>
    </div>
  );
};
