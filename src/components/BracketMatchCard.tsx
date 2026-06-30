"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { ProcessedMatch } from "@/data/types";
import { isPlaceholderTeam } from "@/data/teams";
import { cn } from "@/utils/cn";

interface BracketMatchCardProps {
  match: ProcessedMatch;
  queryStr?: string;
}

export default function BracketMatchCard({ match, queryStr = "" }: BracketMatchCardProps) {
  const isLive = match.status === "LIVE";
  const isCompleted = match.status === "COMPLETED";

  const renderTeamRow = (teamName: string, flag: string, code: string, isHome: boolean, score?: number) => {
    const isTbd = isPlaceholderTeam(teamName);
    const teamNameDisplay = isTbd ? "TBD" : teamName;
    const finalFlag = isTbd ? "🏳️" : flag;

    // Determine if this team is the winner (to add bold styling)
    const isWinner = isCompleted && (
      (isHome && (match.homeScore ?? 0) > (match.awayScore ?? 0)) ||
      (!isHome && (match.awayScore ?? 0) > (match.homeScore ?? 0)) ||
      (match.homeScore === match.awayScore && match.shootoutScore && (
        (isHome && match.shootoutScore.home > match.shootoutScore.away) ||
        (!isHome && match.shootoutScore.away > match.shootoutScore.home)
      ))
    );

    const teamContent = (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          {isTbd ? (
            <div className="w-4 h-4 rounded-full bg-slate-150 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
              <Shield size={10} className="stroke-[2.5]" />
            </div>
          ) : (
            <span className="text-sm leading-none shrink-0" role="img" aria-label={`${teamNameDisplay} flag`}>
              {finalFlag}
            </span>
          )}
          <span
            className={cn(
              "text-[11px] truncate font-medium text-text-primary",
              isTbd && "text-text-secondary italic",
              isWinner && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-cyan-500 to-purple-500 dark:from-cyan-400 dark:via-cyan-300 dark:to-purple-400 !text-transparent"
            )}
          >
            {teamNameDisplay}
          </span>
          {!isTbd && (
            <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider">
              {code}
            </span>
          )}
        </div>

        {/* Score Display */}
        <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
          {score !== undefined ? (
            <span className={cn("font-semibold text-text-primary", isWinner && "font-bold text-cyan-600 dark:text-cyan-400")}>
              {score}
            </span>
          ) : (
            <span className="text-text-muted">-</span>
          )}
        </div>
      </div>
    );

    if (isTbd) {
      return (
        <div className="flex items-center justify-between h-8 px-2.5 py-1 rounded-lg bg-slate-50/50 dark:bg-slate-950/20 border border-transparent select-none">
          {teamContent}
        </div>
      );
    }

    return (
      <Link
        href={`/team/${encodeURIComponent(teamName)}${queryStr}`}
        className="flex items-center justify-between h-8 px-2.5 py-1 rounded-lg bg-slate-50/50 hover:bg-cyan-50/50 dark:bg-slate-950/20 dark:hover:bg-cyan-950/10 border border-slate-100 dark:border-slate-800/40 hover:border-cyan-300/30 dark:hover:border-cyan-500/20 transition-all duration-200"
      >
        {teamContent}
      </Link>
    );
  };

  // Status Badge Helper
  const getStatusBadge = () => {
    if (isLive) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider animate-pulse">
          <span className="w-1 h-1 rounded-full bg-emerald-500" />
          {match.displayClock || "LIVE"}
        </span>
      );
    }

    if (isCompleted) {
      const isShootout = match.shootoutScore !== undefined;
      return (
        <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-text-secondary text-[9px] font-bold uppercase tracking-wider">
          {isShootout ? "FT (P)" : "FT"}
        </span>
      );
    }

    return (
      <span className="px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider">
        Upcoming
      </span>
    );
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border shadow-sm transition-all duration-300 w-[240px] sm:w-[260px] shrink-0 hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700",
        isLive
          ? "border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-[pulse_3s_infinite]"
          : "border-slate-200 dark:border-slate-800"
      )}
    >
      {/* Top Header: Match Number & Status */}
      <div className="flex items-center justify-between text-[10px] text-text-secondary select-none">
        <span className="font-semibold text-text-muted">
          Match #{match.matchNumber}
        </span>
        {getStatusBadge()}
      </div>

      {/* Main Teams & Scores Grid */}
      <div className="flex flex-col gap-1.5">
        {renderTeamRow(match.homeTeam, match.homeFlag, match.homeCode, true, match.homeScore)}
        {renderTeamRow(match.awayTeam, match.awayFlag, match.awayCode, false, match.awayScore)}
      </div>

      {/* Shootout Info (if applicable) */}
      {isCompleted && match.shootoutScore && (
        <div className="text-[9px] text-center font-semibold text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 py-0.5 rounded-lg border border-purple-100 dark:border-purple-900/30 font-mono uppercase tracking-wider select-none">
          Penalties: {match.shootoutScore.home} - {match.shootoutScore.away}
        </div>
      )}

      {/* Footer: Date & Location (reveals on hover) */}
      <div className="max-h-0 overflow-hidden opacity-0 scale-y-95 origin-top group-hover:max-h-20 group-hover:opacity-100 group-hover:scale-y-100 border-t border-transparent group-hover:border-slate-100 dark:group-hover:border-slate-800/40 group-hover:pt-2 group-hover:mt-1 transition-all duration-300 ease-out text-[9px] text-text-muted font-medium select-none flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span>{match.formattedDateJerusalem}</span>
          <span>{match.formattedTimeJerusalem} (JST)</span>
        </div>
        <span className="truncate">{match.stadium}, {match.hostCity.replace(/-/g, ' ')}</span>
      </div>
    </div>
  );
}
