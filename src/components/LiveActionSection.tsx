"use client";

import { Radio } from "lucide-react";
import { ProcessedMatch } from "@/data/worldcup";
import LiveActionCard from "@/components/LiveActionCard";

interface LiveActionSectionProps {
  liveMatches: ProcessedMatch[];
}

export default function LiveActionSection({ liveMatches }: LiveActionSectionProps) {
  return (
    <section className="mb-10" data-aos="fade-down" data-aos-duration="600">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          {/* Pulsing recording dot */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
          <Radio className="text-rose-500" size={18} />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
            Live Action
          </h2>
          <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
            {liveMatches.length} LIVE
          </span>
        </div>
        <div className="h-[1px] flex-grow bg-gradient-to-r from-rose-400/30 to-transparent ml-4 hidden sm:block" />
      </div>

      {/* Responsive card grid — 1 col on mobile, 2 on md+, 3 on xl+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {liveMatches.map((match, idx) => (
          <LiveActionCard key={match.matchNumber} match={match} index={idx} />
        ))}
      </div>
    </section>
  );
}
