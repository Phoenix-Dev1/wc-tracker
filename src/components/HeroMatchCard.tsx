"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Clock, Calendar, MapPin } from "lucide-react";
import { ProcessedMatch, isPlaceholderTeam } from "@/data/worldcup";
import { ScorelinePrediction } from "@/data/types";
import { cn } from "@/utils/cn";

interface HeroMatchCardProps {
  match: ProcessedMatch;
  index: number;
  systemTime: string;
  scorePredictions?: ScorelinePrediction[];
}

const formatCityName = (city: string) => {
  return city
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function HeroMatchCard({ match, index, systemTime, scorePredictions }: HeroMatchCardProps) {
  const [countdownText, setCountdownText] = useState("");
  const isLive = match.status === "LIVE";
  const searchParams = useSearchParams();
  const isMock = searchParams?.get("mock") === "true";
  const simTime = searchParams?.get("simTime");
  const mockQuery = isMock ? "?mock=true" : "";
  const simQuery = simTime ? `${isMock ? "&" : "?"}simTime=${encodeURIComponent(simTime)}` : "";
  const finalQuery = `${mockQuery}${simQuery}`;

  const cardClasses = cn(
    "relative rounded-2xl p-6 backdrop-blur-md transition-all duration-300 border group overflow-hidden min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center flex-shrink-0",
    isLive && "bg-bg-800/90 border-emerald-400 dark:border-emerald-500 ring-1 ring-emerald-400 dark:ring-emerald-500 bg-gradient-to-r from-emerald-50/50 dark:from-emerald-950/20 via-bg-800/80 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.05)]",
    !isLive && "bg-bg-800 border-border hover:border-cyan-500/40 hover:shadow-md hover:shadow-cyan-500/5"
  );

  const teamTextClasses = cn(
    "text-sm font-semibold group-hover/link:text-cyan-600 dark:group-hover/link:text-cyan-400 tracking-wide transition-colors",
    isLive ? "text-text-primary font-bold" : "text-text-primary"
  );

  const tbdTextClasses = cn(
    "text-sm font-semibold tracking-wide transition-colors",
    isLive ? "text-text-primary font-bold" : "text-text-primary"
  );

  // Countdown clock effect relative to system time
  useEffect(() => {
    if (isLive) {
      if (match.displayClock === 'HT') {
        setCountdownText("HALF TIME");
      } else {
        setCountdownText(`${match.displayClock}'`);
      }
      return;
    }

    const calculateCountdown = () => {
      const currentMs = new Date(systemTime).getTime();
      const kickoffTime = new Date(match.kickoffUtc).getTime();
      const diffMs = kickoffTime - currentMs;

      if (diffMs <= 0) {
        setCountdownText("Started");
        return;
      }

      const diffSecs = Math.floor(diffMs / 1000);
      const days = Math.floor(diffSecs / (3600 * 24));
      const hours = Math.floor((diffSecs % (3600 * 24)) / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);

      let text = "";
      if (days > 0) {
        text += `${days}d `;
      }
      text += `${hours}h ${minutes}m`;
      setCountdownText(text);
    };

    calculateCountdown();
  }, [match.kickoffUtc, systemTime, isLive, match.displayClock]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.025, y: -4 }}
      className={cardClasses}
    >
      {/* Decorative background circle */}
      <div className="absolute top-[-20%] right-[-10%] w-[100px] h-[100px] bg-cyan-500/5 rounded-full blur-[20px] pointer-events-none" />

      {/* Top Status Indicators */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono font-semibold tracking-wider text-text-secondary bg-bg-900 border border-border px-2 py-0.5 rounded">
          MATCH {match.matchNumber}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-purple-750 dark:text-purple-400 font-bold bg-purple-55 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 px-2.5 py-0.5 rounded-full">
          <Clock size={12} className="animate-spin-slow text-purple-600" />
          <span>{countdownText}</span>
        </div>
      </div>

      {/* Flag / Team Layout */}
      <div className="space-y-4 my-6">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          {isPlaceholderTeam(match.homeTeam) ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-bg-900 border border-border flex items-center justify-center" title="TBD Shield">
                <Shield size={16} className="text-text-secondary/60" />
              </div>
              <span className={tbdTextClasses}>
                {match.homeTeam || "TBD"}
              </span>
            </div>
          ) : (
            <Link
              href={`/team/${encodeURIComponent(match.homeTeam)}${finalQuery}`}
              className="flex items-center gap-3 group/link hover:text-cyan-600 transition-colors"
            >
              <span className="text-2xl" role="img" aria-label={`${match.homeTeam} Flag`}>
                {match.homeFlag}
              </span>
              <span className={teamTextClasses}>
                {match.homeTeam}
              </span>
            </Link>
          )}
          {isPlaceholderTeam(match.homeTeam) ? (
            <span className="px-2 py-0.5 rounded bg-bg-900 text-text-secondary border border-border font-mono text-[10px] font-bold">
              TBD
            </span>
          ) : (
            <span className="text-xs font-mono font-semibold text-text-secondary/70">{match.homeCode}</span>
          )}
        </div>

        {/* VS Divider line */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative z-10 px-2.5 bg-bg-800 border border-border rounded-full text-[10px] font-mono tracking-widest text-cyan-600 dark:text-cyan-400 font-bold uppercase shadow-sm">
            VS
          </span>
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between">
          {isPlaceholderTeam(match.awayTeam) ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-bg-900 border border-border flex items-center justify-center" title="TBD Shield">
                <Shield size={16} className="text-text-secondary/60" />
              </div>
              <span className={tbdTextClasses}>
                {match.awayTeam || "TBD"}
              </span>
            </div>
          ) : (
            <Link
              href={`/team/${encodeURIComponent(match.awayTeam)}${finalQuery}`}
              className="flex items-center gap-3 group/link hover:text-cyan-600 transition-colors"
            >
              <span className="text-2xl" role="img" aria-label={`${match.awayTeam} Flag`}>
                {match.awayFlag}
              </span>
              <span className={teamTextClasses}>
                {match.awayTeam}
              </span>
            </Link>
          )}
          {isPlaceholderTeam(match.awayTeam) ? (
            <span className="px-2 py-0.5 rounded bg-bg-900 text-text-secondary border border-border font-mono text-[10px] font-bold">
              TBD
            </span>
          ) : (
            <span className="text-xs font-mono font-semibold text-text-secondary/70">{match.awayCode}</span>
          )}
        </div>
      </div>

      {/* Scoreline Predictions */}
      {scorePredictions && scorePredictions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-dashed border-border/70 flex flex-col gap-1.5 w-full">
          <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-text-secondary uppercase select-none">
            Predicted Scores
          </span>
          <div className="flex flex-wrap gap-1.5 w-full">
            {scorePredictions.map((p) => (
              <span
                key={`${p.home}-${p.away}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[11px] sm:text-xs font-mono select-none border border-cyan-200/40 dark:border-cyan-800/30 bg-cyan-50/60 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400 font-bold transition-all duration-200"
              >
                {p.home}-{p.away}
                <span className="text-[9px] sm:text-[10px] font-semibold text-cyan-500/70 dark:text-cyan-500/50">
                  {p.probability}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Card Footer Details */}
      <div className="pt-4 mt-4 border-t border-border text-xs space-y-2.5">
        <div className="flex items-center gap-2 text-text-secondary">
          <Calendar size={13} className="text-cyan-600 dark:text-cyan-400" />
          <span>{match.formattedDateJerusalem}</span>
          <span className="text-text-secondary/40 font-bold">•</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-bold font-mono">{match.formattedTimeJerusalem}</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <MapPin size={13} className="text-text-secondary/60" />
          <span className="truncate" title={`${match.stadium}, ${formatCityName(match.hostCity)}`}>
            {match.stadium}
          </span>
        </div>
      </div>

    </motion.div>
  );
}
