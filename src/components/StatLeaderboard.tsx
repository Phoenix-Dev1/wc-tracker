"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Zap } from "lucide-react";
import { ProcessedMatch } from "@/data/types";
import { getGoalLeaders } from "@/data/stats";
import { getTeamInfo } from "@/data/teams";
import { cn } from "@/utils/cn";

interface StatLeaderboardProps {
  matches: ProcessedMatch[];
  queryStr?: string;
}

type TabType = "goals" | "assists" | "yellow" | "red";

interface LeaderboardEntry {
  rank: number;
  name: string;
  team: string;
  count: number;
}

// Deterministic mock data for non-goal tabs
const MOCK_ASSISTS: LeaderboardEntry[] = [
  { rank: 1, name: "Kevin De Bruyne", team: "Belgium", count: 5 },
  { rank: 2, name: "Lionel Messi", team: "Argentina", count: 4 },
  { rank: 2, name: "Antoine Griezmann", team: "France", count: 4 },
  { rank: 4, name: "Bruno Fernandes", team: "Portugal", count: 3 },
  { rank: 4, name: "Bukayo Saka", team: "England", count: 3 },
  { rank: 4, name: "Jamal Musiala", team: "Germany", count: 3 },
  { rank: 7, name: "Vinícius Jr.", team: "Brazil", count: 2 },
  { rank: 7, name: "Federico Valverde", team: "Uruguay", count: 2 },
];

const MOCK_YELLOW_CARDS: LeaderboardEntry[] = [
  { rank: 1, name: "Cristian Romero", team: "Argentina", count: 3 },
  { rank: 2, name: "Antonio Rüdiger", team: "Germany", count: 2 },
  { rank: 2, name: "Edson Álvarez", team: "Mexico", count: 2 },
  { rank: 2, name: "Aurélien Tchouaméni", team: "France", count: 2 },
  { rank: 2, name: "Weston McKennie", team: "United States", count: 2 },
  { rank: 2, name: "Hakan Çalhanoğlu", team: "Turkiye", count: 2 },
  { rank: 7, name: "Granit Xhaka", team: "Switzerland", count: 1 },
  { rank: 7, name: "Nicolas Jackson", team: "Senegal", count: 1 },
];

const MOCK_RED_CARDS: LeaderboardEntry[] = [
  { rank: 1, name: "Cristian Romero", team: "Argentina", count: 1 },
  { rank: 1, name: "Antonio Rüdiger", team: "Germany", count: 1 },
  { rank: 1, name: "Edson Álvarez", team: "Mexico", count: 1 },
  { rank: 1, name: "Granit Xhaka", team: "Switzerland", count: 1 },
  { rank: 1, name: "Nicolas Jackson", team: "Senegal", count: 1 },
];

export default function StatLeaderboard({ matches, queryStr = "" }: StatLeaderboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("goals");

  // Dynamic aggregation for Goals
  const goalLeaders = getGoalLeaders(matches);

  const getActiveData = (): LeaderboardEntry[] => {
    switch (activeTab) {
      case "goals":
        return goalLeaders.slice(0, 8); // top 8 scorers
      case "assists":
        return MOCK_ASSISTS;
      case "yellow":
        return MOCK_YELLOW_CARDS;
      case "red":
        return MOCK_RED_CARDS;
      default:
        return [];
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (name: string) => {
    const sum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      "from-cyan-500 to-blue-500 text-cyan-50",
      "from-purple-500 to-indigo-500 text-purple-50",
      "from-pink-500 to-rose-500 text-pink-50",
      "from-emerald-500 to-teal-500 text-emerald-50",
      "from-amber-500 to-orange-500 text-amber-50",
    ];
    return gradients[sum % gradients.length];
  };

  const activeData = getActiveData();

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
      
      {/* Title */}
      <div className="flex items-center gap-2 select-none">
        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <Award size={18} className="stroke-[2.5]" />
        </div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">
          Tournament Stat Leaders
        </h2>
      </div>

      {/* ── High Contrast Tabs ── */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
        {(["goals", "assists", "yellow", "red"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-xs font-bold capitalize rounded-xl transition-all duration-200 cursor-pointer select-none",
              activeTab === tab
                ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200/40 dark:border-slate-800/40"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {tab === "yellow" ? "Yellow Cards" : tab === "red" ? "Red Cards" : tab}
          </button>
        ))}
      </div>

      {/* ── Leaderboard List ── */}
      <div className="flex flex-col gap-3 min-h-[360px]">
        {activeData.length > 0 ? (
          activeData.map((player, idx) => {
            const teamInfo = getTeamInfo(player.team);
            const initials = getInitials(player.name);
            const gradClass = getAvatarGradient(player.name);

            // Special ranks highlights (Rank 1, 2, 3)
            const rankStyles =
              player.rank === 1
                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300/30"
                : player.rank === 2
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300/20"
                  : player.rank === 3
                    ? "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-300/20"
                    : "bg-slate-50/50 dark:bg-slate-950/20 text-text-secondary border-transparent";

            return (
              <div
                key={`${player.name}_${player.team}_${idx}`}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/30 dark:bg-slate-950/10 border border-slate-100/50 dark:border-slate-800/30 hover:border-slate-200 dark:hover:border-slate-700/50 transition-all duration-200"
              >
                {/* Left side: Rank + Avatar + Name */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank Badge */}
                  <div
                    className={cn(
                      "w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-mono font-bold shrink-0 select-none",
                      rankStyles
                    )}
                  >
                    {player.rank}
                  </div>

                  {/* Glassmorphic Cyberpunk Avatar */}
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl bg-gradient-to-br shadow-inner flex items-center justify-center text-xs font-bold tracking-wider shrink-0 select-none",
                      gradClass
                    )}
                  >
                    {initials}
                  </div>

                  {/* Player and Team Detail */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-text-primary truncate">
                      {player.name}
                    </span>
                    <Link
                      href={`/team/${encodeURIComponent(player.team)}${queryStr}`}
                      className="flex items-center gap-1.5 text-[10px] text-text-muted hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-medium"
                    >
                      <span role="img" aria-label={`${player.team} flag`}>
                        {teamInfo.flag}
                      </span>
                      <span>{player.team}</span>
                    </Link>
                  </div>
                </div>

                {/* Right side: Stat count badge */}
                <div className="flex items-center gap-1 shrink-0 font-mono select-none">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-cyan-500/5 dark:bg-cyan-400/5 border border-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                    {activeTab === "yellow" || activeTab === "red" ? (
                      <Zap size={10} className="fill-current text-cyan-500 dark:text-cyan-400 shrink-0" />
                    ) : null}
                    <span>{player.count}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <span className="text-3xl mb-2">⚽</span>
            <h3 className="text-sm font-bold text-text-primary">No Stats Recorded Yet</h3>
            <p className="text-xs text-text-secondary max-w-xs mt-1">
              Advance the simulation time clock to kick off matches and populate goal leader statistics dynamically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
