"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  ChevronDown,
  BarChart2,
  Swords,
  Info,
} from "lucide-react";
import {
  ProcessedMatch,
  TournamentTeamStats,
  calculateTournamentStats,
  calculateMatchupProbabilities,
  calculateKnockoutProbabilities,
  generateScorelinePredictions,
  getTeamInfo,
  isPlaceholderTeam,
  ScorelinePrediction,
} from "@/data/worldcup";

/* ─────────────────────────────────────────────────────────────────────────────
   Colour tokens — must stay consistent with the site light theme
───────────────────────────────────────────────────────────────────────────── */
const TEAM_A_COLOR = "#10b981"; // emerald-500
const TEAM_B_COLOR = "#8b5cf6"; // violet-500
const TEAM_A_FILL  = "#10b98120";
const TEAM_B_FILL  = "#8b5cf620";

/* ─────────────────────────────────────────────────────────────────────────────
   Team dropdown
───────────────────────────────────────────────────────────────────────────── */
interface TeamSelectProps {
  label: string;
  accent: string; // tailwind colour class suffix e.g. "emerald" | "violet"
  value: string;
  onChange: (v: string) => void;
  exclude?: string;
  recentForm?: ('W' | 'D' | 'L')[];
  allTeams: string[];
}

function TeamSelect({ label, accent, value, onChange, exclude, recentForm = [], allTeams }: TeamSelectProps) {
  const borderClass = accent === "emerald"
    ? "border-emerald-300 focus:ring-emerald-400/40 focus:border-emerald-400 dark:border-emerald-700/60 dark:focus:ring-emerald-500/30"
    : "border-violet-300 focus:ring-violet-400/40 focus:border-violet-400 dark:border-violet-700/60 dark:focus:ring-violet-500/30";
  const labelClass = accent === "emerald" ? "text-emerald-700 dark:text-emerald-400" : "text-violet-700 dark:text-violet-400";
  const dotClass   = accent === "emerald" ? "bg-emerald-500" : "bg-violet-500";

  return (
    <div className="flex-1 min-w-[180px]">
      <label className={`flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase mb-2 ${labelClass}`}>
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-xl border bg-bg-800/80 backdrop-blur-sm px-3.5 py-2.5 pr-9 text-sm font-semibold text-text-primary border-border shadow-sm focus:outline-none focus:ring-2 transition-all cursor-pointer ${borderClass}`}
        >
          <option value="" className="bg-bg-800 text-text-primary cursor-pointer">— Select a team —</option>
          {allTeams.filter((t) => t !== exclude).map((team) => {
            const info = getTeamInfo(team);
            return (
              <option key={team} value={team} className="bg-bg-800 text-text-primary cursor-pointer">
                {info.flag} {team} ({info.code})
              </option>
            );
          })}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
      </div>

      {/* Form indicators */}
      {value && recentForm.length > 0 && (
        <div className="flex items-center gap-1 mt-2 pl-1">
          <span className="text-[10px] font-bold text-text-secondary mr-1.5 uppercase tracking-wider">FORM:</span>
          {recentForm.map((outcome, idx) => {
            const bgClass =
              outcome === 'W'
                ? 'bg-emerald-400 text-white dark:bg-emerald-500'
                : outcome === 'L'
                ? 'bg-rose-400 text-white dark:bg-rose-500'
                : 'bg-bg-600 text-text-primary';
            return (
              <span
                key={idx}
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${bgClass}`}
                title={outcome === 'W' ? 'Win' : outcome === 'L' ? 'Loss' : 'Draw'}
              >
                {outcome}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Stat row in the raw data matrix
───────────────────────────────────────────────────────────────────────────── */
interface StatRowProps {
  label: string;
  valueA: number;
  valueB: number;
  unit?: string;
  higherIsBetter?: boolean;
}

function formatTooltipValue(metric: string, val: number) {
  if (metric === "Possession") return `${val.toFixed(1)}%`;
  if (metric === "Goals Scored") return `${val.toFixed(2)} Goals`;
  if (metric === "Defense") return `${val.toFixed(2)} Goals Conceded`;
  if (metric === "Shots on Tgt") return `${val.toFixed(1)} Shots`;
  if (metric === "Corners") return `${val.toFixed(1)} Corners`;
  return val.toString();
}

function StatRow({ label, valueA, valueB, unit = "", higherIsBetter = true }: StatRowProps) {
  const isTeamAWinner = higherIsBetter ? valueA > valueB : valueA < valueB;
  const isTeamBWinner = higherIsBetter ? valueB > valueA : valueB < valueA;
  const isTie = valueA === valueB;

  const styleA = isTie
    ? "font-medium text-text-primary"
    : isTeamAWinner
    ? "font-bold text-emerald-500"
    : "font-medium text-text-secondary/50";

  const styleB = isTie
    ? "font-medium text-text-primary"
    : isTeamBWinner
    ? "font-bold text-violet-500"
    : "font-medium text-text-secondary/50";

  // Calculate ratio based on performance (inverting for Goals Conceded)
  const total = valueA + valueB;
  const ratioA = total > 0
    ? (higherIsBetter ? valueA : valueB) / total * 100
    : 50;
  const ratioB = 100 - ratioA;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center py-3 px-3 rounded-xl hover:bg-bg-900/80 transition-colors gap-4">
      {/* Team A value */}
      <span className={`text-right text-base font-mono tabular-nums ${styleA}`}>
        {valueA.toFixed(valueA % 1 === 0 ? 0 : 1)}{unit}
      </span>

      {/* Center Column: Label + Ratio Bar */}
      <div className="flex flex-col items-center gap-1.5 w-full min-w-[130px] max-w-[160px] mx-auto">
        <span className="text-[10px] font-semibold tracking-widest text-text-secondary uppercase text-center whitespace-nowrap">
          {label}
        </span>
        <div className="h-1.5 w-full rounded-full bg-bg-600 overflow-hidden flex">
          <div
            style={{ width: `${ratioA}%` }}
            className="h-full bg-emerald-500 transition-all duration-300"
          />
          <div
            style={{ width: `${ratioB}%` }}
            className="h-full bg-violet-500 transition-all duration-300"
          />
        </div>
      </div>

      {/* Team B value */}
      <span className={`text-left text-base font-mono tabular-nums ${styleB}`}>
        {valueB.toFixed(valueB % 1 === 0 ? 0 : 1)}{unit}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Recharts custom tooltip
───────────────────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-800/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-bold text-text-primary mb-2">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => {
        const rawVal = p.payload[`${p.dataKey}_rawValue`];
        const displayVal = typeof rawVal === "number" ? formatTooltipValue(p.payload.metric, rawVal) : p.value;
        const isTeamA = p.color === TEAM_A_COLOR;
        const textColorClass = isTeamA ? "text-emerald-500" : "text-violet-500";
        return (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-text-secondary">{p.name}:</span>
            <span className={`font-bold ${textColorClass}`}>{displayVal}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Empty-state placeholder shown before both teams are chosen
───────────────────────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-16 h-16 rounded-2xl bg-bg-900 border border-border flex items-center justify-center">
        <Swords size={28} className="text-text-secondary/40" />
      </div>
      <p className="text-sm font-semibold text-text-secondary">
        Select two teams above to generate<br />their Head-to-Head comparison
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */
interface MatchupAnalyzerProps {
  matches: ProcessedMatch[];
}

export default function MatchupAnalyzer({ matches }: MatchupAnalyzerProps) {
  const [teamA, setTeamA] = useState<string>("");
  const [teamB, setTeamB] = useState<string>("");
  const [predictionMode, setPredictionMode] = useState<'group' | 'knockout'>('knockout');
  const searchParams = useSearchParams();
  const isMock = searchParams?.get("mock") === "true";
  const mockQuery = isMock ? "?mock=true" : "";

  const allTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    for (const m of matches) {
      if (m.homeTeam && !isPlaceholderTeam(m.homeTeam)) {
        teamsSet.add(m.homeTeam);
      }
      if (m.awayTeam && !isPlaceholderTeam(m.awayTeam)) {
        teamsSet.add(m.awayTeam);
      }
    }
    return Array.from(teamsSet).sort();
  }, [matches]);

  const statsA = useMemo<TournamentTeamStats | null>(
    () => (teamA ? calculateTournamentStats(teamA, matches) : null),
    [teamA, matches]
  );

  const statsB = useMemo<TournamentTeamStats | null>(
    () => (teamB ? calculateTournamentStats(teamB, matches) : null),
    [teamB, matches]
  );

  const bothSelected = !!statsA && !!statsB;
  const infoA = useMemo(() => (teamA ? getTeamInfo(teamA) : null), [teamA]);
  const infoB = useMemo(() => (teamB ? getTeamInfo(teamB) : null), [teamB]);

  const prediction = useMemo(() => {
    if (!statsA || !statsB || statsA.gamesPlayed === 0 || statsB.gamesPlayed === 0) return null;
    return calculateMatchupProbabilities(statsA, statsB, matches);
  }, [statsA, statsB, matches]);

  const knockoutPred = useMemo(() => {
    if (!prediction) return null;
    return calculateKnockoutProbabilities(prediction);
  }, [prediction]);

  const scorelinePredictions = useMemo(() => {
    if (!teamA || !teamB || isPlaceholderTeam(teamA) || isPlaceholderTeam(teamB)) return null;
    return generateScorelinePredictions(teamA, teamB, matches, 5);
  }, [teamA, teamB, matches]);

  /* Merge the two radarData arrays into a single one Recharts can use */
  const mergedRadar = useMemo(() => {
    if (!statsA || !statsB) return [];

    return statsA.radarData.map((item, idx) => {
      const bItem = statsB.radarData[idx];
      const valA = (item.value / item.fullMark) * 100;
      const valB = (bItem.value / bItem.fullMark) * 100;
      return {
        metric: item.metric,
        [teamA]: Math.min(Math.max(valA, 0), 100),
        [teamB]: Math.min(Math.max(valB, 0), 100),
        [`${teamA}_rawValue`]: item.value,
        [`${teamB}_rawValue`]: bItem.value,
      };
    });
  }, [statsA, statsB, teamA, teamB]);

  return (
    <section className="mb-16" data-aos="fade-up" data-aos-duration="800">
      {/* Card container */}
      <div className="rounded-2xl border border-border bg-bg-800/70 backdrop-blur-md shadow-sm overflow-hidden">

        {/* Team selectors bar */}
        <div className="border-b border-border bg-bg-900/60 px-5 py-5">
          <div className="flex flex-wrap gap-4 items-end">
            <TeamSelect
              label="Team A"
              accent="emerald"
              value={teamA}
              onChange={setTeamA}
              exclude={teamB}
              recentForm={statsA?.recentForm}
              allTeams={allTeams}
            />

            {/* VS divider */}
            <div className="flex items-center pb-1.5">
              <span className="text-xs font-black tracking-widest text-text-secondary/40 px-2 select-none">VS</span>
            </div>

            <TeamSelect
              label="Team B"
              accent="violet"
              value={teamB}
              onChange={setTeamB}
              exclude={teamA}
              recentForm={statsB?.recentForm}
              allTeams={allTeams}
            />
          </div>

          {/* Games played badges — only when both teams selected */}
          {bothSelected && (
            <div className="flex flex-wrap gap-3 mt-4">
              {[
                { stats: statsA!, info: infoA!, color: "emerald" },
                { stats: statsB!, info: infoB!, color: "violet" },
              ].map(({ stats, info, color }) => {
                const textClass  = color === "emerald" ? "text-emerald-700 dark:text-emerald-400"  : "text-violet-700 dark:text-violet-400";
                const bgClass    = color === "emerald" ? "bg-emerald-50 dark:bg-emerald-950/20"     : "bg-violet-50 dark:bg-violet-950/20";
                const borderClass= color === "emerald" ? "border-emerald-200 dark:border-emerald-900/40": "border-violet-200 dark:border-violet-900/40";
                return (
                  <Link
                    key={stats.teamName}
                    href={`/team/${encodeURIComponent(stats.teamName)}${mockQuery}`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${bgClass} ${borderClass}`}
                  >
                    <span className="text-lg">{info.flag}</span>
                    <span className={`text-xs font-bold ${textClass}`}>{info.code}</span>
                    <span className="text-[10px] text-text-secondary font-medium">
                      ({stats.gamesPlayed} GP)
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Content body */}
        <div className="p-6">
          {!bothSelected ? (
            <EmptyState />
          ) : (statsA.gamesPlayed === 0 || statsB.gamesPlayed === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-bg-900/50 border border-border rounded-2xl p-6">
              <div className="w-16 h-16 rounded-2xl bg-bg-800 border border-border flex items-center justify-center shadow-sm">
                <BarChart2 size={28} className="text-text-secondary/60 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-text-primary">
                Awaiting match data
              </p>
              <p className="text-xs text-text-secondary max-w-xs">
                Averages will generate after the first completed game.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ─── Radar Chart ─── */}
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-4">
                    Performance Radar
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart
                      data={mergedRadar}
                      outerRadius="60%"
                      margin={{ top: 20, right: 35, bottom: 20, left: 35 }}
                    >
                      <PolarGrid
                        stroke="var(--border)"
                        strokeDasharray="3 3"
                      />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fill: "var(--text-secondary)", fontSize: 10, fontWeight: 600, fontFamily: "inherit" }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fill: "var(--text-secondary)", fontSize: 9 }}
                        axisLine={false}
                        tickCount={5}
                      />
                      <Radar
                        name={`${infoA!.flag} ${infoA!.code}`}
                        dataKey={teamA}
                        stroke={TEAM_A_COLOR}
                        fill={TEAM_A_FILL}
                        strokeWidth={2}
                        dot={{ fill: TEAM_A_COLOR, r: 3, strokeWidth: 0 }}
                      />
                      <Radar
                        name={`${infoB!.flag} ${infoB!.code}`}
                        dataKey={teamB}
                        stroke={TEAM_B_COLOR}
                        fill={TEAM_B_FILL}
                        strokeWidth={2}
                        dot={{ fill: TEAM_B_COLOR, r: 3, strokeWidth: 0 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: "11px", fontWeight: 600, paddingTop: "12px" }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* ─── Raw Data Matrix ─── */}
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-3">
                    Statistical Averages (per match)
                  </p>

                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pb-2 border-b border-border gap-4">
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-450">
                        {infoA!.flag} <span>{infoA!.code}</span>
                      </span>
                    </div>
                    <div className="w-full min-w-[130px] max-w-[160px]" />
                    <div className="text-left">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-violet-700 dark:text-violet-400">
                        {infoB!.flag} <span>{infoB!.code}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 divide-y divide-border/60">
                    <StatRow
                      label="Possession"
                      valueA={statsA!.avgPossession}
                      valueB={statsB!.avgPossession}
                      unit="%"
                    />
                    <StatRow
                      label="Goals Scored"
                      valueA={statsA!.avgGoalsScored}
                      valueB={statsB!.avgGoalsScored}
                    />
                    <StatRow
                      label="Goals Conceded"
                      valueA={statsA!.avgGoalsConceded}
                      valueB={statsB!.avgGoalsConceded}
                      higherIsBetter={false}
                    />
                    <StatRow
                      label="Shots on Target"
                      valueA={statsA!.avgShotsOnTarget}
                      valueB={statsB!.avgShotsOnTarget}
                    />
                    <StatRow
                      label="Corners"
                      valueA={statsA!.avgCorners}
                      valueB={statsB!.avgCorners}
                    />
                  </div>

                  {/* Note when ESPN stats are sparse */}
                  <p className="mt-4 text-[10px] text-text-secondary flex items-start gap-1.5 leading-relaxed px-1">
                    <Info size={11} className="text-text-secondary/60 shrink-0 mt-0.5" />
                    Possession, shots &amp; corners only available for matches with live ESPN coverage.
                    Goals use official match scores.
                  </p>
                </div>
              </div>

              {/* ─── Match Prediction ─── */}
              {prediction && (
                <div className="w-full mt-8 pt-6 border-t border-border">
                  {/* Header row with toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold tracking-widest text-text-secondary uppercase">
                      Match Prediction
                    </p>
                    <div className="flex items-center bg-bg-900/80 border border-border rounded-full p-0.5 gap-0.5">
                      {(['group', 'knockout'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPredictionMode(mode)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all duration-200 ${
                            predictionMode === mode
                              ? 'bg-bg-700 text-text-primary shadow-sm'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {mode === 'group' ? '⚽ Group' : '🏆 Knockout'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Probability bar */}
                  {predictionMode === 'knockout' && knockoutPred ? (
                    <>
                      <div className="h-8 w-full rounded-xl overflow-hidden flex font-bold text-sm text-white shadow-sm bg-bg-600">
                        <div
                          className="bg-emerald-500 flex items-center justify-center transition-all duration-500"
                          style={{ width: `${knockoutPred.teamA}%` }}
                        >
                          {knockoutPred.teamA >= 8 && `${knockoutPred.teamA}%`}
                        </div>
                        <div
                          className="bg-violet-500 flex items-center justify-center transition-all duration-500"
                          style={{ width: `${knockoutPred.teamB}%` }}
                        >
                          {knockoutPred.teamB >= 8 && `${knockoutPred.teamB}%`}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2.5 px-1">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          {infoA!.code} Win
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                          {infoB!.code} Win
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-8 w-full rounded-xl overflow-hidden flex font-bold text-sm text-white shadow-sm bg-bg-600">
                        <div
                          className="bg-emerald-500 flex items-center justify-center transition-all duration-500"
                          style={{ width: `${prediction.teamA}%` }}
                        >
                          {prediction.teamA >= 8 && `${prediction.teamA}%`}
                        </div>
                        <div
                          className="bg-bg-600 dark:bg-bg-700 text-text-primary flex items-center justify-center transition-all duration-500 border-x border-border/10"
                          style={{ width: `${prediction.draw}%` }}
                        >
                          {prediction.draw >= 8 && `${prediction.draw}%`}
                        </div>
                        <div
                          className="bg-violet-500 flex items-center justify-center transition-all duration-500"
                          style={{ width: `${prediction.teamB}%` }}
                        >
                          {prediction.teamB >= 8 && `${prediction.teamB}%`}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2.5 px-1">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          {infoA!.code} Win
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          <span className="w-2.5 h-2.5 rounded-full bg-bg-600 dark:bg-bg-700 border border-border/10" />
                          Draw
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                          {infoB!.code} Win
                        </span>
                      </div>
                    </>
                  )}

                  {/* Predicted Scores grid section */}
                  {scorelinePredictions && scorelinePredictions.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border/60">
                      <p className="text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-3">
                        Most Likely Scorelines
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {scorelinePredictions.map((p) => (
                          <div
                            key={`${p.home}-${p.away}`}
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-bg-900/60 border border-border/80 shadow-sm"
                          >
                            <span className="text-base font-bold text-text-primary font-mono">{p.home} - {p.away}</span>
                            <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">{p.probability}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
