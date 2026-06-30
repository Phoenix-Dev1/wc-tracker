"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { ProcessedMatch } from "@/data/types";
import BracketMatchCard from "./BracketMatchCard";
import { cn } from "@/utils/cn";

interface KnockoutBracketProps {
  matches: ProcessedMatch[];
  queryStr?: string;
}

const ROUNDS = [
  { id: "r32", label: "Round of 32", matchesCount: 16 },
  { id: "r16", label: "Round of 16", matchesCount: 8 },
  { id: "qf", label: "Quarter-finals", matchesCount: 4 },
  { id: "sf", label: "Semi-finals", matchesCount: 2 },
  { id: "fn", label: "Final", matchesCount: 1 }
];

// Tree-aligned order of match numbers to make the brackets align visually
const ROUND_32_ORDER = [74, 77, 73, 75, 79, 81, 82, 84, 76, 78, 80, 83, 85, 87, 86, 88];
const ROUND_16_ORDER = [89, 90, 93, 94, 91, 92, 95, 96];
const QUARTER_ORDER = [97, 98, 99, 100];
const SEMI_ORDER = [101, 102];
const FINAL_ORDER = [104];

export default function KnockoutBracket({ matches, queryStr = "" }: KnockoutBracketProps) {
  const [activeRoundIdx, setActiveRoundIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Group processed matches by round using our visual tree ordering
  const getMatchesForRound = (roundId: string) => {
    switch (roundId) {
      case "r32":
        return ROUND_32_ORDER.map(num => matches.find(m => m.matchNumber === num)).filter(Boolean) as ProcessedMatch[];
      case "r16":
        return ROUND_16_ORDER.map(num => matches.find(m => m.matchNumber === num)).filter(Boolean) as ProcessedMatch[];
      case "qf":
        return QUARTER_ORDER.map(num => matches.find(m => m.matchNumber === num)).filter(Boolean) as ProcessedMatch[];
      case "sf":
        return SEMI_ORDER.map(num => matches.find(m => m.matchNumber === num)).filter(Boolean) as ProcessedMatch[];
      case "fn":
        return FINAL_ORDER.map(num => matches.find(m => m.matchNumber === num)).filter(Boolean) as ProcessedMatch[];
      default:
        return [];
    }
  };

  const handleTabClick = (idx: number) => {
    isProgrammaticScrollRef.current = true;
    setActiveRoundIdx(idx);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    if (containerRef.current) {
      const container = containerRef.current;
      const activeColumn = container.children[idx] as HTMLElement;
      if (activeColumn) {
        const containerWidth = container.offsetWidth;
        const columnWidth = activeColumn.offsetWidth;
        const columnOffset = activeColumn.offsetLeft;
        const scrollToX = columnOffset - (containerWidth / 2) + (columnWidth / 2);

        container.scrollTo({
          left: scrollToX,
          behavior: "smooth"
        });
      }
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 600);
  };

  const handlePrevRound = () => {
    const nextIdx = Math.max(0, activeRoundIdx - 1);
    handleTabClick(nextIdx);
  };

  const handleNextRound = () => {
    const nextIdx = Math.min(ROUNDS.length - 1, activeRoundIdx + 1);
    handleTabClick(nextIdx);
  };

  // Sync scroll position back to active tab (when user manual scrolls)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      const containerWidth = container.offsetWidth;
      const containerCenter = container.scrollLeft + containerWidth / 2;
      const children = Array.from(container.children) as HTMLElement[];

      let closestIdx = 0;
      let minDistance = Infinity;

      children.forEach((child, idx) => {
        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const distance = Math.abs(containerCenter - childCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = idx;
        }
      });

      setActiveRoundIdx(closestIdx);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Center active column on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleTabClick(0);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Round Navigation Stepper Header ── */}
      <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
        <button
          onClick={handlePrevRound}
          disabled={activeRoundIdx === 0}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-text-primary disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all duration-200"
          aria-label="Previous round"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1">
          {ROUNDS.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => handleTabClick(idx)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer select-none",
                activeRoundIdx === idx
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleNextRound}
          disabled={activeRoundIdx === ROUNDS.length - 1}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-text-primary disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all duration-200"
          aria-label="Next round"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── Bracket Columns Display ── */}
      <div
        ref={containerRef}
        className="flex gap-12 sm:gap-16 overflow-x-auto pb-8 pt-4 px-4 snap-x snap-mandatory scroll-smooth w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {ROUNDS.map((round, rIdx) => {
          const roundMatches = getMatchesForRound(round.id);
          const isActive = activeRoundIdx === rIdx;

          return (
            <div
              key={round.id}
              className={cn(
                "snap-center min-w-[300px] sm:min-w-[320px] max-w-[350px] shrink-0 flex flex-col gap-6 items-center transition-all duration-300",
                !isActive && "opacity-35 scale-95"
              )}
            >
              {/* Stage Header */}
              <div className="text-center select-none font-bold text-xs uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 pb-1.5 border-b border-cyan-500/10 w-full">
                {round.label}
              </div>

              {/* Match list with dynamic spacing per stage to look like a tree */}
              <div
                className="flex flex-col w-full justify-around h-[680px]"
              >
                {roundMatches.map((m) => (
                  <div
                    key={m.matchNumber}
                    className="flex justify-center transition-transform hover:scale-[1.03] duration-200"
                  >
                    <BracketMatchCard match={m} queryStr={queryStr} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bracket Footer Disclaimer */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted select-none">
        <HelpCircle size={12} className="stroke-[2.5]" />
        <span>All knockout phase kickoff times are displayed in Israel/Jerusalem Time (GMT+3). Hover cards to view details.</span>
      </div>
    </div>
  );
}
