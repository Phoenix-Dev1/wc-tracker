import { Fixture, ProcessedMatch, Goal, MatchStats, StandingGroup } from "./types";
import { isPlaceholderTeam, getTeamInfo, normalizeTeamName } from "./teams";
import { formatJerusalemTime, formatJerusalemDate } from "./helpers";
import { calculateGroupStandingsFromMatches } from "./standings";
import fixturesData from "./fixtures.json";
import simulationDb from "./simulation-database.json";

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

  const processed = rawFixtures.map((fixture) => {
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
  return resolveKnockoutPlaceholders(processed, systemTimeStr);
};

export const getNextThreeUpcoming = (systemTimeStr: string, rawFixturesInput?: Fixture[]): ProcessedMatch[] => {
  const matches = getProcessedMatches(systemTimeStr, rawFixturesInput);
  return matches
    .filter((m) => m.status === 'UPCOMING')
    .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
    .slice(0, 3);
};

// Helper function to resolve placeholders dynamically based on simulation time
export const resolveKnockoutPlaceholders = (
  matches: ProcessedMatch[],
  systemTimeStr: string
): ProcessedMatch[] => {
  const groupLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const groupStandings: Record<string, StandingGroup | null> = {};
  groupLetters.forEach((letter) => {
    groupStandings[letter] = calculateGroupStandingsFromMatches(matches, letter);
  });

  const getMatchWinner = (match: ProcessedMatch): string | null => {
    if (match.status !== "COMPLETED") return null;
    const homeS = match.homeScore ?? 0;
    const awayS = match.awayScore ?? 0;
    if (homeS > awayS) return match.homeTeam;
    if (homeS < awayS) return match.awayTeam;
    if (match.shootoutScore) {
      if (match.shootoutScore.home > match.shootoutScore.away) return match.homeTeam;
      return match.awayTeam;
    }
    return match.homeTeam;
  };

  const getMatchLoser = (match: ProcessedMatch): string | null => {
    if (match.status !== "COMPLETED") return null;
    const homeS = match.homeScore ?? 0;
    const awayS = match.awayScore ?? 0;
    if (homeS < awayS) return match.homeTeam;
    if (homeS > awayS) return match.awayTeam;
    if (match.shootoutScore) {
      if (match.shootoutScore.home < match.shootoutScore.away) return match.homeTeam;
      return match.awayTeam;
    }
    return match.awayTeam;
  };

  const getGroupTeam = (group: string, rank: 1 | 2): string | null => {
    const standings = groupStandings[group.toUpperCase()];
    if (!standings || !standings.table || standings.table.length < 2) return null;
    const entry = standings.table[rank - 1];
    return entry ? entry.team.name : null;
  };

  const resolvedMatches = matches.map(m => ({ ...m }));

  resolvedMatches.forEach((m) => {
    if (m.matchNumber >= 73) {
      if (isPlaceholderTeam(m.homeTeam)) {
        const oldHome = m.homeTeam;
        const resolved = resolveTeamName(m.homeTeam, resolvedMatches, m.matchNumber);
        if (resolved) {
          m.homeTeam = resolved;
          const info = getTeamInfo(resolved);
          m.homeFlag = info.flag;
          m.homeCode = info.code;
          // Update corresponding goal team names
          if (m.goals) {
            m.goals.forEach((g) => {
              if (g.team === oldHome) {
                g.team = resolved;
              }
            });
          }
        }
      }
      if (isPlaceholderTeam(m.awayTeam)) {
        const oldAway = m.awayTeam;
        const resolved = resolveTeamName(m.awayTeam, resolvedMatches, m.matchNumber);
        if (resolved) {
          m.awayTeam = resolved;
          const info = getTeamInfo(resolved);
          m.awayFlag = info.flag;
          m.awayCode = info.code;
          // Update corresponding goal team names
          if (m.goals) {
            m.goals.forEach((g) => {
              if (g.team === oldAway) {
                g.team = resolved;
              }
            });
          }
        }
      }

      const isHomePlaceholder = isPlaceholderTeam(m.homeTeam);
      const isAwayPlaceholder = isPlaceholderTeam(m.awayTeam);
      if (!isHomePlaceholder && !isAwayPlaceholder) {
        const systemTime = new Date(systemTimeStr).getTime();
        const kickoffTime = new Date(m.kickoffUtc).getTime();
        const durationMs = 120 * 60 * 1000;
        const timeDiff = systemTime - kickoffTime;

        if (timeDiff < 0) {
          m.status = 'UPCOMING';
          m.homeScore = undefined;
          m.awayScore = undefined;
          m.goals = [];
          m.stats = undefined;
        } else if (timeDiff < durationMs) {
          m.status = 'LIVE';
        } else {
          m.status = 'COMPLETED';
        }

        if (m.status === 'COMPLETED' && m.homeScore === undefined) {
          const homeLen = m.homeTeam ? m.homeTeam.length : 0;
          const awayLen = m.awayTeam ? m.awayTeam.length : 0;
          let finalHome = (m.matchNumber * 3 + homeLen) % 4;
          const finalAway = (m.matchNumber * 7 + awayLen) % 3;
          if (m.stage === 'final' && finalHome === finalAway) finalHome += 1;
          m.homeScore = finalHome;
          m.awayScore = finalAway;
          m.goals = [];
          m.stats = {
            homePossession: 50,
            awayPossession: 50,
            homeShotsOnTarget: 4,
            awayShotsOnTarget: 3,
            homeTotalShots: 10,
            awayTotalShots: 8,
            homeCorners: 5,
            awayCorners: 4
          };
          if (m.homeScore === m.awayScore) {
            m.shootoutScore = {
              home: m.matchNumber % 2 === 0 ? 4 : 3,
              away: m.matchNumber % 2 === 0 ? 3 : 4
            };
          }
        }
      }
    }
  });

  return resolvedMatches;

  function resolveTeamName(placeholder: string, currentMatches: ProcessedMatch[], currentMatchNum: number): string | null {
    const clean = placeholder.trim().toLowerCase();
    
    if (clean.startsWith("winner match")) {
      const matchNum = parseInt(clean.replace("winner match", "").trim(), 10);
      if (!isNaN(matchNum)) {
        const found = currentMatches.find(x => x.matchNumber === matchNum);
        if (found) return getMatchWinner(found);
      }
    }
    
    if (clean.startsWith("loser match")) {
      const matchNum = parseInt(clean.replace("loser match", "").trim(), 10);
      if (!isNaN(matchNum)) {
        const found = currentMatches.find(x => x.matchNumber === matchNum);
        if (found) return getMatchLoser(found);
      }
    }

    if (clean.startsWith("group ") && (clean.endsWith("winners") || clean.endsWith("runners-up"))) {
      const parts = clean.split(" ");
      const groupLetter = parts[1];
      const rank = clean.endsWith("winners") ? 1 : 2;
      return getGroupTeam(groupLetter, rank);
    }

    if (clean.includes("third place")) {
      const groupsMentioned = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"]
        .filter(g => clean.includes(g));

      const thirdPlaceTeams: { team: string; points: number; gd: number; gf: number }[] = [];
      groupsMentioned.forEach(g => {
        const standings = groupStandings[g.toUpperCase()];
        if (standings && standings.table && standings.table.length >= 3) {
          const t = standings.table[2];
          thirdPlaceTeams.push({
            team: t.team.name,
            points: t.points,
            gd: t.goalDifference,
            gf: t.goalsFor
          });
        }
      });

      if (thirdPlaceTeams.length > 0) {
        thirdPlaceTeams.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        });

        for (const candidate of thirdPlaceTeams) {
          const teamName = candidate.team;
          const alreadyUsed = currentMatches.some(m => 
            m.matchNumber >= 73 && 
            m.matchNumber < currentMatchNum &&
            (m.homeTeam === teamName || m.awayTeam === teamName)
          );
          if (!alreadyUsed) {
            return teamName;
          }
        }
        return thirdPlaceTeams[0].team;
      }
    }

    return null;
  }
};
