/* =============================================================================
   SIMULATION DATABASE & DATA EVOLUTION ARCHITECTURE
   =============================================================================
   To ensure the "Timeline Warp" (simulation mode) works offline and remains 
   fully functional after the 2026 World Cup ends, match results (scores, goals, 
   shootouts, and stats) should be archived in a separate JSON database file:
   `src/data/simulation-database.json`
   
   HOW TO EXPAND THE DATA AS THE TOURNAMENT EVOLVES:
   --------------------------------------------------
   Create a JSON file structured as a dictionary mapped by the match number:
   
   {
     "1": {
       "homeScore": 2,
       "awayScore": 1,
       "goals": [
         { "minute": 15, "scorer": "J. Hernandez", "team": "Mexico", "type": "NORMAL" },
         { "minute": 88, "scorer": "R. Jimenez", "team": "Mexico", "type": "NORMAL" }
       ],
       "stats": {
         "homePossession": 55,
         "awayPossession": 45,
         "homeShotsOnTarget": 6,
         "awayShotsOnTarget": 3,
         "homeTotalShots": 12,
         "awayTotalShots": 9,
         "homeCorners": 4,
         "awayCorners": 3
       }
     }
   }
   
   PRESERVING SIMULATOR INTEGRITY:
   --------------------------------
   1. MATCH ID ALIGNMENT: Ensure the keys ("1", "2", etc.) correspond exactly 
      to the `matchNumber` values inside `fixtures.json`.
   2. INTERACTIVE OFFSET CLOCK: The timeline engine dynamically scales stats 
      and hides/reveals goals in real-time based on the active simulated time 
      relative to the kickoff. To prevent rendering bugs:
      - Do not include future/upcoming matches in the archive file until they 
        are completed (or actively in play).
      - Ensure goal minute values are realistic integers (1 to 120+).
   3. INTEGRATING THE ARCHIVE: Load this JSON database in this file (`worldcup.ts`), 
      and merge it into the processed matches array:
      
      import historicalDb from "./simulation-database.json";
      // Merge:
      const historicalMatch = (historicalDb as Record<string, any>)[fixture.matchNumber.toString()];
      if (historicalMatch) {
        homeScore = historicalMatch.homeScore;
        awayScore = historicalMatch.awayScore;
        goals = historicalMatch.goals || [];
        stats = historicalMatch.stats;
      }
   ============================================================================= */

import fixturesData from "./fixtures.json";
import simulationDb from "./simulation-database.json";

export interface Goal {
  minute: number;
  injuryTime?: number | null;
  scorer: string;       // player name
  team: string;         // team name that scored
  type?: string;        // "NORMAL", "OWN", "PENALTY"
}

export interface Fixture {
  matchNumber: number;
  date: string; // "2026-06-11"
  kickoffUtc: string; // "2026-06-11T19:00:00Z"
  stage: string; // "group-stage", "round-of-32", etc.
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  hostCity: string;
  matchUrl: string;
  homeScore?: number;
  awayScore?: number;
  apiStatus?: string;
  displayClock?: string;
  goals?: Goal[];
  shootoutScore?: {
    home: number;
    away: number;
  };
  stats?: MatchStats;
}

export interface MatchStats {
  homePossession: number;   // e.g. 58.7  (percent)
  awayPossession: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeTotalShots: number;
  awayTotalShots: number;
  homeCorners: number;
  awayCorners: number;
}

export interface ProcessedMatch extends Fixture {
  status: 'COMPLETED' | 'LIVE' | 'UPCOMING';
  homeScore?: number;
  awayScore?: number;
  homeFlag: string;
  awayFlag: string;
  homeCode: string;
  awayCode: string;
  displayClock?: string;
  formattedTimeJerusalem: string;
  formattedDateJerusalem: string;
  goals?: Goal[];  // already inherited via Fixture, re-declared for clarity
  stats?: MatchStats; // live match statistics from ESPN statistics array
}


export const TEAM_MAPPING: Record<string, { code: string; flag: string }> = {
  "Mexico": { code: "MEX", flag: "🇲🇽" },
  "South Africa": { code: "RSA", flag: "🇿🇦" },
  "Korea Republic": { code: "KOR", flag: "🇰🇷" },
  "Czechia": { code: "CZE", flag: "🇨🇿" },
  "Canada": { code: "CAN", flag: "🇨🇦" },
  "Bosnia and Herzegovina": { code: "BIH", flag: "🇧🇦" },
  "United States": { code: "USA", flag: "🇺🇸" },
  "Paraguay": { code: "PAR", flag: "🇵🇾" },
  "Haiti": { code: "HAI", flag: "🇭🇹" },
  "Scotland": { code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  "Australia": { code: "AUS", flag: "🇦🇺" },
  "Turkiye": { code: "TUR", flag: "🇹🇷" },
  "Brazil": { code: "BRA", flag: "🇧🇷" },
  "Morocco": { code: "MAR", flag: "🇲🇦" },
  "Qatar": { code: "QAT", flag: "🇶🇦" },
  "Switzerland": { code: "SUI", flag: "🇨🇭" },
  "Cote d'Ivoire": { code: "CIV", flag: "🇨🇮" },
  "Ecuador": { code: "ECU", flag: "🇪🇨" },
  "Germany": { code: "GER", flag: "🇩🇪" },
  "Curacao": { code: "CUW", flag: "🇨🇼" },
  "Netherlands": { code: "NED", flag: "🇳🇱" },
  "Japan": { code: "JPN", flag: "🇯🇵" },
  "Sweden": { code: "SWE", flag: "🇸🇪" },
  "Tunisia": { code: "TUN", flag: "🇹🇳" },
  "Saudi Arabia": { code: "KSA", flag: "🇸🇦" },
  "Uruguay": { code: "URU", flag: "🇺🇾" },
  "Spain": { code: "ESP", flag: "🇪🇸" },
  "Cabo Verde": { code: "CPV", flag: "🇨🇻" },
  "IR Iran": { code: "IRN", flag: "🇮🇷" },
  "New Zealand": { code: "NZL", flag: "🇳🇿" },
  "Belgium": { code: "BEL", flag: "🇧🇪" },
  "Egypt": { code: "EGY", flag: "🇪🇬" },
  "France": { code: "FRA", flag: "🇫🇷" },
  "Senegal": { code: "SEN", flag: "🇸🇳" },
  "Iraq": { code: "IRQ", flag: "🇮🇶" },
  "Norway": { code: "NOR", flag: "🇳🇴" },
  "Argentina": { code: "ARG", flag: "🇦🇷" },
  "Algeria": { code: "ALG", flag: "🇩🇿" },
  "Austria": { code: "AUT", flag: "🇦🇹" },
  "Jordan": { code: "JOR", flag: "🇯🇴" },
  "Ghana": { code: "GHA", flag: "🇬🇭" },
  "Panama": { code: "PAN", flag: "🇵🇦" },
  "England": { code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "Croatia": { code: "CRO", flag: "🇭🇷" },
  "Portugal": { code: "POR", flag: "🇵🇹" },
  "Congo DR": { code: "COD", flag: "🇨🇩" },
  "Uzbekistan": { code: "UZB", flag: "🇺🇿" },
  "Colombia": { code: "COL", flag: "🇨🇴" }
};

export const normalizeTeamName = (name: string): string => {
  if (!name) return "";
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-/g, " ")
    .trim();
  const nameMap: Record<string, string> = {
    "south korea": "korea republic",
    "south-korea": "korea republic",
    "korea republic": "korea republic",
    "bosnia herzegovina": "bosnia and herzegovina",
    "bosnia and herzegovina": "bosnia and herzegovina",
    "turkey": "turkiye",
    "turkiye": "turkiye",
    "ivory coast": "cote d'ivoire",
    "cote d'ivoire": "cote d'ivoire",
    "curacao": "curacao",
    "curaçao": "curacao",
    "cape verde islands": "cabo verde",
    "cape verde": "cabo verde",
    "cabo verde": "cabo verde",
    "iran": "ir iran",
    "ir iran": "ir iran",
    "usa": "united states",
    "united states": "united states",
  };
  return nameMap[clean] || clean;
};

export const isPlaceholderTeam = (teamName?: string | null): boolean => {
  if (!teamName) return true;
  const lower = teamName.toLowerCase();
  
  // Explicit placeholder keywords
  if (
    lower.includes("winner") ||
    lower.includes("loser") ||
    lower.includes("runner") ||
    lower.includes("third place") ||
    lower.includes("tbd") ||
    lower.includes("tbc") ||
    lower.includes("play-off") ||
    lower.includes("match") ||
    lower.includes("placeholder")
  ) {
    return true;
  }

  // Double check: if it's not in TEAM_MAPPING, it's not a qualified team
  const trimmed = teamName.trim();
  if (TEAM_MAPPING[trimmed]) return false;
  const normalized = normalizeTeamName(trimmed);
  const matched = Object.keys(TEAM_MAPPING).some(
    (k) => normalizeTeamName(k) === normalized
  );
  return !matched;
};

export const getTeamInfo = (teamName?: string | null) => {
  if (!teamName) {
    return { code: "TBD", flag: "🏳️" };
  }
  const trimmed = teamName.trim();
  if (TEAM_MAPPING[trimmed]) {
    return TEAM_MAPPING[trimmed];
  }

  // Try normalized lookup
  const normalized = normalizeTeamName(trimmed);
  const matchedKey = Object.keys(TEAM_MAPPING).find(
    (k) => normalizeTeamName(k) === normalized
  );
  if (matchedKey) {
    return TEAM_MAPPING[matchedKey];
  }

  // Knockout stage placeholders
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("winner match")) {
    const num = trimmed.split(" ").pop() || "";
    return { code: `W${num}`, flag: "🏆" };
  }
  if (lower.startsWith("loser match")) {
    const num = trimmed.split(" ").pop() || "";
    return { code: `L${num}`, flag: "🏳️" };
  }
  if (lower.includes("runners-up")) {
    const parts = trimmed.split(" ");
    const group = parts[1] || "";
    return { code: `${group.toUpperCase()}2`, flag: "🥈" };
  }
  if (lower.includes("winners")) {
    const parts = trimmed.split(" ");
    const group = parts[1] || "";
    return { code: `${group.toUpperCase()}1`, flag: "🥇" };
  }
  if (lower.includes("third place")) {
    return { code: "3RD", flag: "🥉" };
  }

  // Fallback
  const code = trimmed.length >= 3 ? trimmed.substring(0, 3).toUpperCase() : "TBD";
  return { code, flag: "🏳️" };
};

export interface EspnAthlete {
  shortName?: string;
  displayName?: string;
}

export interface EspnEventDetail {
  scoringPlay?: boolean;
  type?: {
    text?: string;
  };
  clock?: {
    displayValue?: string;
  };
  athletesInvolved?: EspnAthlete[];
  team?: {
    id?: string | number;
    displayName?: string;
  };
}

export const parseEspnGoals = (
  details: EspnEventDetail[],
  homeTeamId: string,
  awayTeamId: string,
  localHomeName: string,
  localAwayName: string
): Goal[] => {
  if (!details || !Array.isArray(details)) return [];

  const goals: Goal[] = [];

  for (const event of details) {
    const text = (event.type?.text || "").toLowerCase();
    const isGoal = event.scoringPlay === true || text.includes("goal") || text.includes("penalty");
    const isShootout = text.includes("shootout"); // Often shootouts are separate

    // Exclude shootout goals from normal goal scorers if they are just penalty kicks in a shootout
    if (isGoal && !isShootout) {
      const minuteStr = event.clock?.displayValue || "";
      let minute = 0;
      let injuryTime: number | null = null;

      if (minuteStr.includes("+")) {
        const parts = minuteStr.split("+");
        minute = parseInt(parts[0].replace(/\D/g, ""), 10) || 0;
        injuryTime = parseInt(parts[1].replace(/\D/g, ""), 10) || null;
      } else {
        const parsedMin = parseInt(minuteStr.replace(/\D/g, ""), 10);
        if (!isNaN(parsedMin)) {
          if (parsedMin > 90) {
            minute = 90;
            injuryTime = parsedMin - 90;
          } else {
            minute = parsedMin;
          }
        }
      }

      let type: string | undefined = undefined;
      if (text.includes("own goal")) {
        type = "og";
      } else if (text.includes("penalty")) {
        type = "pen";
      }

      const scorerName = event.athletesInvolved?.[0]?.shortName || event.athletesInvolved?.[0]?.displayName || "Unknown";
      const teamId = event.team?.id?.toString();

      let teamName = "Unknown";
      if (teamId === homeTeamId) {
        teamName = localHomeName;
      } else if (teamId === awayTeamId) {
        teamName = localAwayName;
      } else if (event.team?.displayName) {
        // Fallback matching
        const normEv = normalizeTeamName(event.team.displayName);
        const normH = normalizeTeamName(localHomeName);
        const normA = normalizeTeamName(localAwayName);
        if (normEv === normH) teamName = localHomeName;
        else if (normEv === normA) teamName = localAwayName;
        else teamName = event.team.displayName;
      }

      goals.push({
        minute,
        injuryTime,
        scorer: scorerName,
        team: teamName,
        type,
      });
    }
  }

  return goals.sort((a, b) => a.minute - b.minute);
};

// Format time in Jerusalem (Asia/Jerusalem) timezone
export const formatJerusalemTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "00:00";
  }
};

// Format date in Jerusalem (Asia/Jerusalem) timezone
export const formatJerusalemDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return isoString.split("T")[0];
  }
};

// Helper to determine stage name display values
export const getStageDisplayName = (stage: string): string => {
  switch (stage) {
    case "group-stage":
      return "Group Stage";
    case "round-of-32":
      return "Round of 32";
    case "round-of-16":
      return "Round of 16";
    case "quarter-finals":
      return "Quarter-finals";
    case "semi-finals":
      return "Semi-finals";
    case "third-place":
      return "Third Place Play-off";
    case "final":
      return "Final";
    default:
      return stage.replace("-", " ");
  }
};

// Processes fixtures relative to the current system time
export const getProcessedMatches = (systemTimeStr: string, rawFixturesInput?: Fixture[]): ProcessedMatch[] => {
  const systemTime = new Date(systemTimeStr).getTime();
  const rawFixtures = [...(rawFixturesInput || (fixturesData.fixtures as Fixture[]))].map((fixture) => {
    const historicalMatch = (simulationDb as Record<string, Partial<Fixture> | undefined>)[fixture.matchNumber.toString()];
    if (historicalMatch) {
      return {
        ...fixture,
        homeScore: historicalMatch.homeScore !== undefined ? historicalMatch.homeScore : fixture.homeScore,
        awayScore: historicalMatch.awayScore !== undefined ? historicalMatch.awayScore : fixture.awayScore,
        goals: historicalMatch.goals || fixture.goals,
        stats: historicalMatch.stats || fixture.stats,
        shootoutScore: historicalMatch.shootoutScore || fixture.shootoutScore,
      };
    }
    return fixture;
  }) as Fixture[];

  // Sort raw fixtures chronologically by kickoffUtc ascending before processing
  rawFixtures.sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());

  return rawFixtures.map((fixture) => {
    const kickoffTime = new Date(fixture.kickoffUtc).getTime();
    const durationMs = 120 * 60 * 1000; // 120 minutes (2 hours TV broadcast window)
    const timeDiff = systemTime - kickoffTime;

    const isHomePlaceholder = isPlaceholderTeam(fixture.homeTeam);
    const isAwayPlaceholder = isPlaceholderTeam(fixture.awayTeam);
    const isKnockoutPlaceholder = isHomePlaceholder || isAwayPlaceholder;

    let status: 'COMPLETED' | 'LIVE' | 'UPCOMING' = 'UPCOMING';
    let displayClock: string | undefined;
    let homeScore: number | undefined;
    let awayScore: number | undefined;
    let goals: Goal[] | undefined = fixture.goals;
    let stats: MatchStats | undefined = fixture.stats;

    // Check if we are close to actual real-time (within 5 minutes)
    const isRealTime = Math.abs(Date.now() - systemTime) < 5 * 60 * 1000;

    if (isKnockoutPlaceholder) {
      status = 'UPCOMING';
    } else {
      if (isRealTime && fixture.apiStatus) {
        // At real-time, override date logic with actual state from ESPN API
        if (fixture.apiStatus === 'LIVE') {
          status = 'LIVE';
        } else if (fixture.apiStatus === 'COMPLETED') {
          status = 'COMPLETED';
        } else {
          status = 'UPCOMING';
        }
      } else {
        // Date gating logic for simulation / offline mode:
        if (timeDiff < 0) {
          status = 'UPCOMING';
        } else if (timeDiff < durationMs) {
          status = 'LIVE';
        } else {
          status = 'COMPLETED';
        }
      }
    }

    if (status === 'UPCOMING') {
      homeScore = undefined;
      awayScore = undefined;
      goals = [];
      stats = undefined;
      displayClock = undefined;
    } else if (status === 'LIVE') {
      const elapsedMins = Math.floor(timeDiff / 60000);
      const simulatedMatchMins = (elapsedMins < 45) 
        ? elapsedMins 
        : (elapsedMins < 60) 
          ? 45 
          : Math.min(90, elapsedMins - 15);

      if (isRealTime && (fixture.apiStatus === 'LIVE' || fixture.apiStatus === 'IN_PLAY' || fixture.apiStatus === 'PAUSED')) {
        // Use real live data if we are actually at real-time
        status = 'LIVE';
        displayClock = fixture.displayClock;
        homeScore = fixture.homeScore;
        awayScore = fixture.awayScore;
        goals = fixture.goals;
        stats = fixture.stats;
      } else {
        // Simulate live clock progression
        if (elapsedMins < 45) {
          displayClock = `${elapsedMins}'`;
        } else if (elapsedMins < 60) {
          displayClock = 'HT';
        } else {
          displayClock = `${Math.min(90, elapsedMins - 15)}'`;
        }

        // Simulate live goals (only those scored up to current elapsed minutes)
        const allGoals = fixture.goals || [];
        const simGoals = allGoals.filter(g => g.minute <= simulatedMatchMins);
        goals = simGoals;

        // Determine scores
        if (fixture.homeScore !== undefined && fixture.awayScore !== undefined) {
          if (allGoals.length > 0) {
            // Count home and away goals from filtered goals list
            homeScore = simGoals.filter(g => normalizeTeamName(g.team) === normalizeTeamName(fixture.homeTeam)).length;
            awayScore = simGoals.filter(g => normalizeTeamName(g.team) === normalizeTeamName(fixture.awayTeam)).length;
          } else {
            // If no goals details exist, scale final score by match progress ratio
            const ratio = simulatedMatchMins / 90;
            homeScore = Math.floor(fixture.homeScore * ratio);
            awayScore = Math.floor(fixture.awayScore * ratio);
          }
        } else {
          // Use deterministic scores scaled by time progression
          const homeLen = fixture.homeTeam ? fixture.homeTeam.length : 0;
          const awayLen = fixture.awayTeam ? fixture.awayTeam.length : 0;
          let finalHome = (fixture.matchNumber * 3 + homeLen) % 4;
          const finalAway = (fixture.matchNumber * 7 + awayLen) % 3;
          if (fixture.stage === 'final' && finalHome === finalAway) finalHome += 1;

          const ratio = simulatedMatchMins / 90;
          homeScore = Math.floor(finalHome * ratio);
          awayScore = Math.floor(finalAway * ratio);
        }

        // Simulate live statistics
        const progressRatio = simulatedMatchMins / 90;
        const baseStats = fixture.stats || {
          homePossession: 50 + (fixture.matchNumber % 10) - 5,
          awayPossession: 100 - (50 + (fixture.matchNumber % 10) - 5),
          homeShotsOnTarget: 4,
          awayShotsOnTarget: 3,
          homeTotalShots: 9,
          awayTotalShots: 7,
          homeCorners: 5,
          awayCorners: 4,
        };

        stats = {
          homePossession: baseStats.homePossession,
          awayPossession: baseStats.awayPossession,
          homeShotsOnTarget: Math.round(baseStats.homeShotsOnTarget * progressRatio),
          awayShotsOnTarget: Math.round(baseStats.awayShotsOnTarget * progressRatio),
          homeTotalShots: Math.round(baseStats.homeTotalShots * progressRatio),
          awayTotalShots: Math.round(baseStats.awayTotalShots * progressRatio),
          homeCorners: Math.round(baseStats.homeCorners * progressRatio),
          awayCorners: Math.round(baseStats.awayCorners * progressRatio),
        };
      }
    } else { // COMPLETED
      displayClock = fixture.displayClock || undefined;
      if (fixture.homeScore !== undefined && fixture.awayScore !== undefined) {
        homeScore = fixture.homeScore;
        awayScore = fixture.awayScore;
      } else {
        const homeLen = fixture.homeTeam ? fixture.homeTeam.length : 0;
        const awayLen = fixture.awayTeam ? fixture.awayTeam.length : 0;
        let finalHome = (fixture.matchNumber * 3 + homeLen) % 4;
        const finalAway = (fixture.matchNumber * 7 + awayLen) % 3;
        if (fixture.stage === 'final' && finalHome === finalAway) finalHome += 1;
        homeScore = finalHome;
        awayScore = finalAway;
      }
      goals = fixture.goals || [];
      stats = fixture.stats;
    }

    const homeInfo = getTeamInfo(fixture.homeTeam);
    const awayInfo = getTeamInfo(fixture.awayTeam);

    return {
      ...fixture,
      status,
      homeScore,
      awayScore,
      homeFlag: homeInfo.flag,
      awayFlag: awayInfo.flag,
      homeCode: homeInfo.code,
      awayCode: awayInfo.code,
      displayClock,
      goals,
      stats,
      formattedTimeJerusalem: formatJerusalemTime(fixture.kickoffUtc),
      formattedDateJerusalem: formatJerusalemDate(fixture.kickoffUtc),
    };
  });
};

export const getNextThreeUpcoming = (systemTimeStr: string, rawFixturesInput?: Fixture[]): ProcessedMatch[] => {
  const matches = getProcessedMatches(systemTimeStr, rawFixturesInput);
  return matches
    .filter((m) => m.status === 'UPCOMING')
    .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
    .slice(0, 3);
};

/* ─────────────────────────────────────────────────────────────────────────────
   TOURNAMENT STATS AGGREGATOR
   Calculates per-match averages for a given team across all COMPLETED games.
   Stats sourced from the ESPN `stats` payload when available, and from the
   goals array otherwise. Safe to call client-side — pure function, no I/O.
───────────────────────────────────────────────────────────────────────────── */
export interface TournamentTeamStats {
  teamName: string;
  gamesPlayed: number;
  avgPossession: number;        // %
  avgGoalsScored: number;
  avgGoalsConceded: number;
  avgShotsOnTarget: number;
  avgCorners: number;
  /** Radar-ready array — each element maps to one axis */
  radarData: { metric: string; value: number; fullMark: number }[];
  /** Outcome string W/D/L for last 5 matches sorted chronologically ascending */
  recentForm: ('W' | 'D' | 'L')[];
}

export function calculateTournamentStats(
  teamName: string,
  allMatches: ProcessedMatch[]
): TournamentTeamStats {
  const played = allMatches.filter(
    (m) =>
      m.status === 'COMPLETED' &&
      !isPlaceholderTeam(m.homeTeam) &&
      !isPlaceholderTeam(m.awayTeam) &&
      (normalizeTeamName(m.homeTeam) === normalizeTeamName(teamName) ||
       normalizeTeamName(m.awayTeam) === normalizeTeamName(teamName))
  );

  if (played.length === 0) {
    return {
      teamName,
      gamesPlayed: 0,
      avgPossession: 0,
      avgGoalsScored: 0,
      avgGoalsConceded: 0,
      avgShotsOnTarget: 0,
      avgCorners: 0,
      radarData: [],
      recentForm: [],
    };
  }

  let totalPossession = 0;
  let totalGoalsScored = 0;
  let totalGoalsConceded = 0;
  let totalShotsOnTarget = 0;
  let totalCorners = 0;
  let matchesWithStats = 0;

  for (const m of played) {
    const isHome = normalizeTeamName(m.homeTeam) === normalizeTeamName(teamName);

    // Goals from actual scores
    const scored    = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const conceded  = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    totalGoalsScored   += scored;
    totalGoalsConceded += conceded;

    // ESPN stats (only available for matches that had live coverage)
    if (m.stats) {
      matchesWithStats++;
      totalPossession    += isHome ? m.stats.homePossession    : m.stats.awayPossession;
      totalShotsOnTarget += isHome ? m.stats.homeShotsOnTarget : m.stats.awayShotsOnTarget;
      totalCorners       += isHome ? m.stats.homeCorners       : m.stats.awayCorners;
    }
  }

  const n = played.length;
  const sn = matchesWithStats || 1; // avoid divide-by-zero when no ESPN data

  const avgPossession    = matchesWithStats > 0 ? totalPossession    / sn : 50;
  const avgShotsOnTarget = matchesWithStats > 0 ? totalShotsOnTarget / sn : 0;
  const avgCorners       = matchesWithStats > 0 ? totalCorners       / sn : 0;
  const avgGoalsScored   = totalGoalsScored   / n;
  const avgGoalsConceded = totalGoalsConceded / n;

  // Extract recent form (last 5 completed matches sorted chronologically ascending)
  const sortedPlayed = [...played].sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());
  const lastFive = sortedPlayed.slice(-5);
  const recentForm = lastFive.map((m) => {
    const isHome = normalizeTeamName(m.homeTeam) === normalizeTeamName(teamName);
    const scoreSelf = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const scoreOpp = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    if (scoreSelf > scoreOpp) return 'W' as const;
    if (scoreSelf < scoreOpp) return 'L' as const;
    if (m.shootoutScore) {
      const shootSelf = isHome ? m.shootoutScore.home : m.shootoutScore.away;
      const shootOpp = isHome ? m.shootoutScore.away : m.shootoutScore.home;
      return shootSelf > shootOpp ? ('W' as const) : ('L' as const);
    }
    return 'D' as const;
  });

  return {
    teamName,
    gamesPlayed: n,
    avgPossession:    Math.round(avgPossession    * 10) / 10,
    avgGoalsScored:   Math.round(avgGoalsScored   * 100) / 100,
    avgGoalsConceded: Math.round(avgGoalsConceded * 100) / 100,
    avgShotsOnTarget: Math.round(avgShotsOnTarget * 10)  / 10,
    avgCorners:       Math.round(avgCorners       * 10)  / 10,
    radarData: [
      { metric: 'Possession',   value: Math.round(avgPossession    * 10) / 10, fullMark: 80  },
      { metric: 'Goals Scored', value: Math.round(avgGoalsScored   * 10) / 10, fullMark: 4   },
      { metric: 'Defense',      value: Math.round((4 - Math.min(avgGoalsConceded, 4)) * 10) / 10, fullMark: 4 },
      { metric: 'Shots on Tgt', value: Math.round(avgShotsOnTarget * 10) / 10, fullMark: 10  },
      { metric: 'Corners',      value: Math.round(avgCorners       * 10) / 10, fullMark: 8   },
    ],
    recentForm,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Poisson-based Match Outcome Prediction
   Calculates win / draw / loss probabilities using a simplified Poisson model.
───────────────────────────────────────────────────────────────────────────── */
export interface MatchupProbabilities {
  teamA: number; // whole-number percentage (e.g. 45)
  draw: number;
  teamB: number;
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

const poisson = (k: number, lambda: number): number =>
  (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);

export function calculateMatchupProbabilities(
  teamAStats: TournamentTeamStats,
  teamBStats: TournamentTeamStats
): MatchupProbabilities {
  // Step A — Expected goals (lambda) for each side
  const rawLambdaA = (teamAStats.avgGoalsScored + teamBStats.avgGoalsConceded) / 2;
  const rawLambdaB = (teamBStats.avgGoalsScored + teamAStats.avgGoalsConceded) / 2;
  const lambdaA = rawLambdaA || 0.1; // fallback to prevent math errors
  const lambdaB = rawLambdaB || 0.1;

  // Step B — Build the scoreline probability matrix (0-5 goals each)
  let probA = 0;
  let probDraw = 0;
  let probB = 0;

  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      const matchProb = poisson(i, lambdaA) * poisson(j, lambdaB);
      if (i > j) probA += matchProb;
      else if (i === j) probDraw += matchProb;
      else probB += matchProb;
    }
  }

  // Normalise so the three values sum to 100
  const total = probA + probDraw + probB;
  const normA = Math.round((probA / total) * 100);
  const normB = Math.round((probB / total) * 100);
  const normDraw = 100 - normA - normB; // remainder avoids rounding drift

  return { teamA: normA, draw: normDraw, teamB: normB };
}

export interface StandingTeam {
  position: number;
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface StandingGroup {
  groupName: string;
  table: StandingTeam[];
}

export function calculateGroupStandings(
  systemTimeStr: string,
  groupLetter: string,
  rawFixturesInput?: Fixture[]
): StandingGroup | null {
  if (!groupLetter) return null;

  const matches = getProcessedMatches(systemTimeStr, rawFixturesInput);
  
  // Find all matches belonging to this group
  const groupMatches = matches.filter(
    (m) => m.stage === "group-stage" && m.group && m.group.toUpperCase() === groupLetter.toUpperCase()
  );

  if (groupMatches.length === 0) return null;

  // Extract unique teams in this group
  const teamsSet = new Set<string>();
  groupMatches.forEach((m) => {
    if (m.homeTeam) teamsSet.add(m.homeTeam);
    if (m.awayTeam) teamsSet.add(m.awayTeam);
  });
  const teams = Array.from(teamsSet);

  // Initialize stats for each team
  const tableMap: Record<string, StandingTeam> = {};
  teams.forEach((t, index) => {
    const info = getTeamInfo(t);
    tableMap[t] = {
      position: 0,
      team: {
        id: index + 1,
        name: t,
        shortName: t,
        tla: info.code,
        crest: "",
      },
      playedGames: 0,
      won: 0,
      draw: 0,
      lost: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    };
  });

  // Accumulate stats from completed group matches
  const completedGroupMatches = groupMatches.filter((m) => m.status === "COMPLETED");

  completedGroupMatches.forEach((m) => {
    const home = m.homeTeam;
    const away = m.awayTeam;
    const homeS = m.homeScore ?? 0;
    const awayS = m.awayScore ?? 0;

    if (tableMap[home] && tableMap[away]) {
      tableMap[home].playedGames += 1;
      tableMap[away].playedGames += 1;
      tableMap[home].goalsFor += homeS;
      tableMap[home].goalsAgainst += awayS;
      tableMap[away].goalsFor += awayS;
      tableMap[away].goalsAgainst += homeS;

      if (homeS > awayS) {
        tableMap[home].won += 1;
        tableMap[home].points += 3;
        tableMap[away].lost += 1;
      } else if (homeS < awayS) {
        tableMap[away].won += 1;
        tableMap[away].points += 3;
        tableMap[home].lost += 1;
      } else {
        tableMap[home].draw += 1;
        tableMap[home].points += 1;
        tableMap[away].draw += 1;
        tableMap[away].points += 1;
      }
    }
  });

  // Calculate goal differences
  teams.forEach((t) => {
    tableMap[t].goalDifference = tableMap[t].goalsFor - tableMap[t].goalsAgainst;
  });

  // Sort teams by points desc, goalDifference desc, goalsFor desc, then name asc
  const sortedTeams = teams.map((t) => tableMap[t]).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.name.localeCompare(b.team.name);
  });

  // Assign positions
  sortedTeams.forEach((item, index) => {
    item.position = index + 1;
  });

  return {
    groupName: `Group ${groupLetter.toUpperCase()}`,
    table: sortedTeams,
  };
}

