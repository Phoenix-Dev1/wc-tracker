"use client";

import { useState, useEffect, useDeferredValue, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Search,
  Clock,
  Tv,
  Filter,
  Info,
  ChevronDown,
  LayoutGrid,
  CalendarDays,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  Fixture,
  ProcessedMatch,
  getProcessedMatches,
  getNextThreeUpcoming,
  getStageDisplayName,
  generateScorelinePredictions,
  isPlaceholderTeam,
  ScorelinePrediction,
} from "@/data/worldcup";
import MatchupAnalyzer from "@/components/MatchupAnalyzer";
import HeroSkeleton from "@/components/HeroSkeleton";
import RowSkeleton from "@/components/RowSkeleton";
import HeroMatchCard from "@/components/HeroMatchCard";
import MatchListRow from "@/components/MatchListRow";
import LiveActionSection from "@/components/LiveActionSection";
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

// Helper to format Date to Jerusalem YYYY-MM-DDTHH:mm string for input[type="datetime-local"]
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

export default function MonPageClient({ initialFixtures }: { initialFixtures?: Fixture[] }) {
  const router = useRouter();
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
    setIsPlaying(false); // Pause simulation when jumping to a custom time
  };

  const handleClockClick = () => {
    if (!isSimMode) {
      setIsSimMode(true);
      localStorage.setItem("isSimMode", "true");
    }
    setIsDatePickerOpen(true);
  };

  // Initialize simulation clock parameters from URL or localStorage
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
      // Default to simulation mode if the tournament is over (portfolio visitor in future)
      setIsSimMode(true);
      setSystemTime("2026-06-25T20:00:00Z"); // double live match day
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

  // Synchronize systemTime with URL search params
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

  // Playback timer loop
  useEffect(() => {
    if (!isSimMode || !isPlaying) return;

    const interval = setInterval(() => {
      setSystemTime((prevTime) => {
        const currentDate = new Date(prevTime);
        currentDate.setMinutes(currentDate.getMinutes() + simSpeed);
        
        const maxTime = new Date("2026-07-20T12:00:00Z").getTime();
        if (currentDate.getTime() > maxTime) {
          return "2026-06-10T12:00:00Z";
        }
        
        return currentDate.toISOString();
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimMode, isPlaying, simSpeed]);

  const toggleSimMode = () => {
    const nextMode = !isSimMode;
    setIsSimMode(nextMode);
    localStorage.setItem("isSimMode", String(nextMode));
    
    if (nextMode) {
      setSystemTime("2026-06-25T20:00:00Z");
    } else {
      setIsPlaying(false);
      setSystemTime(new Date().toISOString());
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timestamp = parseInt(e.target.value);
    setSystemTime(new Date(timestamp).toISOString());
  };

  const jumpToMoment = (dateStr: string) => {
    setSystemTime(dateStr);
  };

  // Background polling to refresh server-side data from cache (disabled under simulation mode)
  useEffect(() => {
    if (isSimMode) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);
    return () => clearInterval(interval);
  }, [router, isSimMode]);

  const [searchQuery, setSearchQuery] = useState("");
  // Deferred value: the input updates instantly while the heavy
  // array filtering only runs when the main thread has idle time.
  const deferredSearchQuery = useDeferredValue(searchQuery);
  // True while React hasn't caught up yet — used to dim the list.
  const isStale = searchQuery !== deferredSearchQuery;
  const [selectedStatus, setSelectedStatus] = useState<string>("UPCOMING");
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [groupingMode, setGroupingMode] = useState<"date" | "group">("date");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"SCHEDULE" | "ANALYSIS">("SCHEDULE");

  // Parse matches based on active system time
  const matches = getProcessedMatches(systemTime, initialFixtures);

  // Precompute scoreline predictions for all resolved matches (upcoming or completed)
  const predictionsMap = useMemo(() => {
    const map: Record<number, ScorelinePrediction[]> = {};
    for (const m of matches) {
      if (
        !isPlaceholderTeam(m.homeTeam) &&
        !isPlaceholderTeam(m.awayTeam)
      ) {
        map[m.matchNumber] = generateScorelinePredictions(m.homeTeam, m.awayTeam, matches);
      }
    }
    return map;
  }, [matches]);

  // Extract matches that are currently live (IN_PLAY or PAUSED)
  const liveMatches = matches.filter((m) => m.status === "LIVE");
  const liveMatchIds = new Set(liveMatches.map((m) => m.matchNumber));

  // Deduplicate: exclude already-live matches from the "Next 3" hero so
  // a live match never occupies a slot in both sections simultaneously.
  const upcomingThreeRaw = getNextThreeUpcoming(systemTime, initialFixtures);
  const upcomingThree = upcomingThreeRaw.filter(
    (m) => !liveMatchIds.has(m.matchNumber)
  ).slice(0, 3);

  // ── IDs of matches already rendered in the top two priority sections ──────
  // Build a combined exclusion set so no match appears in two places at once.
  const heroMatchIds = new Set(upcomingThree.map((m) => m.matchNumber));
  const topSectionIds = new Set([...liveMatchIds, ...heroMatchIds]);

  // ── Smart default: when no search or category filter is active,
  //    only show matches from "now" onward so the list opens at the
  //    next relevant game rather than the tournament start.
  //    Bypass the time gate when the user is explicitly searching or
  //    viewing COMPLETED / LIVE tabs (they need full history).
  // "Default view" = user hasn't applied any explicit filter beyond the baseline
  // UPCOMING tab and the default stage/group selectors.
  const isDefaultView =
    deferredSearchQuery.length === 0 &&
    selectedStatus === "UPCOMING" &&
    selectedStage === "ALL" &&
    selectedGroup === "ALL";

  const currentMs = new Date(systemTime).getTime();

  // ── Base pool for the Full Fixtures section ─────────────────────────────
  // Deduplication is BYPASSED when the user is actively searching OR has
  // explicitly chosen the "LIVE" tab. Without this, live matches are hidden
  // from the list because they already appear in the "Live Action" hero section
  // (i.e. their IDs are in topSectionIds). Both bypass cases need the full
  // match set so the subsequent status/search filters have something to show.
  const isSearchActive = deferredSearchQuery.length > 0;
  const isLiveTabActive = selectedStatus === "LIVE";
  const basePool = (isSearchActive || isLiveTabActive)
    ? matches                                                    // full set — no deduplication
    : matches.filter((m) => !topSectionIds.has(m.matchNumber)); // deduplicated default view

  // ── Apply all user-selected filters ────────────────────────────────────
  const filteredMatches = basePool.filter((match) => {
    // 1. Search text filter (team name only)
    const searchLower = deferredSearchQuery.toLowerCase();
    const homeLower = match.homeTeam ? match.homeTeam.toLowerCase() : "";
    const awayLower = match.awayTeam ? match.awayTeam.toLowerCase() : "";
    const matchesSearch =
      searchLower === "" ||
      homeLower.includes(searchLower) ||
      awayLower.includes(searchLower);

    // 2. Status tab filter.
    // CRITICAL: when the user has typed a search query, bypass the category
    // filter entirely so they see a team's complete history across all statuses.
    const matchesStatus =
      isSearchActive ||
      (selectedStatus === "LIVE" && match.status === "LIVE") ||
      (selectedStatus === "UPCOMING" && match.status === "UPCOMING") ||
      (selectedStatus === "COMPLETED" && match.status === "COMPLETED");

    // 3. Stage filter
    const isKnockout = match.stage !== "group-stage";
    const matchesStage =
      selectedStage === "ALL" ||
      (selectedStage === "GROUP" && match.stage === "group-stage") ||
      (selectedStage === "KNOCKOUT" && isKnockout);

    // 4. Group letter filter
    const matchesGroup =
      selectedGroup === "ALL" ||
      (match.group && match.group.toUpperCase() === selectedGroup.toUpperCase());

    // 5. Smart time gate — only active on the default (unfiltered) view.
    //    Bypass for searches, COMPLETED/LIVE tabs, or any advanced filter so
    //    users always get complete history when they explicitly ask for it.
    const bypassTimeGate =
      deferredSearchQuery.length > 0 ||
      selectedStatus === "COMPLETED" ||
      selectedStatus === "LIVE" ||
      selectedStage !== "ALL" ||
      selectedGroup !== "ALL";

    const matchesTimeGate =
      bypassTimeGate ||
      !isDefaultView ||
      new Date(match.kickoffUtc).getTime() >= currentMs;

    return matchesSearch && matchesStatus && matchesStage && matchesGroup && matchesTimeGate;
  });

  // Unique groups list for filter (A to L)
  const groupLetterList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  // ── Descending sort for COMPLETED-only view ──────────────────────────
  // When the user selects the "COMPLETED" tab, reverse the order so the
  // most recently finished games appear at the top. All other tabs (ALL,
  // UPCOMING, LIVE) keep ascending chronological order.
  const isCompletedOnlyView = selectedStatus === "COMPLETED";
  const sortedMatches = isCompletedOnlyView
    ? [...filteredMatches].sort(
      (a, b) => new Date(b.kickoffUtc).getTime() - new Date(a.kickoffUtc).getTime()
    )
    : filteredMatches;

  // ── Group matches by date or group ─────────────────────────────────────
  // Only groups that have ≥1 match after all filters are included,
  // which prevents empty date headers from rendering.
  const groupedMatches: Record<string, ProcessedMatch[]> = {};
  sortedMatches.forEach((match) => {
    let key: string;
    if (groupingMode === "date") {
      key = match.formattedDateJerusalem;
    } else {
      // "By Group" — use the group letter (e.g. "A") or fall back to stage name
      key = match.group ? `Group ${match.group.toUpperCase()}` : getStageDisplayName(match.stage);
    }
    if (!groupedMatches[key]) {
      groupedMatches[key] = [];
    }
    groupedMatches[key].push(match);
  });

  // Sort date group headers chronologically or reverse for COMPLETED view;
  // groups always sort alphabetically (A→L, then knockout labels).
  const groupKeys = Object.keys(groupedMatches).sort((a, b) => {
    if (groupingMode === "date") {
      const diff = new Date(a).getTime() - new Date(b).getTime();
      // Flip direction for COMPLETED-only: most recent date header on top
      return isCompletedOnlyView ? -diff : diff;
    } else {
      // "Group A" before "Group B" etc.; non-group keys sort after
      const aIsGroup = a.startsWith("Group ");
      const bIsGroup = b.startsWith("Group ");
      if (aIsGroup && bIsGroup) return a.localeCompare(b);
      if (aIsGroup) return -1;
      if (bIsGroup) return 1;
      return a.localeCompare(b);
    }
  });


  return (
    <div className="min-h-screen bg-bg-900 text-text-primary font-sans relative overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-800">

      {/* Background Grid & Ambient Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[45%] h-[50%] bg-cyan-200/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[50%] h-[55%] bg-blue-200/15 rounded-full blur-[130px]" />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b80_1px,transparent_1px),linear-gradient(to_bottom,#1e293b80_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-16 sm:pt-8 pb-24">

        {/* Global Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400">
              ⚡ WC26.TRACKER
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link
              href={`/${(isMock || isSimMode) ? "?" : ""}${isMock ? "mock=true" : ""}${isMock && isSimMode ? "&" : ""}${isSimMode ? `simTime=${encodeURIComponent(systemTime)}` : ""}`}
              className="text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 pb-1"
            >
              <span className="sm:inline hidden">Matches & Standings</span>
              <span className="sm:hidden">Fixtures</span>
            </Link>
            <Link
              href={`/knockouts${(isMock || isSimMode) ? "?" : ""}${isMock ? "mock=true" : ""}${isMock && isSimMode ? "&" : ""}${isSimMode ? `simTime=${encodeURIComponent(systemTime)}` : ""}`}
              className="text-text-secondary hover:text-text-primary transition-colors pb-1 border-b-2 border-transparent"
            >
              <span className="sm:inline hidden">Knockout Bracket</span>
              <span className="sm:hidden">Bracket</span>
            </Link>
          </div>
        </div>

        {/* Header Title Section */}
        <div className="text-center mb-12" data-aos="fade-down" data-aos-duration="1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 dark:bg-cyan-950/30 dark:border-cyan-900/50 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-600 animate-ping" />
            2026 FIFA World Cup Live Tracker
          </div>
          <h1 className="text-3xl sm:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400">
            Tournament World Cup Live Hub
          </h1>
          <p className="mt-3 text-text-secondary max-w-xl mx-auto text-sm sm:text-base font-light">
            Keep track of all 104 matches playing across US, Canada, and Mexico.
            All kickoffs are converted automatically to <span className="text-cyan-600 font-semibold">Jerusalem Time (GMT+3)</span>.
          </p>

          {/* TIMELINE WARP SIMULATION DASHBOARD */}
          <div className="mt-8 relative z-10 w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
            
            {/* Banner for Future Visitors */}
            {mounted && isPastTournament && (
              <div className="mb-4 flex items-center justify-between gap-3 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-700 dark:text-purple-300 text-xs font-semibold leading-relaxed shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-500 shrink-0 animate-pulse" />
                  <span>
                    🏆 <strong>World Cup Archive Mode:</strong> We&apos;ve activated simulation warp so you can experience matches as they played out live!
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-5">
              {/* Header Row: Mode Switcher & Time Display */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Mode Segmented Select */}
                  <div className="bg-bg-900 border border-border p-1 rounded-xl flex shadow-inner text-xs font-bold select-none">
                    <button
                      onClick={() => isSimMode && toggleSimMode()}
                      className={cn(
                        "px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold",
                        !isSimMode ? "bg-bg-800 text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {!isSimMode && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                      <span>Live Time Feed</span>
                    </button>
                    <button
                      onClick={() => !isSimMode && toggleSimMode()}
                      className={cn(
                        "px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold",
                        isSimMode ? "bg-purple-600 text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <Sparkles size={13} className={isSimMode ? "animate-spin-slow text-white" : ""} />
                      <span>Timeline Warp</span>
                    </button>
                  </div>
                </div>

                {/* Simulated / Live Clock Display */}
                <div
                  onClick={handleClockClick}
                  className={cn(
                    "group flex items-center gap-3 bg-bg-900 border border-border rounded-xl px-4 py-2 text-sm shadow-sm cursor-pointer select-none transition-all duration-200 active:scale-[0.98]",
                    isSimMode 
                      ? "hover:bg-bg-800 hover:border-purple-500/40" 
                      : "hover:bg-bg-800 hover:border-cyan-500/40"
                  )}
                  title={isSimMode ? "Click to set custom date & time" : "Click to enter Timeline Warp & select time"}
                >
                  <Clock size={16} className={cn(isSimMode && isPlaying ? "text-purple-500 animate-spin-slow" : "text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-500")} />
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-text-secondary leading-none mb-1">
                      {isSimMode ? "Simulated System Clock" : "Actual Local Time"}
                    </span>
                    <span className="font-extrabold text-text-primary font-mono tracking-tight leading-none text-base flex items-center gap-1">
                      {mounted ? (
                        new Date(systemTime).toLocaleString("en-US", {
                          timeZone: "Asia/Jerusalem",
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })
                      ) : (
                        "Syncing..."
                      )}
                      {" "} <span className="text-cyan-600 dark:text-cyan-400 text-xs font-sans">(GMT+3)</span>
                      <ChevronDown size={13} className={cn(
                        "transition-colors ml-0.5",
                        isSimMode 
                          ? "text-purple-500/60 group-hover:text-purple-400" 
                          : "text-cyan-500/60 group-hover:text-cyan-400"
                      )} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline Slider Section */}
              {isSimMode && (
                <div className="space-y-4">
                  {/* Slider track with markings */}
                  <div className="relative pt-2">
                    <input
                      type="range"
                      min="1781092800000" // June 10 12:00 UTC
                      max="1784548800000" // July 20 12:00 UTC
                      step="300000" // 5 minutes
                      value={new Date(systemTime).getTime()}
                      onChange={handleSliderChange}
                      className="w-full h-2 rounded-lg bg-bg-900 appearance-none cursor-pointer accent-purple-600 border border-border focus:outline-none"
                    />
                    
                    {/* Phase labels below slider */}
                    <div className="flex justify-between text-[10px] text-text-secondary/60 font-bold px-1 pt-1.5 uppercase tracking-wider select-none">
                      <span>Group Stage</span>
                      <span className="hidden sm:inline">Rd of 32</span>
                      <span>Knockouts</span>
                      <span className="hidden sm:inline">Semifinals</span>
                      <span>Final</span>
                    </div>
                  </div>

                  {/* Quick Jump Moments */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary select-none text-left">
                      ⚡ Jump to Key Moments in the Tournament:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {SIM_MOMENTS.map((moment) => {
                        const isActive = Math.abs(new Date(systemTime).getTime() - new Date(moment.date).getTime()) < 30 * 60 * 1000;
                        return (
                          <button
                            key={moment.label}
                            onClick={() => jumpToMoment(moment.date)}
                            title={moment.desc}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                              isActive
                                ? "bg-purple-650 border-purple-550 text-white font-extrabold shadow-sm shadow-purple-650/20 animate-pulse"
                                : "bg-bg-900 border-border text-text-secondary hover:text-text-primary hover:bg-bg-800"
                            )}
                          >
                            {moment.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Playback Controls Row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          isPlaying
                            ? "bg-rose-600 border-rose-500 text-white animate-pulse"
                            : "bg-purple-600 border-purple-500 text-white"
                        )}
                      >
                        {isPlaying ? (
                          <>
                            <Pause size={14} fill="currentColor" />
                            <span>Pause Warp</span>
                          </>
                        ) : (
                          <>
                            <Play size={14} fill="currentColor" />
                            <span>Time Warp Play</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          jumpToMoment("2026-06-11T19:00:00Z");
                        }}
                        title="Reset to start of tournament"
                        className="flex items-center justify-center p-2 rounded-xl border border-border bg-bg-900 hover:bg-bg-800 text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>

                    {/* Playback Speed selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary select-none">
                        Warp Speed:
                      </span>
                      <div className="bg-bg-900 border border-border p-0.5 rounded-lg flex text-[10px] font-bold shadow-inner">
                        {([
                          { label: "1x", value: 10 },
                          { label: "5x", value: 30 },
                          { label: "15x", value: 90 },
                          { label: "60x", value: 360 },
                        ] as { label: string; value: number }[]).map((sp) => (
                          <button
                            key={sp.label}
                            disabled={!isPlaying}
                            onClick={() => setSimSpeed(sp.value)}
                            className={cn(
                              "px-2.5 py-1 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                              simSpeed === sp.value && isPlaying
                                ? "bg-purple-650 text-white font-extrabold"
                                : "text-text-secondary hover:text-text-primary"
                            )}
                          >
                            {sp.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LIVE ACTION SECTION — only rendered when matches are in progress */}
        {mounted && liveMatches.length > 0 && (
          <LiveActionSection liveMatches={liveMatches} />
        )}

        {/* HERO SECTION: Next 3 Upcoming Games */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6" data-aos="fade-right">
            <div className="flex items-center gap-2">
              <Tv className="text-purple-500" size={20} />
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                Imminent Matches (Next 3)
              </h2>
            </div>
            <div className="h-[1px] flex-grow bg-gradient-to-r from-purple-500/20 to-transparent ml-4 hidden sm:block" />
          </div>

          <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory pb-4 md:pb-0 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {!mounted ? (
              <>
                <HeroSkeleton />
                <HeroSkeleton />
                <HeroSkeleton />
              </>
            ) : upcomingThree.length > 0 ? (
              upcomingThree.map((match, idx) => (
                <HeroMatchCard
                  key={match.matchNumber}
                  match={match}
                  index={idx}
                  systemTime={systemTime}
                  scorePredictions={predictionsMap[match.matchNumber]}
                />
              ))
            ) : (
              <div className="col-span-3 w-full py-10 rounded-2xl border border-dashed border-border text-center text-text-secondary bg-bg-700/50 backdrop-blur-sm">
                No upcoming matches left in the tournament!
              </div>
            )}
          </div>
        </section>

        {/* FULL SCHEDULE SECTION */}
        <section className="relative">

          {/* Header with View Toggle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6" data-aos="fade-right">
            <div className="flex items-center gap-2 flex-grow">
              <Calendar className="text-cyan-500 shrink-0" size={20} />
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {viewMode === "SCHEDULE" ? "Full Fixtures Schedule" : "H2H Matchup Analyzer"}
              </h2>
              <div className="h-[1px] flex-grow bg-gradient-to-r from-cyan-500/20 to-transparent ml-4 hidden lg:block" />
            </div>

            {/* Segmented Control */}
            <div className="bg-bg-700/60 backdrop-blur-sm border border-border/50 p-1 rounded-full inline-flex shadow-sm text-xs font-semibold select-none self-start md:self-auto">
              <button
                onClick={() => setViewMode("SCHEDULE")}
                className={`px-4 py-1.5 rounded-full font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${viewMode === "SCHEDULE"
                  ? "bg-bg-800 shadow-sm text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                <span>📅</span>
                <span>Schedule</span>
              </button>
              <button
                onClick={() => setViewMode("ANALYSIS")}
                className={`px-4 py-1.5 rounded-full font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${viewMode === "ANALYSIS"
                  ? "bg-bg-800 shadow-sm text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                <span>📊</span>
                <span>H2H Analysis</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === "SCHEDULE" ? (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* HIGH-TECH GLASSMORPHIC SEARCH & FILTER BAR */}
                <div
                  className="sticky top-[20px] md:top-[80px] z-40 bg-bg-800/80 backdrop-blur-xl border border-border rounded-2xl p-4 sm:p-5 mb-8 shadow-md transition-all duration-300"
                  data-aos="fade-up"
                  data-aos-duration="800"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">

                    {/* Search Bar */}
                    <div className="relative flex-grow max-w-lg">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/80" size={18} />
                      <input
                        type="text"
                        placeholder="Search by team name (e.g. France)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-bg-900 border border-border focus:bg-bg-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-text-primary placeholder-text-secondary/60 transition-all focus:outline-none"
                      />
                    </div>

                    {/* Filtering Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Status Toggle Buttons */}
                      <div className="flex bg-bg-900 border border-border rounded-xl p-1 text-xs">
                        {["LIVE", "UPCOMING", "COMPLETED"].map((status) => (
                          <button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${selectedStatus === status
                              ? "bg-cyan-600 text-white font-bold shadow-sm shadow-cyan-600/10"
                              : "text-text-secondary hover:text-text-primary"
                              }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>

                      {/* Grouping Toggle */}
                      <div className="flex bg-bg-900 border border-border rounded-xl p-1 text-xs">
                        <button
                          onClick={() => setGroupingMode("date")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${groupingMode === "date"
                            ? "bg-purple-600 text-white font-semibold shadow-sm shadow-purple-600/10"
                            : "text-text-secondary hover:text-text-primary"
                            }`}
                          title="Group by Date"
                        >
                          <CalendarDays size={14} />
                          <span className="hidden sm:inline">By Date</span>
                        </button>
                        <button
                          onClick={() => setGroupingMode("group")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${groupingMode === "group"
                            ? "bg-purple-600 text-white font-semibold shadow-sm shadow-purple-600/10"
                            : "text-text-secondary hover:text-text-primary"
                            }`}
                          title="Group by Group"
                        >
                          <LayoutGrid size={14} />
                          <span className="hidden sm:inline">By Group</span>
                        </button>
                      </div>

                      {/* Expand filters toggle for mobile / detail filters */}
                      <button
                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                        className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${isFilterExpanded || selectedStage !== "ALL" || selectedGroup !== "ALL"
                          ? "bg-bg-700 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-sm"
                          : "bg-bg-800 border-border text-text-secondary hover:text-text-primary hover:bg-bg-700"
                          }`}
                      >
                        <Filter size={14} />
                        <span>Filters</span>
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${isFilterExpanded ? "rotate-180" : ""
                            }`}
                        />
                      </button>
                    </div>

                  </div>

                  {/* EXPANDABLE ADVANCED FILTERS PANEL */}
                  <AnimatePresence>
                    {isFilterExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mt-4 pt-4 border-t border-border/80"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Stage Select */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-text-secondary font-semibold tracking-wider uppercase">
                              Stage Selection
                            </label>
                            <div className="grid grid-cols-3 gap-2 bg-bg-900 p-1 border border-border rounded-xl text-xs">
                              {[
                                { id: "ALL", label: "All Stages" },
                                { id: "GROUP", label: "Group Stage" },
                                { id: "KNOCKOUT", label: "Knockout" },
                              ].map((stage) => (
                                <button
                                  key={stage.id}
                                  onClick={() => setSelectedStage(stage.id)}
                                  className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${selectedStage === stage.id
                                    ? "bg-bg-800 text-cyan-600 dark:text-cyan-400 font-semibold border border-border shadow-sm"
                                    : "text-text-secondary hover:text-text-primary"
                                    }`}
                                >
                                  {stage.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Group Select (Disabled if Knockout is selected) */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-text-secondary font-semibold tracking-wider uppercase">
                              Group (Group Stage only)
                            </label>
                            <select
                              disabled={selectedStage === "KNOCKOUT"}
                              value={selectedGroup}
                              onChange={(e) => setSelectedGroup(e.target.value)}
                              className="bg-bg-900 border border-border text-text-primary text-xs rounded-xl p-2 focus:border-cyan-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                              <option value="ALL" className="bg-bg-800 text-text-primary cursor-pointer">All Groups (A-L)</option>
                              {groupLetterList.map((g) => (
                                <option key={g} value={g} className="bg-bg-800 text-text-primary cursor-pointer">
                                  Group {g}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Reset Filters Option */}
                        {(selectedStage !== "ALL" || selectedGroup !== "ALL" || searchQuery !== "" || selectedStatus !== "UPCOMING") && (
                          <div className="flex justify-end mt-4">
                            <button
                              onClick={() => {
                                setSelectedStage("ALL");
                                setSelectedGroup("ALL");
                                setSelectedStatus("UPCOMING");
                                setSearchQuery("");
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700 transition-colors underline font-medium cursor-pointer"
                            >
                              Reset All Filters
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* SCHEDULE LIST GRID GROUPINGS */}
                <div className={cn("space-y-12 transition-opacity duration-300", isStale && "opacity-50 pointer-events-none")}>
                  {!mounted ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 pl-1">
                        <span className="w-1.5 h-6 rounded bg-gradient-to-b from-cyan-400 to-purple-600 animate-pulse" />
                        <div className="h-5 w-40 bg-bg-700 rounded animate-pulse" />
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <RowSkeleton />
                        <RowSkeleton />
                        <RowSkeleton />
                      </div>
                    </div>
                  ) : groupKeys.length > 0 ? (
                    groupKeys.map((groupTitle) => (
                      <div key={groupTitle} className="space-y-4" data-aos="fade-up">
                        {/* Group Header */}
                        <div className="flex items-center gap-3 pl-1">
                          <span className="w-1.5 h-6 rounded bg-gradient-to-b from-cyan-400 to-purple-600" />
                          <h3 className="text-lg font-bold text-text-primary tracking-wide">
                            {groupTitle}
                          </h3>
                          <span className="text-xs text-text-secondary bg-bg-800/60 border border-border px-2 py-0.5 rounded-full font-mono">
                            {groupedMatches[groupTitle].length} {groupedMatches[groupTitle].length === 1 ? "game" : "games"}
                          </span>
                        </div>

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 gap-4">
                          {groupedMatches[groupTitle].map((match) => (
                            <MatchListRow
                              key={match.matchNumber}
                              match={match}
                              scorePredictions={predictionsMap[match.matchNumber]}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-bg-800/50 backdrop-blur-sm">
                      <Info className="mx-auto text-slate-400 mb-3" size={32} />
                      <p className="text-slate-600 font-medium">No matches match your current filter search.</p>
                      <p className="text-xs text-slate-400 mt-1">Try tweaking your search term or filter tabs.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MatchupAnalyzer matches={matches} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        {/* Date Time Picker Modal */}
        <AnimatePresence>
          {isDatePickerOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDatePickerOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
              />
              
              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md bg-bg-800 border border-border rounded-2xl p-6 shadow-2xl z-10 overflow-hidden"
              >
                {/* Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary tracking-tight">
                      Warp Simulation Clock
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Specify the date and time to simulate.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleApplyTime} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider pl-0.5">
                      Date &amp; Time (Jerusalem Time)
                    </label>
                    <input
                      type="datetime-local"
                      min="2026-06-11T00:00"
                      max="2026-07-19T23:59"
                      value={tempDateTime}
                      onChange={handleTempDateTimeChange}
                      className="w-full bg-bg-900 border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 font-mono text-sm tracking-wide cursor-pointer dark:[color-scheme:dark]"
                    />
                    
                    {/* Time limit hint */}
                    <div className="flex justify-between items-center text-[10px] text-text-secondary/70 font-semibold px-0.5 mt-1">
                      <span>Min: June 11, 2026</span>
                      <span>Max: July 19, 2026</span>
                    </div>
                  </div>

                  {/* Validation Error Message */}
                  {tempDateTime && getValidationError(tempDateTime) && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5">⚠️</span>
                      <span>{getValidationError(tempDateTime)}</span>
                    </div>
                  )}

                  {/* Modal Footer Controls */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-bg-700/40 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!!getValidationError(tempDateTime) || !tempDateTime}
                      className="px-5 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Apply Warp</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

