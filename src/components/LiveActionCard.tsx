"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, MapPin, Activity, ChevronDown } from "lucide-react";
import { ProcessedMatch, isPlaceholderTeam } from "@/data/worldcup";
import MatchProgressCircle from "@/components/MatchProgressCircle";

interface LiveActionCardProps {
  match: ProcessedMatch;
  index: number;
}

export default function LiveActionCard({ match, index }: LiveActionCardProps) {
  const [isDeepScanOpen, setIsDeepScanOpen] = useState(false);
  const searchParams = useSearchParams();
  const isMock = searchParams?.get("mock") === "true";
  const mockQuery = isMock ? "?mock=true" : "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl p-5 backdrop-blur-md border bg-bg-800/90 border-emerald-400 dark:border-emerald-500 ring-1 ring-emerald-400/60 dark:ring-emerald-500/40 bg-gradient-to-br from-emerald-50/60 dark:from-emerald-950/20 via-bg-800/80 to-transparent shadow-[0_4px_24px_rgba(16,185,129,0.12)] overflow-hidden"
    >
      {/* Ambient glow blob */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top row: match number */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono font-semibold tracking-wider text-text-secondary bg-bg-900 border border-border px-2 py-0.5 rounded">
          MATCH {match.matchNumber}
        </span>
      </div>

      {/* Teams + score (Horizontal Layout with circular progress) */}
      <div className="flex items-center justify-between gap-4 my-6">
        {/* Home Team */}
        <div className="flex flex-col items-center flex-1 min-w-0">
          {isPlaceholderTeam(match.homeTeam) ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-bg-900 border border-border flex items-center justify-center shadow-sm">
                <Shield size={24} className="text-text-secondary/60" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-text-primary text-center truncate w-full">{match.homeTeam || "TBD"}</span>
            </div>
          ) : (
            <Link
              href={`/team/${encodeURIComponent(match.homeTeam)}${mockQuery}`}
              className="flex flex-col items-center gap-2 group/link w-full"
            >
              <span className="text-4xl sm:text-5xl hover:scale-105 active:scale-95 transition-transform" role="img" aria-label={`${match.homeTeam} Flag`}>
                {match.homeFlag}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-text-primary text-center truncate w-full group-hover/link:text-cyan-600 dark:group-hover/link:text-cyan-400 transition-colors">
                {match.homeTeam}
              </span>
            </Link>
          )}
        </div>

        {/* Center Progress Circle */}
        <div className="flex-shrink-0">
          <MatchProgressCircle match={match} size={96} />
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center flex-1 min-w-0">
          {isPlaceholderTeam(match.awayTeam) ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-bg-900 border border-border flex items-center justify-center shadow-sm">
                <Shield size={24} className="text-text-secondary/60" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-text-primary text-center truncate w-full">{match.awayTeam || "TBD"}</span>
            </div>
          ) : (
            <Link
              href={`/team/${encodeURIComponent(match.awayTeam)}${mockQuery}`}
              className="flex flex-col items-center gap-2 group/link w-full"
            >
              <span className="text-4xl sm:text-5xl hover:scale-105 active:scale-95 transition-transform" role="img" aria-label={`${match.awayTeam} Flag`}>
                {match.awayFlag}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-text-primary text-center truncate w-full group-hover/link:text-cyan-600 dark:group-hover/link:text-cyan-400 transition-colors">
                {match.awayTeam}
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Goal scorers list */}
      {match.goals && match.goals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 grid grid-cols-2 gap-4 items-start">
          {/* Home goals (left column) */}
          <div className="flex flex-col gap-1 items-start justify-start min-w-0 w-full">
            {match.goals
              .filter((g) => g.team === match.homeTeam)
              .map((g, i) => {
                const label =
                  g.type === "OWN" || g.type === "og" ? " (og)" : g.type === "PENALTY" || g.type === "pen" ? " (pen)" : "";
                const minuteStr = `${g.minute}${g.injuryTime ? `+${g.injuryTime}` : ""}`;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary w-full min-w-0"
                  >
                    <span className="text-emerald-500 shrink-0">⚽</span>
                    <span className="truncate">{g.scorer}{label}</span>
                    <span className="text-text-secondary/50 font-mono text-[10px] shrink-0">{minuteStr}&apos;</span>
                  </div>
                );
              })}
          </div>
          {/* Away goals (right column) */}
          <div className="flex flex-col gap-1 items-end justify-start min-w-0 w-full">
            {match.goals
              .filter((g) => g.team !== match.homeTeam)
              .map((g, i) => {
                const label =
                  g.type === "OWN" || g.type === "og" ? " (og)" : g.type === "PENALTY" || g.type === "pen" ? " (pen)" : "";
                const minuteStr = `${g.minute}${g.injuryTime ? `+${g.injuryTime}` : ""}`;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary flex-row-reverse w-full min-w-0"
                  >
                    <span className="text-emerald-500 shrink-0">⚽</span>
                    <span className="truncate">{g.scorer}{label}</span>
                    <span className="text-text-secondary/50 font-mono text-[10px] shrink-0">{minuteStr}&apos;</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Deep Scan toggle ──────────────────────────────────────────────── */}
      {match.stats && (
        <>
          <button
            onClick={() => setIsDeepScanOpen((o) => !o)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold tracking-wide transition-all cursor-pointer"
          >
            <Activity size={13} className={`transition-transform duration-300 ${isDeepScanOpen ? "rotate-12" : ""}`} />
            <span>{isDeepScanOpen ? "Hide Stats" : "Deep Scan"}</span>
            <ChevronDown
              size={13}
              className={`ml-auto transition-transform duration-300 ${isDeepScanOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* ── Animated stats panel ────────────────────────────────────── */}
          <AnimatePresence initial={false}>
            {isDeepScanOpen && (
              <motion.div
                key="deep-scan-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/45 bg-bg-800/60 backdrop-blur-sm p-4 space-y-4">

                  {/* Possession Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-black font-mono text-cyan-600 dark:text-cyan-400 tracking-widest">
                        {match.stats.homePossession.toFixed(1)}%
                      </span>
                      <span className="text-[9px] font-bold tracking-widest text-text-secondary uppercase">Ball Possession</span>
                      <span className="text-[10px] font-black font-mono text-emerald-600 dark:text-emerald-450 tracking-widest">
                        {match.stats.awayPossession.toFixed(1)}%
                      </span>
                    </div>
                    {/* Single bar split by possession % */}
                    <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-bg-900 border border-border">
                      <div
                        style={{ width: `${match.stats.homePossession}%` }}
                        className="h-full bg-cyan-400 transition-all duration-700 rounded-l-full"
                      />
                      <div
                        style={{ width: `${match.stats.awayPossession}%` }}
                        className="h-full bg-emerald-400 transition-all duration-700 rounded-r-full"
                      />
                    </div>
                  </div>

                  {/* Stat Grid — 3 columns: Home | Label | Away */}
                  <div className="space-y-0.5">
                    {/* Column headers */}
                    <div className="grid grid-cols-3 text-center pb-1.5 border-b border-border">
                      <span className="text-[10px] font-black tracking-wider text-cyan-600 dark:text-cyan-400 truncate" title={match.homeTeam}>
                        {match.homeCode}
                      </span>
                      <span className="text-[9px] font-semibold tracking-widest text-text-secondary uppercase">Stat</span>
                      <span className="text-[10px] font-black tracking-wider text-emerald-600 dark:text-emerald-450 truncate" title={match.awayTeam}>
                        {match.awayCode}
                      </span>
                    </div>

                    {([
                      { label: "Shots", home: match.stats.homeTotalShots, away: match.stats.awayTotalShots },
                      { label: "On Target", home: match.stats.homeShotsOnTarget, away: match.stats.awayShotsOnTarget },
                      { label: "Corners", home: match.stats.homeCorners, away: match.stats.awayCorners },
                    ] as { label: string; home: number; away: number }[]).map(({ label, home, away }) => {
                      const homeLeads = home > away;
                      const awayLeads = away > home;
                      return (
                        <div key={label} className="grid grid-cols-3 items-center py-1.5 px-1 rounded-lg hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors">
                          <span className={`text-sm font-black font-mono text-center ${homeLeads ? "text-text-primary" : "text-text-secondary/50"}`}>
                            {home}
                          </span>
                          <span className="text-[9px] font-semibold tracking-widest text-text-secondary uppercase text-center">
                            {label}
                          </span>
                          <span className={`text-sm font-black font-mono text-center ${awayLeads ? "text-text-primary" : "text-text-secondary/50"}`}>
                            {away}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Footer: venue */}
      <div className="pt-3 mt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-2 text-xs text-text-secondary">
        <MapPin size={12} className="text-emerald-500 flex-shrink-0" />
        <span className="truncate">{match.stadium}, {match.hostCity}</span>
      </div>
    </motion.div>
  );
}
