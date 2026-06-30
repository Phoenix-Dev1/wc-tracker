"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Shield, MapPin, CheckCircle2 } from "lucide-react";
import { ProcessedMatch, isPlaceholderTeam } from "@/data/worldcup";
import { cn } from "@/utils/cn";
import MatchProgressCircle from "@/components/MatchProgressCircle";

interface MatchListRowProps {
  match: ProcessedMatch;
}

const formatCityName = (city: string) => {
  return city
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function MatchListRow({ match }: MatchListRowProps) {
  const searchParams = useSearchParams();
  const isMock = searchParams?.get("mock") === "true";
  const simTime = searchParams?.get("simTime");
  const mockQuery = isMock ? "?mock=true" : "";
  const simQuery = simTime ? `${isMock ? "&" : "?"}simTime=${encodeURIComponent(simTime)}` : "";
  const finalQuery = `${mockQuery}${simQuery}`;

  // Determine color theme based on game status
  const isLive = match.status === "LIVE";
  const isCompleted = match.status === "COMPLETED";

  const statusBadgeStyle = isLive
    ? "bg-emerald-55 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 font-semibold"
    : isCompleted
      ? "bg-bg-700 border border-border text-text-secondary"
      : "bg-cyan-55 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/50 text-cyan-700 dark:text-cyan-400 font-semibold";

  const cardClasses = cn(
    "group relative rounded-xl p-4 backdrop-blur-md transition-all duration-300 border",
    isLive && "bg-bg-800/90 border-emerald-400 dark:border-emerald-500 ring-1 ring-emerald-400 dark:ring-emerald-500 bg-gradient-to-r from-emerald-50/50 dark:from-emerald-950/20 via-bg-800/80 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.05)]",
    isCompleted && "bg-bg-700/60 border-border",
    !isLive && !isCompleted && "bg-bg-800 border-border hover:border-text-secondary/35 hover:shadow-sm"
  );

  const teamTextClasses = cn(
    "font-semibold text-sm sm:text-base hidden sm:inline truncate transition-colors",
    isCompleted ? "text-text-secondary" : "text-text-primary group-hover/link:text-cyan-600 dark:group-hover/link:text-cyan-400"
  );

  const tbdTextClasses = cn(
    "font-semibold text-sm sm:text-base hidden sm:inline truncate transition-colors",
    isCompleted ? "text-text-secondary" : "text-text-primary"
  );

  const isHomeWinner = isCompleted && (
    (match.homeScore ?? 0) > (match.awayScore ?? 0) ||
    (match.homeScore === match.awayScore && match.shootoutScore && match.shootoutScore.home > match.shootoutScore.away)
  );

  const isAwayWinner = isCompleted && (
    (match.awayScore ?? 0) > (match.homeScore ?? 0) ||
    (match.homeScore === match.awayScore && match.shootoutScore && match.shootoutScore.away > match.shootoutScore.home)
  );

  return (
    <div
      data-aos="fade-up"
      className={cardClasses}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">

        {/* Left Side: Match Info & Stadium */}
        <div className="flex flex-wrap items-center gap-3 text-xs md:w-1/3">
          <span className="font-mono px-2 py-0.5 bg-bg-900 border border-border text-text-secondary rounded">
            #{match.matchNumber}
          </span>
          <span className={`px-2 py-0.5 border rounded-full text-[10px] uppercase font-bold tracking-wider ${statusBadgeStyle}`}>
            {isLive ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {match.displayClock === "HT" ? "LIVE (HT)" : `LIVE (${match.displayClock || 0}')`}
              </span>
            ) : isCompleted ? (
              "Full Time"
            ) : (
              "Scheduled"
            )}
          </span>
          {match.group && (
            <span className="px-2 py-0.5 bg-purple-55 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-400 rounded-full text-[10px] font-semibold uppercase tracking-wider">
              Group {match.group}
            </span>
          )}
        </div>

        {/* Center Side: Teams, Flags & Scores */}
        <div className="flex items-center justify-between md:justify-center gap-6 md:w-1/3 my-2 md:my-0">

          {/* Home Team */}
          <div className="flex items-center gap-3 w-5/12 justify-end">
            {isPlaceholderTeam(match.homeTeam) ? (
              <>
                <span className={tbdTextClasses}>
                  {match.homeTeam || "TBD"}
                </span>
                <span className="px-2 py-0.5 rounded bg-bg-900 text-text-secondary border border-border font-mono text-[10px] font-bold sm:hidden">
                  TBD
                </span>
                <div className="w-8 h-8 rounded-lg bg-bg-900 border border-border flex items-center justify-center" title="TBD Shield">
                  <Shield size={14} className="text-text-secondary/60" />
                </div>
              </>
            ) : (
              <Link
                href={`/team/${encodeURIComponent(match.homeTeam)}${finalQuery}`}
                className="flex items-center gap-3 justify-end group/link hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors max-w-full"
              >
                <span className={cn(
                  teamTextClasses,
                  isHomeWinner && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-cyan-500 to-purple-500 dark:from-cyan-400 dark:via-cyan-300 dark:to-purple-400 !text-transparent"
                )}>
                  {match.homeTeam}
                </span>

                <span className="text-text-secondary/70 font-bold text-xs sm:hidden font-mono">
                  {match.homeCode}
                </span>
                <span className="text-xl sm:text-2xl" role="img" aria-label={`${match.homeTeam} Flag`}>
                  {match.homeFlag}
                </span>
              </Link>
            )}
          </div>

          {/* Scores or VS indicator */}
          <div className="flex items-center justify-center min-w-[70px]">
            {isCompleted || isLive ? (
              <MatchProgressCircle match={match} size={56} />
            ) : (
              <div className="flex items-center justify-center min-w-[70px] bg-bg-900 border border-border px-3 py-1.5 rounded-lg shadow-inner">
                <span className="text-[10px] font-mono tracking-widest text-cyan-600 dark:text-cyan-400 font-bold uppercase">
                  {match.formattedTimeJerusalem}
                </span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-3 w-5/12">
            {isPlaceholderTeam(match.awayTeam) ? (
              <>
                <div className="w-8 h-8 rounded-lg bg-bg-900 border border-border flex items-center justify-center" title="TBD Shield">
                  <Shield size={14} className="text-text-secondary/60" />
                </div>
                <span className={tbdTextClasses}>
                  {match.awayTeam || "TBD"}
                </span>
                <span className="px-2 py-0.5 rounded bg-bg-900 text-text-secondary border border-border font-mono text-[10px] font-bold sm:hidden">
                  TBD
                </span>
              </>
            ) : (
              <Link
                href={`/team/${encodeURIComponent(match.awayTeam)}${finalQuery}`}
                className="flex items-center gap-3 group/link hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors max-w-full"
              >
                <span className="text-xl sm:text-2xl" role="img" aria-label={`${match.awayTeam} Flag`}>
                  {match.awayFlag}
                </span>

                <span className={cn(
                  teamTextClasses,
                  isAwayWinner && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-cyan-500 to-purple-500 dark:from-cyan-400 dark:via-cyan-300 dark:to-purple-400 !text-transparent"
                )}>
                  {match.awayTeam}
                </span>
                <span className="text-text-secondary/70 font-bold text-xs sm:hidden font-mono">
                  {match.awayCode}
                </span>
              </Link>
            )}
          </div>

        </div>

        {/* Right Side: Venue Location */}
        <div className="flex flex-col gap-1 items-start md:items-end justify-center text-xs text-text-secondary md:w-1/3">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-text-secondary/60" />
            <span className="font-medium text-text-secondary">{match.stadium}</span>
          </div>
          <div className="flex items-center gap-1.5 pl-5 md:pl-0">
            <span className="text-[10px] uppercase tracking-wider text-text-secondary/80 font-semibold">
              {formatCityName(match.hostCity)}
            </span>
            {isCompleted && (
              <CheckCircle2 size={13} className="text-cyan-600 dark:text-cyan-400 ml-1 hidden md:block" />
            )}
          </div>
        </div>

      </div>

      {/* Shootout Winner Badge */}
      {isCompleted && match.shootoutScore && (
        <div className="mt-3 pt-2 border-t border-dashed border-border flex justify-center">
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/5 border border-purple-500/10 px-3 py-1 rounded-xl uppercase tracking-wider font-mono">
            🏆 {match.shootoutScore.home > match.shootoutScore.away ? match.homeTeam : match.awayTeam} won on penalties ({match.shootoutScore.home} - {match.shootoutScore.away})
          </span>
        </div>
      )}
    </div>
  );
}
