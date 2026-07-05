"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import {
  Fixture,
  getProcessedMatches,
} from "@/data/worldcup";
import KnockoutBracket from "@/components/KnockoutBracket";
import StatLeaderboard from "@/components/StatLeaderboard";
import { cn } from "@/utils/cn";

// The local system time as defined in metadata
const SYSTEM_TIME_STR = "2026-06-23T19:52:14+03:00";

const SIM_MOMENTS = [
  { label: "T-Minus Kickoff", date: "2026-06-10T12:00:00Z", desc: "Before any match has kicked off" },
  { label: "Opening Match (Live)", date: "2026-06-11T19:30:00Z", desc: "Mexico vs South Africa is live" },
  { label: "Group Stage Day 3", date: "2026-06-13T19:00:00Z", desc: "Standings are starting to form" },
  { label: "Double Live Drama", date: "2026-06-25T20:00:00Z", desc: "Ecuador vs Germany & Czechia vs Mexico are live concurrently" },
  { label: "Knockout Stage Starts", date: "2026-06-28T19:00:00Z", desc: "Round of 32 begins" },
  { label: "World Cup Final (Live!)", date: "2026-07-19T19:30:00Z", desc: "The final match is in progress" },
  { label: "Tournament Finalized", date: "2026-07-20T12:00:00Z", desc: "Standings, stats, and brackets complete" },
];

const getJerusalemDateTimeString = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    let hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    
    if (hour === "24") hour = "00";
    
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch {
    return "2026-06-11T00:00";
  }
};

export default function KnockoutsPageClient({ initialFixtures }: { initialFixtures?: Fixture[] }) {
  const [mounted, setMounted] = useState(false);
  const [systemTime, setSystemTime] = useState<string>(SYSTEM_TIME_STR);
  const [isSimMode, setIsSimMode] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(15); // minutes per second
  const [isPastTournament, setIsPastTournament] = useState<boolean>(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [tempDateTime, setTempDateTime] = useState<string>("");
  const [isMock, setIsMock] = useState<boolean>(false);

  useEffect(() => {
    if (isDatePickerOpen) {
      setTempDateTime(getJerusalemDateTimeString(systemTime));
    }
  }, [isDatePickerOpen, systemTime]);

  const handleTempDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempDateTime(e.target.value);
  };

  const getValidationError = (dateTimeStr: string): string | null => {
    if (!dateTimeStr) return null;
    const selectedDate = new Date(`${dateTimeStr}:00+03:00`);
    const minDate = new Date("2026-06-11T00:00:00+03:00");
    const maxDate = new Date("2026-07-19T23:59:59+03:00");
    
    if (isNaN(selectedDate.getTime())) {
      return "Please enter a valid date and time.";
    }
    if (selectedDate.getTime() < minDate.getTime()) {
      return "Time must be on or after the first day of the World Cup (June 11, 2026).";
    }
    if (selectedDate.getTime() > maxDate.getTime()) {
      return "Time must be on or before the final day of the World Cup (July 19, 2026).";
    }
    return null;
  };

  const handleApplyTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempDateTime) return;
    
    const error = getValidationError(tempDateTime);
    if (error) return;
    
    const selectedDate = new Date(`${tempDateTime}:00+03:00`);
    setSystemTime(selectedDate.toISOString());
    setIsDatePickerOpen(false);
    setIsPlaying(false);
  };

  const handleClockClick = () => {
    if (!isSimMode) {
      setIsSimMode(true);
      localStorage.setItem("isSimMode", "true");
    }
    setIsDatePickerOpen(true);
  };

  // Initialize simulation parameters
  useEffect(() => {
    setMounted(true);
    
    const params = new URLSearchParams(window.location.search);
    setIsMock(params.get("mock") === "true");
    const simTimeParam = params.get("simTime");
    const past = new Date().getTime() > new Date("2026-07-20T00:00:00Z").getTime();
    setIsPastTournament(past);

    if (simTimeParam) {
      setIsSimMode(true);
      setSystemTime(simTimeParam);
    } else if (past) {
      setIsSimMode(true);
      setSystemTime("2026-06-25T20:00:00Z");
    } else {
      setSystemTime(new Date().toISOString());
    }

    const timer = setInterval(() => {
      setSystemTime((prev) => {
        const currentParams = new URLSearchParams(window.location.search);
        const hasSimParam = currentParams.get("simTime");
        const storedSimMode = localStorage.getItem("isSimMode") === "true";
        
        if (!storedSimMode && !hasSimParam) {
          return new Date().toISOString();
        }
        return prev;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Sync parameters in address bar
  useEffect(() => {
    if (!mounted) return;
    const url = new URL(window.location.href);
    if (isSimMode) {
      if (url.searchParams.get("simTime") !== systemTime) {
        url.searchParams.set("simTime", systemTime);
        window.history.replaceState(null, "", url.toString());
      }
    } else {
      if (url.searchParams.has("simTime")) {
        url.searchParams.delete("simTime");
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [systemTime, isSimMode, mounted]);

  // Simulation play loop
  useEffect(() => {
    if (!isSimMode || !isPlaying) return;

    const interval = setInterval(() => {
      setSystemTime((prevTime) => {
        const currentDate = new Date(prevTime);
        currentDate.setMinutes(currentDate.getMinutes() + simSpeed);
        
        const maxTime = new Date("2026-07-20T12:00:00Z").getTime();
        if (currentDate.getTime() >= maxTime) {
          setIsPlaying(false);
          return new Date(maxTime).toISOString();
        }
        
        return currentDate.toISOString();
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimMode, isPlaying, simSpeed]);

  const toggleSimMode = () => {
    const nextMode = !isSimMode;
    setIsSimMode(nextMode);
    setIsPlaying(false);
    
    if (nextMode) {
      localStorage.setItem("isSimMode", "true");
      setSystemTime(SYSTEM_TIME_STR);
    } else {
      localStorage.removeItem("isSimMode");
      setSystemTime(new Date().toISOString());
    }
  };

  const handleSimMoment = (dateIso: string) => {
    setSystemTime(dateIso);
    setIsSimMode(true);
    localStorage.setItem("isSimMode", "true");
    setIsPlaying(false);
  };

  const resetToRealTime = () => {
    setIsSimMode(false);
    setIsPlaying(false);
    localStorage.removeItem("isSimMode");
    setSystemTime(new Date().toISOString());
  };

  // Process matches relative to the clock
  const processedMatches = getProcessedMatches(systemTime, initialFixtures);

  const formatSystemTimeDisplay = () => {
    try {
      const date = new Date(systemTime);
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jerusalem",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
    } catch {
      return "June 11, 19:00";
    }
  };

  const mockQuery = isMock ? "mock=true" : "";
  const simQuery = isSimMode ? `simTime=${encodeURIComponent(systemTime)}` : "";
  const queryStr = [mockQuery, simQuery].filter(Boolean).join("&");
  const finalQuery = queryStr ? `?${queryStr}` : "";

  return (
    <div className="min-h-screen bg-bg-900 text-text-primary font-sans relative overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-800">
      
      {/* Grid Pattern & Radiant Ambient Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[45%] h-[50%] bg-cyan-200/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[50%] h-[55%] bg-blue-200/15 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b80_1px,transparent_1px),linear-gradient(to_bottom,#1e293b80_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pt-16 sm:pt-8 pb-24">
        
        {/* Global Navigation Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400">
              ⚡ WC26.TRACKER
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link
              href={`/${finalQuery}`}
              className="text-text-secondary hover:text-text-primary transition-colors pb-1 border-b-2 border-transparent"
            >
              <span className="sm:inline hidden">Matches & Standings</span>
              <span className="sm:hidden">Fixtures</span>
            </Link>
            <Link
              href={`/knockouts${finalQuery}`}
              className="text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 pb-1"
            >
              <span className="sm:inline hidden">Knockout Bracket</span>
              <span className="sm:hidden">Bracket</span>
            </Link>
          </div>
        </div>

        {/* Page Title Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-950/30 dark:border-purple-900/50 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
            Knockouts & Leaders
          </div>
          <h1 className="text-3xl sm:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400">
            Knockout Phase Bracket
          </h1>
          <p className="mt-3 text-text-secondary max-w-xl mx-auto text-sm sm:text-base font-light">
            Visualize the road to the final and watch placeholders resolve dynamically as the tournament progresses.
          </p>

          {/* TIMELINE WARP CONTROL PANEL */}
          <div className="mt-8 relative z-10 w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
            
            {mounted && isPastTournament && (
              <div className="mb-4 flex items-center justify-between gap-3 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-700 dark:text-purple-300 text-xs font-semibold leading-relaxed shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-500 shrink-0 animate-pulse" />
                  <span>
                    🏆 <strong>World Cup Archive Mode:</strong> Warp simulation is active to experience matches as they played out live!
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-5">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-bg-900 border border-border p-1 rounded-xl flex shadow-inner text-xs font-bold select-none">
                    <button
                      onClick={() => isSimMode && toggleSimMode()}
                      className={cn(
                        "px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold",
                        !isSimMode ? "bg-bg-800 text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      Real-Time
                    </button>
                    <button
                      onClick={() => !isSimMode && toggleSimMode()}
                      className={cn(
                        "px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold",
                        isSimMode ? "bg-bg-800 text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      Warp Simulation
                    </button>
                  </div>

                  {isSimMode && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={cn(
                          "w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition-colors shadow-sm",
                          isPlaying
                            ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-text-primary"
                        )}
                        title={isPlaying ? "Pause Timeline" : "Play Timeline"}
                      >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                      </button>

                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700 rounded-xl select-none">
                        <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider px-2">Speed:</span>
                        {[15, 30, 60].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setSimSpeed(speed)}
                            className={cn(
                              "px-2.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-all",
                              simSpeed === speed
                                ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                                : "text-text-secondary hover:text-text-primary"
                            )}
                          >
                            {speed}m/s
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div
                    onClick={handleClockClick}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all duration-300 cursor-pointer shadow-sm group select-none"
                  >
                    <Clock size={16} className="text-cyan-500 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Simulated Time</span>
                      <span className="text-sm font-bold text-text-primary font-mono flex items-center gap-1">
                        {mounted ? formatSystemTimeDisplay() : "Loading..."}
                        <ChevronDown size={14} className="text-text-muted opacity-70" />
                      </span>
                    </div>
                  </div>

                  {isSimMode && (
                    <button
                      onClick={resetToRealTime}
                      className="px-3 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-text-secondary hover:text-text-primary hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {isSimMode && (
                <div className="border-t border-slate-100 dark:border-slate-800/40 pt-4 flex flex-col gap-2">
                  <span className="text-[10px] text-left text-text-muted uppercase font-bold tracking-wider select-none">
                    Fast-Jump to Match Day Moments
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SIM_MOMENTS.map((moment) => {
                      const isCurrent = new Date(systemTime).getTime() === new Date(moment.date).getTime();
                      return (
                        <button
                          key={moment.label}
                          onClick={() => handleSimMoment(moment.date)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer select-none",
                            isCurrent
                              ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold"
                              : "bg-slate-50/50 hover:bg-slate-100/80 dark:bg-slate-950/20 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800/50 text-text-secondary hover:text-text-primary"
                          )}
                          title={moment.desc}
                        >
                          {moment.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Time Picker Modal */}
        {isDatePickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm select-none">
            <div className="w-full max-w-sm p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl flex flex-col gap-4 animate-[scaleUp_0.2s_ease-out]">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-cyan-500" />
                <h3 className="text-sm font-bold text-text-primary">Warp to Custom Date-Time</h3>
              </div>
              
              <form onSubmit={handleApplyTime} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                    Select Date & Time (Jerusalem Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={tempDateTime}
                    onChange={handleTempDateTimeChange}
                    min="2026-06-11T00:00"
                    max="2026-07-19T23:59"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/40 text-text-primary font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                  />
                  {getValidationError(tempDateTime) && (
                    <span className="text-[10px] text-red-500 font-semibold mt-1">
                      {getValidationError(tempDateTime)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!!getValidationError(tempDateTime)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white disabled:opacity-50 disabled:hover:bg-cyan-600 dark:disabled:hover:bg-cyan-500 cursor-pointer transition-colors"
                  >
                    Warp Timeline
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── main content: knockout bracket and stat leaders ── */}
        <div className="flex flex-col gap-16">
          {/* Section 1: Bracket */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-text-primary tracking-tight select-none">
              Tournament Bracket Tree
            </h2>
            <KnockoutBracket matches={processedMatches} queryStr={finalQuery} />
          </section>

          {/* Section 2: Stat Leaders */}
          <section className="flex flex-col gap-4">
            <StatLeaderboard matches={processedMatches} queryStr={finalQuery} />
          </section>
        </div>

      </div>
    </div>
  );
}
