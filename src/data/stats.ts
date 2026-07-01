import { ProcessedMatch, TournamentTeamStats, MatchupProbabilities, KnockoutProbabilities, ScorelinePrediction } from "./types";
import { normalizeTeamName, isPlaceholderTeam } from "./teams";

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

const poisson = (k: number, lambda: number): number =>
  (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);

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

export function calculateKnockoutProbabilities(
  probs: MatchupProbabilities
): KnockoutProbabilities {
  // Redistribute draw % proportionally based on each team's win share
  const winTotal = probs.teamA + probs.teamB;
  if (winTotal === 0) return { teamA: 50, teamB: 50 };

  const koA = Math.round(probs.teamA + probs.draw * (probs.teamA / winTotal));
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

  // Derive expected goals (lambda) for each side
  const lambdaHome = (homeStats.avgGoalsScored + awayStats.avgGoalsConceded) / 2 || 0.1;
  const lambdaAway = (awayStats.avgGoalsScored + homeStats.avgGoalsConceded) / 2 || 0.1;

  // Build 0-4 × 0-4 scoreline matrix
  const scorelines: ScorelinePrediction[] = [];
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      const prob = poisson(h, lambdaHome) * poisson(a, lambdaAway) * 100;
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

