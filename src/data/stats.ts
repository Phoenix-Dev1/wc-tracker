import { ProcessedMatch, TournamentTeamStats, MatchupProbabilities, KnockoutProbabilities, ScorelinePrediction } from "./types";
import { normalizeTeamName, isPlaceholderTeam } from "./teams";

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

const poisson = (k: number, lambda: number): number =>
  (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);

const TEAM_ELO: Record<string, number> = {
  "argentina": 2120,
  "france": 2100,
  "brazil": 2080,
  "spain": 2050,
  "england": 2040,
  "portugal": 2020,
  "netherlands": 2000,
  "belgium": 1980,
  "uruguay": 1950,
  "germany": 1940,
  "croatia": 1930,
  "colombia": 1925,
  "morocco": 1920,
  "japan": 1900,
  "switzerland": 1880,
  "united states": 1870,
  "mexico": 1850,
  "senegal": 1840,
  "austria": 1830,
  "sweden": 1820,
  "ir iran": 1800,
  "korea republic": 1780,
  "turkiye": 1770,
  "australia": 1765,
  "norway": 1760,
  "czechia": 1750,
  "scotland": 1740,
  "canada": 1720,
  "ecuador": 1730,
  "egypt": 1720,
  "algeria": 1715,
  "tunisia": 1710,
  "cote d'ivoire": 1700,
  "ghana": 1680,
  "panama": 1660,
  "cabo verde": 1650,
  "bosnia and herzegovina": 1640,
  "saudi arabia": 1630,
  "south africa": 1620,
  "iraq": 1610,
  "uzbekistan": 1600,
  "paraguay": 1590,
  "qatar": 1580,
  "jordan": 1570,
  "congo dr": 1550,
  "haiti": 1520,
  "curacao": 1500,
  "new zealand": 1480
};

const ELO_VALUES = Object.values(TEAM_ELO);
const AVERAGE_TOURNAMENT_ELO = ELO_VALUES.reduce((a, b) => a + b, 0) / ELO_VALUES.length;

const HOST_NATIONS = ["united states", "mexico", "canada"];
const HOST_BOOST_MULTIPLIER = 1.10;
const VISITOR_PENALTY_MULTIPLIER = 0.95;
const PK_VARIANCE_WEIGHT = 0.30;

export function calculateTournamentStats(
  teamName: string,
  allMatches: ProcessedMatch[],
  referenceDateStr?: string
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

  // Determine reference time for decay (recency bias)
  const completed = allMatches.filter(m => m.status === 'COMPLETED');
  const refTimeMs = referenceDateStr
    ? new Date(referenceDateStr).getTime()
    : completed.length > 0
      ? Math.max(...completed.map(m => new Date(m.kickoffUtc).getTime()))
      : new Date("2026-06-23T19:52:14+03:00").getTime();

  const alpha = 0.005;

  let totalWeight = 0;
  let weightedGoalsScored = 0;
  let weightedGoalsConceded = 0;

  let totalPossession = 0;
  let totalShotsOnTarget = 0;
  let totalCorners = 0;
  let matchesWithStats = 0;

  for (const m of played) {
    const isHome = normalizeTeamName(m.homeTeam) === normalizeTeamName(teamName);
    const opponent = isHome ? m.awayTeam : m.homeTeam;

    // 1. Cap Outlier Matches (blowouts capped at 4)
    const rawScored = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const rawConceded = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    const cappedScored = Math.min(4, rawScored);
    const cappedConceded = Math.min(4, rawConceded);

    // 2. Opponent Strength (Elo) Modifier with Dampening Exponent (0.5)
    const opponentElo = TEAM_ELO[normalizeTeamName(opponent)] || 1600;
    const eloModifier = Math.pow(opponentElo / AVERAGE_TOURNAMENT_ELO, 0.5);

    // Scored goals against stronger teams are magnified, weaker ones shrunk
    const adjustedScored = cappedScored * eloModifier;
    // Conceded goals against weaker teams are magnified, stronger ones shrunk
    const adjustedConceded = cappedConceded * (1 / eloModifier);

    // 3. Time Decay (Recency Bias)
    const matchTimeMs = new Date(m.kickoffUtc).getTime();
    const diffDays = Math.max(0, (refTimeMs - matchTimeMs) / (1000 * 60 * 60 * 24));
    const weight = Math.exp(-alpha * diffDays);

    weightedGoalsScored += adjustedScored * weight;
    weightedGoalsConceded += adjustedConceded * weight;
    totalWeight += weight;

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

  // Normalized time-decayed expected ratings
  const avgGoalsScored   = totalWeight > 0 ? weightedGoalsScored / totalWeight : 0;
  const avgGoalsConceded = totalWeight > 0 ? weightedGoalsConceded / totalWeight : 0;

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

export function calculateMatchupProbabilities(
  teamAStats: TournamentTeamStats,
  teamBStats: TournamentTeamStats,
  allMatches: ProcessedMatch[]
): MatchupProbabilities {
  // Step A — Calculate Base Rate (average goals scored per team per match)
  const completedMatches = allMatches.filter(
    (m) =>
      m.status === 'COMPLETED' &&
      !isPlaceholderTeam(m.homeTeam) &&
      !isPlaceholderTeam(m.awayTeam)
  );

  let totalGoals = 0;
  for (const m of completedMatches) {
    totalGoals += (m.homeScore ?? 0) + (m.awayScore ?? 0);
  }

  const baseRate = completedMatches.length > 0
    ? totalGoals / (2 * completedMatches.length)
    : 1.35;

  // Step B — Expected goals (lambda) for each side using Relative Strengths
  let lambdaA = Math.max(0.1, (teamAStats.avgGoalsScored * teamBStats.avgGoalsConceded) / baseRate);
  let lambdaB = Math.max(0.1, (teamBStats.avgGoalsScored * teamAStats.avgGoalsConceded) / baseRate);

  const nameA = normalizeTeamName(teamAStats.teamName);
  const nameB = normalizeTeamName(teamBStats.teamName);
  const isAHost = HOST_NATIONS.includes(nameA);
  const isBHost = HOST_NATIONS.includes(nameB);

  // Apply Home Field Advantage (HFA) if only one team is host (they cancel out if both are hosts)
  if (isAHost && !isBHost) {
    lambdaA *= HOST_BOOST_MULTIPLIER;
    lambdaB *= VISITOR_PENALTY_MULTIPLIER;
  } else if (isBHost && !isAHost) {
    lambdaB *= HOST_BOOST_MULTIPLIER;
    lambdaA *= VISITOR_PENALTY_MULTIPLIER;
  }

  // Step C — Build the scoreline probability matrix (0-5 goals each) with Dixon-Coles adjustment
  let probA = 0;
  let probDraw = 0;
  let probB = 0;

  const rho = -0.13;

  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      let tau = 1;
      if (i === 0 && j === 0) tau = Math.max(0, 1 - (lambdaA * lambdaB * rho));
      else if (i === 0 && j === 1) tau = Math.max(0, 1 + (lambdaA * rho));
      else if (i === 1 && j === 0) tau = Math.max(0, 1 + (lambdaB * rho));
      else if (i === 1 && j === 1) tau = Math.max(0, 1 - rho);

      const matchProb = tau * poisson(i, lambdaA) * poisson(j, lambdaB);
      if (i > j) probA += matchProb;
      else if (i === j) probDraw += matchProb;
      else probB += matchProb;
    }
  }

  // Normalise so the three values sum to 100
  const total = probA + probDraw + probB;
  if (total === 0) return { teamA: 33, draw: 34, teamB: 33 };

  const normA = Math.round((probA / total) * 100);
  const normB = Math.round((probB / total) * 100);
  const normDraw = 100 - normA - normB; // remainder avoids rounding drift

  return { teamA: normA, draw: normDraw, teamB: normB };
}

export function calculateKnockoutProbabilities(
  probs: MatchupProbabilities
): KnockoutProbabilities {
  const winTotal = probs.teamA + probs.teamB;
  if (winTotal === 0) return { teamA: 50, teamB: 50 };

  // Split draw absorption: 70% extra time (strength-weighted) + 30% penalties (50/50 split)
  // Regressing PK variance to the mean
  const strengthShare = probs.teamA / winTotal;
  const penaltyShare = 0.50;

  const redistributionFactor = (1 - PK_VARIANCE_WEIGHT) * strengthShare + PK_VARIANCE_WEIGHT * penaltyShare;

  const koA = Math.round(probs.teamA + probs.draw * redistributionFactor);
  const koB = 100 - koA; // remainder avoids rounding drift
  return { teamA: koA, teamB: koB };
}

export function generateScorelinePredictions(
  homeTeamName: string,
  awayTeamName: string,
  allMatches: ProcessedMatch[],
  topN: number = 5
): ScorelinePrediction[] {
  const homeStats = calculateTournamentStats(homeTeamName, allMatches);
  const awayStats = calculateTournamentStats(awayTeamName, allMatches);

  // Need completed games for both teams to generate meaningful predictions
  if (homeStats.gamesPlayed === 0 || awayStats.gamesPlayed === 0) return [];

  // Calculate Base Rate
  const completedMatches = allMatches.filter(
    (m) =>
      m.status === 'COMPLETED' &&
      !isPlaceholderTeam(m.homeTeam) &&
      !isPlaceholderTeam(m.awayTeam)
  );

  let totalGoals = 0;
  for (const m of completedMatches) {
    totalGoals += (m.homeScore ?? 0) + (m.awayScore ?? 0);
  }

  const baseRate = completedMatches.length > 0
    ? totalGoals / (2 * completedMatches.length)
    : 1.35;

  // Derive expected goals (lambda) for each side using Relative Strengths
  let lambdaHome = Math.max(0.1, (homeStats.avgGoalsScored * awayStats.avgGoalsConceded) / baseRate);
  let lambdaAway = Math.max(0.1, (awayStats.avgGoalsScored * homeStats.avgGoalsConceded) / baseRate);

  const nameHome = normalizeTeamName(homeTeamName);
  const nameAway = normalizeTeamName(awayTeamName);
  const isHomeHost = HOST_NATIONS.includes(nameHome);
  const isAwayHost = HOST_NATIONS.includes(nameAway);

  // Apply Home Field Advantage (HFA) if only one team is host (they cancel out if both are hosts)
  if (isHomeHost && !isAwayHost) {
    lambdaHome *= HOST_BOOST_MULTIPLIER;
    lambdaAway *= VISITOR_PENALTY_MULTIPLIER;
  } else if (isAwayHost && !isHomeHost) {
    lambdaAway *= HOST_BOOST_MULTIPLIER;
    lambdaHome *= VISITOR_PENALTY_MULTIPLIER;
  }

  const rho = -0.13;

  // Build 0-4 × 0-4 scoreline matrix with Dixon-Coles adjustment
  const scorelines: ScorelinePrediction[] = [];
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      let tau = 1;
      if (h === 0 && a === 0) tau = Math.max(0, 1 - (lambdaHome * lambdaAway * rho));
      else if (h === 0 && a === 1) tau = Math.max(0, 1 + (lambdaHome * rho));
      else if (h === 1 && a === 0) tau = Math.max(0, 1 + (lambdaAway * rho));
      else if (h === 1 && a === 1) tau = Math.max(0, 1 - rho);

      const prob = tau * poisson(h, lambdaHome) * poisson(a, lambdaAway) * 100;
      scorelines.push({ home: h, away: a, probability: Math.round(prob * 10) / 10 });
    }
  }

  // Sort by probability descending, return top N
  scorelines.sort((a, b) => b.probability - a.probability);
  return scorelines.slice(0, topN);
}

export interface GoalLeader {
  rank: number;
  name: string;
  team: string;
  count: number;
}

export function getGoalLeaders(matches: ProcessedMatch[]): GoalLeader[] {
  const goalCounts: Record<string, { name: string; team: string; count: number }> = {};

  matches.forEach((m) => {
    if ((m.status === "COMPLETED" || m.status === "LIVE") && m.goals) {
      m.goals.forEach((g) => {
        if (g.type === "OWN") return;
        const key = `${g.scorer}_${g.team}`;
        if (!goalCounts[key]) {
          goalCounts[key] = {
            name: g.scorer,
            team: g.team,
            count: 0,
          };
        }
        goalCounts[key].count++;
      });
    }
  });

  const sortedList = Object.values(goalCounts)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

  const leaders: GoalLeader[] = [];
  let currentRank = 1;
  let prevCount = -1;

  sortedList.forEach((item, idx) => {
    if (idx > 0 && item.count < prevCount) {
      currentRank = idx + 1;
    }
    leaders.push({
      rank: currentRank,
      name: item.name,
      team: item.team,
      count: item.count,
    });
    prevCount = item.count;
  });

  return leaders;
}

