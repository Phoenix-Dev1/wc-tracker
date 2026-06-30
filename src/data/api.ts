import { Fixture, EspnEventDetail } from "./types";
import { normalizeTeamName, isPlaceholderTeam } from "./teams";
import { parseEspnGoals } from "./helpers";
import localFixtures from "./fixtures.json";

const STATS_API_URL = "https://www.thestatsapi.com/world-cup/data/fixtures.json";
const REAL_ESPN_API_URL = process.env.REAL_ESPN_API_URL || "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=150";
const MOCK_ESPN_API_URL = process.env.MOCK_ESPN_API_URL || "http://localhost:3000/api/mock-espn";

export interface EspnApiEvent {
  date: string;
  status: {
    clock: number;
    displayClock: string;
    type: {
      name?: string;
      state: "pre" | "in" | "post";
    };
  };
  competitions: {
    competitors: {
      homeAway: "home" | "away";
      score: string;
      shootoutScore?: string;
      team: {
        id: string;
        name: string;
      };
      statistics?: { name: string; displayValue: string }[];
    }[];
    details?: EspnEventDetail[];
  }[];
}

export async function fetchFixtures(isMock?: boolean): Promise<Fixture[]> {
  let fixtures: Fixture[] = [];
  const apiUrl = isMock ? MOCK_ESPN_API_URL : REAL_ESPN_API_URL;

  // Step 1: Fetch fixtures schedule from thestatsapi
  try {
    const res = await fetch(STATS_API_URL, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.fixtures)) {
        fixtures = data.fixtures as Fixture[];
      }
    }
  } catch (error) {
    console.error("Failed to fetch schedule from Stats API:", error);
  }

  // Fall back to local fixtures if Stats API is down
  if (fixtures.length === 0) {
    fixtures = JSON.parse(JSON.stringify(localFixtures.fixtures)) as Fixture[];
  }

  // Step 2: Fetch matches scores from ESPN Scoreboard API and merge
  try {
    const res = await fetch(apiUrl, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const apiEvents = data.events as EspnApiEvent[];
      
      if (Array.isArray(apiEvents)) {
        // Merge scores into the schedule fixtures
        fixtures = fixtures.map((lf) => {
          // Find matching API match by time and team validation
          const am = apiEvents.find((m) => {
            const competitors = m.competitions?.[0]?.competitors || [];
            const homeCompetitor = competitors.find((c) => c.homeAway === "home");
            const homeName = homeCompetitor?.team?.name || "";

            if (homeName && lf.homeTeam && !isPlaceholderTeam(lf.homeTeam)) {
              const cleanApiHome = normalizeTeamName(homeName);
              const cleanLocalHome = normalizeTeamName(lf.homeTeam);
              if (cleanApiHome === cleanLocalHome) {
                const timeDiff = Math.abs(new Date(m.date).getTime() - new Date(lf.kickoffUtc).getTime());
                return timeDiff < 12 * 60 * 60 * 1000; // 12 hours
              }
              return false;
            }

            const isSameTime = Math.abs(new Date(m.date).getTime() - new Date(lf.kickoffUtc).getTime()) < 120 * 60 * 1000; // 2 hours
            return isSameTime;
          });

          if (am) {
            const competitors = am.competitions?.[0]?.competitors || [];
            const homeCompetitor = competitors.find((c) => c.homeAway === "home");
            const awayCompetitor = competitors.find((c) => c.homeAway === "away");

            const homeScore = homeCompetitor?.score ? parseInt(homeCompetitor.score) : null;
            const awayScore = awayCompetitor?.score ? parseInt(awayCompetitor.score) : null;

            // Map status.type.state to our UPCOMING | LIVE | COMPLETED mapping
            const state = am.status?.type?.state;
            let mappedStatus = "UPCOMING";
            if (state === "post") mappedStatus = "COMPLETED";
            else if (state === "in") mappedStatus = "LIVE";

            let shootoutScore: { home: number; away: number } | undefined;
            const homeShootout = homeCompetitor?.shootoutScore;
            const awayShootout = awayCompetitor?.shootoutScore;
            if (homeShootout !== undefined && awayShootout !== undefined && homeShootout !== null && awayShootout !== null && String(homeShootout).trim() !== "" && String(awayShootout).trim() !== "") {
              shootoutScore = {
                home: parseInt(String(homeShootout)),
                away: parseInt(String(awayShootout)),
              };
            }

            const homeNameFromApi = homeCompetitor?.team?.name;
            const awayNameFromApi = awayCompetitor?.team?.name;

            const goals = parseEspnGoals(
              am.competitions?.[0]?.details || [],
              homeCompetitor?.team?.id || "",
              awayCompetitor?.team?.id || "",
              homeNameFromApi || lf.homeTeam || "",
              awayNameFromApi || lf.awayTeam || ""
            );

            // ── Parse live statistics from ESPN competitors.statistics array ───
            const getStat = (
              comp: typeof homeCompetitor,
              statName: string
            ): number => {
              const entry = comp?.statistics?.find((s) => s.name === statName);
              return entry ? parseFloat(entry.displayValue) || 0 : 0;
            };

            const stats = {
              homePossession: getStat(homeCompetitor, "possessionPct"),
              awayPossession: getStat(awayCompetitor, "possessionPct"),
              homeShotsOnTarget: getStat(homeCompetitor, "shotsOnTarget"),
              awayShotsOnTarget: getStat(awayCompetitor, "shotsOnTarget"),
              homeTotalShots: getStat(homeCompetitor, "totalShots"),
              awayTotalShots: getStat(awayCompetitor, "totalShots"),
              homeCorners: getStat(homeCompetitor, "wonCorners"),
              awayCorners: getStat(awayCompetitor, "wonCorners"),
            };

            // Only attach stats when we actually received some data
            const hasStats = stats.homePossession > 0 || stats.homeTotalShots > 0;

            return {
              ...lf,
              homeTeam: (isPlaceholderTeam(lf.homeTeam) && homeNameFromApi) ? homeNameFromApi : lf.homeTeam,
              awayTeam: (isPlaceholderTeam(lf.awayTeam) && awayNameFromApi) ? awayNameFromApi : lf.awayTeam,
              homeScore: homeScore !== null && !isNaN(homeScore) ? homeScore : undefined,
              awayScore: awayScore !== null && !isNaN(awayScore) ? awayScore : undefined,
              apiStatus: mappedStatus,
              displayClock: am.status?.type?.name === "STATUS_HALFTIME" ? "HT" : am.status?.displayClock,
              goals,
              shootoutScore,
              stats: hasStats ? stats : undefined,
            };
          }
          return lf;
        });
      }
    }
  } catch (error) {
    console.error("Failed to fetch match scores from ESPN API:", error);
  }

  return fixtures;
}
