"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Trophy,
  Shield,
} from "lucide-react";
import {
  getTeamInfo,
  formatJerusalemTime,
  formatJerusalemDate,
  normalizeTeamName,
} from "@/data/worldcup";
import { TeamMatch, StandingGroup } from "./page";

interface TeamPageClientProps {
  teamName: string;
  matches: TeamMatch[];
  standings: StandingGroup | null;
  isFallback: boolean;
}

// Helper to join tailwind class names conditionally
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const formatStageName = (stage: string): string => {
  if (!stage) return "";
  const cleaned = stage.toLowerCase().replace(/_/g, " ");
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatCityName = (city: string) => {
  return city
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function TeamPageClient({
  teamName,
  matches,
  standings,
  isFallback,
}: TeamPageClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Background polling to refresh server-side data from cache
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);
    return () => clearInterval(interval);
  }, [router]);

  const teamInfo = getTeamInfo(teamName);
  const normalizedTeam = normalizeTeamName(teamName);

  return (
    <div className="min-h-screen bg-bg-900 text-text-primary font-sans relative overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-800">
      {/* Background Glow Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-200/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[45%] h-[50%] bg-purple-200/15 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b80_1px,transparent_1px),linear-gradient(to_bottom,#1e293b80_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-medium group"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            Back to World Cup Tracker
          </Link>
        </div>

        {/* Warning Fallback Banner */}
        {isFallback && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex gap-3 shadow-sm">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-sm">Live Scores Offline</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                We are currently experiencing issues connecting to the live data feed. 
                Displaying scheduled kickoffs and offline match details from fallback local data.
              </p>
            </div>
          </div>
        )}

        {/* Team Hero Header */}
        <div className="bg-bg-800/80 backdrop-blur-md border border-border rounded-2xl p-6 sm:p-8 mb-8 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-20 h-20 bg-bg-900 border border-border rounded-2xl shadow-sm flex items-center justify-center text-4xl select-none">
              {teamInfo.flag}
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
                  {teamName}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-bg-900 border border-border text-text-secondary rounded-md shadow-sm">
                  {teamInfo.code}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1 uppercase tracking-wider font-semibold">
                FIFA World Cup 2026 Contender
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end justify-center">
            <div className="text-xs text-text-secondary/70 font-medium">Local Kickoffs Shown In</div>
            <div className="text-sm text-cyan-600 dark:text-cyan-400 font-bold tracking-wide mt-0.5">
              Jerusalem Time (Asia/Jerusalem)
            </div>
          </div>
        </div>

        {/* Group Standings Mini-Table */}
        {standings && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="text-cyan-500" size={18} />
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                {standings.groupName} Live Standings
              </h2>
            </div>
            
            <div className="bg-bg-800/80 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-bg-900 border-b border-border text-text-secondary font-semibold text-[11px] tracking-wider uppercase">
                      <th className="py-3 px-4 text-center w-12">Pos</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-3 text-center">P</th>
                      <th className="py-3 px-2 text-center hidden sm:table-cell">W</th>
                      <th className="py-3 px-2 text-center hidden sm:table-cell">D</th>
                      <th className="py-3 px-2 text-center hidden sm:table-cell">L</th>
                      <th className="py-3 px-3 text-center">GD</th>
                      <th className="py-3 px-4 text-center font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/5">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {standings.table.map((row) => {
                      const isTargetTeam = normalizeTeamName(row.team.name) === normalizedTeam;
                      const teamMeta = getTeamInfo(row.team.name);
                      
                      return (
                        <tr
                          key={row.team.id}
                          className={`transition-colors ${
                            isTargetTeam
                              ? "bg-cyan-500/5 font-semibold text-text-primary"
                              : "hover:bg-bg-900/50 text-text-secondary"
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-text-secondary">
                            {row.position}
                          </td>
                          <td className="py-3.5 px-4">
                            <Link
                              href={`/team/${encodeURIComponent(row.team.name)}`}
                              className="flex items-center gap-2 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group cursor-pointer"
                            >
                              {row.team.crest ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={row.team.crest}
                                  alt={row.team.name}
                                  className="w-5 h-5 object-contain transition-transform group-hover:scale-105"
                                  onError={(e) => {
                                    // Remove crest if failed to load
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <span className="text-lg transition-transform group-hover:scale-105">{teamMeta.flag}</span>
                              )}
                              <span className="truncate group-hover:underline text-text-primary">{row.team.shortName || row.team.name}</span>
                              {isTargetTeam && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shrink-0" />
                              )}
                            </Link>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-text-secondary">{row.playedGames}</td>
                          <td className="py-3.5 px-2 text-center font-mono hidden sm:table-cell text-text-secondary">{row.won}</td>
                          <td className="py-3.5 px-2 text-center font-mono hidden sm:table-cell text-text-secondary">{row.draw}</td>
                          <td className="py-3.5 px-2 text-center font-mono hidden sm:table-cell text-text-secondary">{row.lost}</td>
                          <td className={`py-3.5 px-3 text-center font-mono font-semibold ${
                            row.goalDifference > 0 
                              ? "text-emerald-600" 
                              : row.goalDifference < 0 
                              ? "text-rose-600" 
                              : "text-text-secondary/50"
                          }`}>
                            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/5">
                            {row.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Matches Schedule Timeline */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-cyan-500" size={18} />
            <h2 className="text-lg font-bold text-text-primary tracking-tight">
              Match Schedule & Results
            </h2>
          </div>

          <div className="space-y-4">
            {matches.length > 0 ? (
              matches.map((match) => {
                const isLive = match.status === "IN_PLAY" || match.status === "LIVE" || match.status === "PAUSED";
                const isCompleted = match.status === "FINISHED" || match.status === "COMPLETED";

                const homeMeta = getTeamInfo(match.homeTeam.name);
                const awayMeta = getTeamInfo(match.awayTeam.name);

                const statusBadgeStyle = isLive
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/80 dark:text-emerald-400"
                  : isCompleted
                  ? "bg-bg-700 border border-border text-text-secondary"
                  : "bg-cyan-50 border border-cyan-200 text-cyan-700 dark:bg-cyan-950/20 dark:border-cyan-800/80 dark:text-cyan-400";

                const cardClasses = cn(
                  "relative rounded-xl p-5 backdrop-blur-md transition-all duration-300 border",
                  isLive && "bg-bg-800/90 border-emerald-450 ring-1 ring-emerald-450 bg-gradient-to-r from-emerald-500/5 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.05)]",
                  isCompleted && "bg-bg-700/60 border-border",
                  !isLive && !isCompleted && "bg-bg-800 border-border hover:border-text-secondary/30 hover:shadow-sm"
                );

                const teamTextClasses = cn(
                  "font-semibold text-sm sm:text-base hidden sm:inline truncate transition-colors",
                  isCompleted ? "text-text-secondary" : "text-text-primary"
                );

                return (
                  <div
                    key={match.id}
                    className={cardClasses}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                      {/* Left: Metadata & Status */}
                      <div className="flex flex-wrap items-center gap-2 text-xs md:w-1/3">
                        {match.matchNumber > 0 && (
                          <span className="font-mono px-2 py-0.5 bg-bg-900 border border-border text-text-secondary rounded">
                            #{match.matchNumber}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 border rounded-full text-[10px] uppercase font-bold tracking-wider ${statusBadgeStyle}`}>
                          {isLive ? (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              {match.displayClock === "HT" || match.status === "PAUSED" ? "LIVE (HT)" : `LIVE (${match.displayClock || 0}')`}
                            </span>
                          ) : isCompleted ? (
                            "Full Time"
                          ) : (
                            "Scheduled"
                          )}
                        </span>
                        <span className="px-2 py-0.5 bg-bg-900 border border-border text-text-secondary rounded-full text-[10px] font-semibold uppercase tracking-wider">
                          {formatStageName(match.stage)}
                        </span>
                      </div>

                      {/* Center: Teams & Score */}
                      <div className="flex items-center justify-between md:justify-center gap-4 md:w-1/3 my-2 md:my-0">
                        {/* Home Team */}
                        <Link
                          href={`/team/${encodeURIComponent(match.homeTeam.name)}`}
                          className="flex items-center gap-2.5 w-5/12 justify-end hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group cursor-pointer"
                        >
                          <span className={cn(teamTextClasses, "group-hover:underline")}>
                            {match.homeTeam.name}
                          </span>
                          <span className="text-text-secondary/70 font-bold text-xs sm:hidden font-mono">
                            {match.homeTeam.tla}
                          </span>
                          {match.homeTeam.crest ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={match.homeTeam.crest}
                              alt={match.homeTeam.name}
                              className="w-6 h-6 object-contain transition-transform group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-2xl select-none transition-transform group-hover:scale-105">{homeMeta.flag}</span>
                          )}
                        </Link>

                        {/* Score Indicator */}
                        <div className="flex items-center justify-center min-w-[65px] bg-bg-900 border border-border px-2.5 py-1.5 rounded-lg shadow-inner">
                          {isCompleted || isLive ? (
                            <div className="flex items-center gap-1.5 font-mono text-base font-bold">
                              <span className={isLive ? "text-emerald-600 flex items-baseline gap-0.5" : "text-text-primary flex items-baseline gap-0.5"}>
                                {match.score.home ?? 0}
                                {match.shootoutScore && <span className="text-[8px] text-text-secondary">({match.shootoutScore.home})</span>}
                              </span>
                              <span className="text-text-secondary/40 font-light">:</span>
                              <span className={isLive ? "text-emerald-600 flex items-baseline gap-0.5" : "text-text-primary flex items-baseline gap-0.5"}>
                                {match.shootoutScore && <span className="text-[8px] text-text-secondary">({match.shootoutScore.away})</span>}
                                {match.score.away ?? 0}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono tracking-wider text-cyan-600 dark:text-cyan-400 font-bold uppercase">
                              {mounted ? formatJerusalemTime(match.utcDate) : "VS"}
                            </span>
                          )}
                        </div>

                        {/* Away Team */}
                        <Link
                          href={`/team/${encodeURIComponent(match.awayTeam.name)}`}
                          className="flex items-center gap-2.5 w-5/12 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group cursor-pointer"
                        >
                          {match.awayTeam.crest ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={match.awayTeam.crest}
                              alt={match.awayTeam.name}
                              className="w-6 h-6 object-contain transition-transform group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-2xl select-none transition-transform group-hover:scale-105">{awayMeta.flag}</span>
                          )}
                          <span className={cn(teamTextClasses, "group-hover:underline")}>
                            {match.awayTeam.name}
                          </span>
                          <span className="text-text-secondary/70 font-bold text-xs sm:hidden font-mono">
                            {match.awayTeam.tla}
                          </span>
                        </Link>
                      </div>

                      {/* Right: Venue Info */}
                      <div className="flex flex-col gap-1 items-start md:items-end justify-center text-xs text-text-secondary md:w-1/3">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-600 truncate max-w-[150px] sm:max-w-none">
                            {match.stadium}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pl-5 md:pl-0">
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                            {formatCityName(match.hostCity)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Goal scorers (only shown for completed / live matches with data) */}
                    {(isCompleted || isLive) && match.goals && match.goals.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-4 items-start">
                        {/* Home team goals (left column) */}
                        <div className="flex flex-col gap-1 items-start justify-start min-w-0 w-full">
                          {match.goals
                            .filter((g) => g.team === match.homeTeam.name)
                            .map((g, i) => {
                              const label =
                                g.type === "OWN" || g.type === "og" ? " (og)" : g.type === "PENALTY" || g.type === "pen" ? " (pen)" : "";
                              const minuteStr = `${g.minute}${g.injuryTime ? `+${g.injuryTime}` : ""}`;
                              return (
                                <div
                                  key={i}
                                  className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary w-full min-w-0"
                                >
                                  <span className={`${isLive ? "text-emerald-500" : "text-text-secondary/60"} shrink-0`}>⚽</span>
                                  <span className="truncate">{g.scorer}{label}</span>
                                  <span className="text-text-secondary/50 font-mono text-[10px] shrink-0">{minuteStr}&apos;</span>
                                </div>
                              );
                            })}
                        </div>
                        {/* Away team goals (right column) */}
                        <div className="flex flex-col gap-1 items-end justify-start min-w-0 w-full">
                          {match.goals
                            .filter((g) => g.team !== match.homeTeam.name)
                            .map((g, i) => {
                              const label =
                                g.type === "OWN" || g.type === "og" ? " (og)" : g.type === "PENALTY" || g.type === "pen" ? " (pen)" : "";
                              const minuteStr = `${g.minute}${g.injuryTime ? `+${g.injuryTime}` : ""}`;
                              return (
                                <div
                                  key={i}
                                  className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary flex-row-reverse w-full min-w-0"
                                >
                                  <span className={`${isLive ? "text-emerald-500" : "text-text-secondary/60"} shrink-0`}>⚽</span>
                                  <span className="truncate">{g.scorer}{label}</span>
                                  <span className="text-text-secondary/50 font-mono text-[10px] shrink-0">{minuteStr}&apos;</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Bottom kickoff details */}
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-cyan-600 dark:text-cyan-400" />
                        <span>
                          {mounted ? formatJerusalemDate(match.utcDate) : match.utcDate.split("T")[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-cyan-600 dark:text-cyan-400" />
                        <span>
                          Kickoff:{" "}
                          <strong className="text-cyan-700 dark:text-cyan-400 font-mono">
                            {mounted ? `${formatJerusalemTime(match.utcDate)} (JST)` : "Pending"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-bg-800 border border-border rounded-2xl py-12 text-center text-text-secondary shadow-sm">
                <Shield className="mx-auto text-text-secondary/40 mb-3" size={32} />
                <p className="font-medium">No matches scheduled for this team.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
