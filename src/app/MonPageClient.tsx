"use client";

import { useState, useEffect, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  Fixture,
  ProcessedMatch,
  getProcessedMatches,
  getNextThreeUpcoming,
  getStageDisplayName,
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

export default function MonPageClient({ initialFixtures }: { initialFixtures?: Fixture[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [systemTime, setSystemTime] = useState<string>(SYSTEM_TIME_STR);

  useEffect(() => {
    setMounted(true);
    setSystemTime(new Date().toISOString());
    const timer = setInterval(() => {
      setSystemTime(new Date().toISOString());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Background polling to refresh server-side data from cache
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);
    return () => clearInterval(interval);
  }, [router]);

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

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-8 pb-24">

        {/* Header Title Section */}
        <div className="text-center mb-12" data-aos="fade-down" data-aos-duration="1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 dark:bg-cyan-950/30 dark:border-cyan-900/50 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-600 animate-ping" />
            2026 FIFA World Cup Live Tracker
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400">
            Tournament World Cup Live Hub
          </h1>
          <p className="mt-3 text-text-secondary max-w-xl mx-auto text-sm sm:text-base font-light">
            Keep track of all 104 matches playing across US, Canada, and Mexico.
            All kickoffs are converted automatically to <span className="text-cyan-600 font-semibold">Jerusalem Time (GMT+3)</span>.
          </p>

          {/* Clock Info Badge */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-secondary">
            <div className="flex items-center gap-2 bg-bg-800/60 border border-border rounded-full px-3 py-1 shadow-sm">
              <Clock size={14} className="text-cyan-600 dark:text-cyan-400" />
              <span>System Time: </span>
              <span className="text-cyan-700 dark:text-cyan-400 font-semibold font-mono">
                {mounted ? (
                  new Date(systemTime).toLocaleString("en-US", {
                    timeZone: "Asia/Jerusalem",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                ) : (
                  "Syncing..."
                )}
              </span>
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
                <HeroMatchCard key={match.matchNumber} match={match} index={idx} systemTime={systemTime} />
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
                            <MatchListRow key={match.matchNumber} match={match} />
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

      </div>
    </div>
  );
}

