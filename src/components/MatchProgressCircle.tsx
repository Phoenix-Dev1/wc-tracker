"use client";

import { ProcessedMatch, normalizeTeamName } from "@/data/worldcup";

interface MatchProgressCircleProps {
  match: ProcessedMatch;
  size?: number; // Outer diameter
}

export default function MatchProgressCircle({ match, size = 100 }: MatchProgressCircleProps) {
  const isLive = match.status === "LIVE";
  const isCompleted = match.status === "COMPLETED";

  // Calculate match minute elapsed
  let minutes = 0;
  let label = "";

  if (isCompleted) {
    minutes = 90;
    label = "";
  } else if (isLive) {
    if (match.displayClock === "HT") {
      minutes = 45;
      label = "HT";
    } else {
      const parsed = parseInt(match.displayClock || "0");
      minutes = isNaN(parsed) ? 0 : parsed;
      label = match.displayClock || `${minutes}'`;
    }
  }

  // Handle knockout / extra time mapping
  const totalMinutes = minutes > 90 ? 120 : 90;
  const progress = Math.min(Math.max(minutes / totalMinutes, 0), 1);

  // SVG Geometry
  const strokeWidth = size * 0.05;
  const radius = (size - strokeWidth) / 2 - 3;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  // Goals placement & clustering layout
  const goals = match.goals || [];

  // Sort goals chronologically
  const sortedGoals = [...goals].sort((a, b) => a.minute - b.minute);

  // Group goals into clusters where the difference between consecutive goals is <= 6 minutes
  const clusters: { goal: typeof goals[0]; originalIndex: number }[][] = [];
  sortedGoals.forEach((g) => {
    const originalIndex = goals.indexOf(g);
    if (clusters.length === 0) {
      clusters.push([{ goal: g, originalIndex }]);
    } else {
      const lastCluster = clusters[clusters.length - 1];
      const lastGoal = lastCluster[lastCluster.length - 1].goal;
      if (g.minute - lastGoal.minute <= 6) {
        lastCluster.push({ goal: g, originalIndex });
      } else {
        clusters.push([{ goal: g, originalIndex }]);
      }
    }
  });

  interface PositionedGoal {
    goal: typeof goals[0];
    originalIndex: number;
    left: number;
    top: number;
  }

  const positionedGoals: PositionedGoal[] = [];

  clusters.forEach((cluster) => {
    const n = cluster.length;
    cluster.forEach((item, clusterIdx) => {
      const g = item.goal;
      const goalMin = g.minute;
      const minuteAngle = Math.min(goalMin, totalMinutes);
      const baseTheta = (minuteAngle / totalMinutes) * 360 - 90;

      let dr = 0;
      let dTheta = 0;

      if (n === 2) {
        dr = clusterIdx === 0 ? -size * 0.09 : size * 0.09;
        dTheta = clusterIdx === 0 ? -4 : 4;
      } else if (n === 3) {
        if (clusterIdx === 0) {
          dr = -size * 0.12;
          dTheta = -6;
        } else if (clusterIdx === 1) {
          dr = 0;
          dTheta = 0;
        } else {
          dr = size * 0.12;
          dTheta = 6;
        }
      } else if (n >= 4) {
        const offsets = [
          { dr: -size * 0.15, dTheta: -9 },
          { dr: -size * 0.07, dTheta: -3 },
          { dr: size * 0.07, dTheta: 3 },
          { dr: size * 0.15, dTheta: 9 }
        ];
        const offset = offsets[Math.min(clusterIdx, offsets.length - 1)];
        dr = offset.dr;
        dTheta = offset.dTheta;
      }

      const finalRadius = radius + dr;
      const finalTheta = baseTheta + dTheta;
      const radians = (finalTheta * Math.PI) / 180;

      positionedGoals.push({
        goal: g,
        originalIndex: item.originalIndex,
        left: center + finalRadius * Math.cos(radians),
        top: center + finalRadius * Math.sin(radians),
      });
    });
  });

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* SVG Circular Dial */}
      <svg width={size} height={size} className="absolute transform -rotate-90">
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="stroke-slate-200 dark:stroke-slate-800 fill-bg-800/80 transition-colors"
          strokeWidth={strokeWidth}
        />
        {/* Progress Arc */}
        {progress > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            className="fill-none transition-all duration-500 stroke-cyan-500 dark:stroke-cyan-400"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Central Match Details */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {label && (
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-0.5">
            {label}
          </span>
        )}
        <span className="text-base font-black text-text-primary tracking-tighter leading-none mt-0.5">
          {match.homeScore !== undefined && match.awayScore !== undefined ? (
            `${match.homeScore} : ${match.awayScore}`
          ) : (
            "vs"
          )}
        </span>
      </div>

      {/* Goal Soccer Balls along the Rim */}
      {positionedGoals.map(({ goal: g, originalIndex, left, top }) => {
        const isHomeTeam = normalizeTeamName(g.team) === normalizeTeamName(match.homeTeam);
        const colorClasses = isHomeTeam
          ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400"
          : "bg-violet-50 dark:bg-violet-950/80 border-violet-500 dark:border-violet-400 text-violet-600 dark:text-violet-400";

        // Position & offset so the center of the soccer ball aligns exactly on the circumference
        return (
          <div
            key={originalIndex}
            className={`absolute z-20 flex items-center justify-center rounded-full border shadow-sm cursor-pointer select-none hover:scale-125 transition-transform ${colorClasses}`}
            style={{
              width: Math.max(14, size * 0.16),
              height: Math.max(14, size * 0.16),
              left,
              top,
              transform: "translate(-50%, -50%)",
            }}
            title={`${g.scorer} (${g.minute}${g.injuryTime ? `+${g.injuryTime}` : ""}') - ${g.team}`}
          >
            <span className="text-[9px] leading-none mb-0.5">⚽</span>
          </div>
        );
      })}
    </div>
  );
}

