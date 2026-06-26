"use client";

import { ProcessedMatch } from "@/data/worldcup";

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

  // Goals placement
  const goals = match.goals || [];

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
      {goals.map((g, idx) => {
        const goalMin = g.minute;
        const minuteAngle = Math.min(goalMin, totalMinutes);
        const theta = (minuteAngle / totalMinutes) * 360 - 90;
        const radians = (theta * Math.PI) / 180;
        const x = radius * Math.cos(radians);
        const y = radius * Math.sin(radians);

        const left = center + x;
        const top = center + y;

        // Position & offset so the center of the soccer ball aligns exactly on the circumference
        return (
          <div
            key={idx}
            className="absolute z-20 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer select-none hover:scale-125 transition-transform"
            style={{
              width: Math.max(14, size * 0.16),
              height: Math.max(14, size * 0.16),
              left,
              top,
              transform: "translate(-50%, -50%)",
            }}
            title={`${g.scorer} (${g.minute}')`}
          >
            <span className="text-[9px] leading-none mb-0.5">⚽</span>
          </div>
        );
      })}
    </div>
  );
}
