import { Fixture, ProcessedMatch, Goal, MatchStats } from "./types";
import { isPlaceholderTeam, getTeamInfo, normalizeTeamName } from "./teams";
import { formatJerusalemTime, formatJerusalemDate } from "./helpers";
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
