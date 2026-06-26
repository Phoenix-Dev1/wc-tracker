import fixturesData from "./fixtures.json";

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
  const rawFixtures = [...(rawFixturesInput || fixturesData.fixtures)] as Fixture[];

  // Sort raw fixtures chronologically by kickoffUtc ascending before processing
  rawFixtures.sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());

  return rawFixtures.map((fixture) => {
    const kickoffTime = new Date(fixture.kickoffUtc).getTime();
    const durationMs = 105 * 60 * 1000; // 105 minutes (90 mins + halftime + added time)
    const timeDiff = systemTime - kickoffTime;

    const isHomePlaceholder = isPlaceholderTeam(fixture.homeTeam);
    const isAwayPlaceholder = isPlaceholderTeam(fixture.awayTeam);
    const isKnockoutPlaceholder = isHomePlaceholder || isAwayPlaceholder;

    let status: 'COMPLETED' | 'LIVE' | 'UPCOMING' = 'UPCOMING';
    let displayClock: string | undefined;
    let homeScore: number | undefined;
    let awayScore: number | undefined;

    // Determine Status
    if (isKnockoutPlaceholder) {
      status = 'UPCOMING';
    } else if (fixture.apiStatus) {
      // Handle our normalized statuses (mapped from ESPN 'pre', 'in', 'post' or legacy FINISHED/IN_PLAY)
      if (fixture.apiStatus === 'COMPLETED' || fixture.apiStatus === 'FINISHED') {
        status = 'COMPLETED';
      } else if (fixture.apiStatus === 'LIVE' || fixture.apiStatus === 'IN_PLAY' || fixture.apiStatus === 'PAUSED') {
        status = 'LIVE';
        displayClock = fixture.displayClock; // pass through from server exactly as-is
      } else {
        // Fallback for UPCOMING or unknown
        if (timeDiff >= durationMs) {
          status = 'COMPLETED';
        } else if (timeDiff >= 0) {
          status = 'LIVE';
        } else {
          status = 'UPCOMING';
        }
      }
    } else {
      if (timeDiff >= durationMs) {
        status = 'COMPLETED';
      } else if (timeDiff >= 0) {
        status = 'LIVE';
      } else {
        status = 'UPCOMING';
      }
    }

    // Generate deterministic scores for COMPLETED or LIVE matches
    // This uses a simple hash of matchNumber and team name lengths so it stays identical on refresh.
    if (status === 'COMPLETED' || status === 'LIVE') {
      if (fixture.homeScore !== undefined && fixture.awayScore !== undefined) {
        homeScore = fixture.homeScore;
        awayScore = fixture.awayScore;
      } else {
        const homeLen = fixture.homeTeam ? fixture.homeTeam.length : 0;
        const awayLen = fixture.awayTeam ? fixture.awayTeam.length : 0;
        
        // Let's create a realistic score distribution
        let finalHome = (fixture.matchNumber * 3 + homeLen) % 4;
        const finalAway = (fixture.matchNumber * 7 + awayLen) % 3;

        // Make finals/semis higher stakes or avoid extreme patterns
        if (fixture.stage === 'final' && finalHome === finalAway) {
          finalHome += 1; // avoid draw in final after full time
        }

        if (status === 'COMPLETED') {
          homeScore = finalHome;
          awayScore = finalAway;
        } else {
          // Live score updates based on match progression
          const elapsedMins = displayClock === 'HT' ? 45 : parseInt(displayClock || "0") || 0;
          const ratio = Math.min(1, elapsedMins / 90);
          homeScore = Math.floor(finalHome * ratio);
          awayScore = Math.floor(finalAway * ratio);
        }
      }
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
