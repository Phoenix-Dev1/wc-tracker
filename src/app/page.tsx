import { Metadata } from "next";
import MonPageClient from "@/app/MonPageClient";
import { Fixture, normalizeTeamName, parseEspnGoals, EspnEventDetail, isPlaceholderTeam } from "@/data/worldcup";
import localFixtures from "@/data/fixtures.json";

const STATS_API_URL = "https://www.thestatsapi.com/world-cup/data/fixtures.json";
const REAL_ESPN_API_URL = process.env.REAL_ESPN_API_URL || "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=150";
const MOCK_ESPN_API_URL = process.env.MOCK_ESPN_API_URL || "http://localhost:3000/api/mock-espn";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 Live Schedule & Tracker",
  description:
    "Live schedule, results, and countdowns for all 104 matches of the 2026 FIFA World Cup (USA, Canada, Mexico) in Jerusalem Time. Built with a sleek dark cyberpunk theme.",
  keywords: [
    "FIFA World Cup 2026",
    "World Cup Schedule",
    "World Cup 2026 Results",
    "Jerusalem Time World Cup",
    "Live World Cup Tracker",
    "World Cup Fixtures",
  ],
  openGraph: {
    title: "FIFA World Cup 2026 Live Schedule & Tracker",
    description:
      "Explore the 2026 FIFA World Cup schedule, live scores, and countdowns. All match times displayed in Jerusalem Time.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FIFA World Cup 2026 Live Schedule & Tracker",
    description:
      "FIFA World Cup 2026 fixtures, live updates, and countdowns in Jerusalem Time. Deep space/cyberpunk interface.",
  },
};

interface EspnApiEvent {
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

async function fetchFixtures(isMock?: boolean): Promise<Fixture[]> {
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

            // Map status.type.state to our UPCOMING | LIVE | COMPLETED mapping via worldcup.ts logic
            const state = am.status?.type?.state;
            let mappedStatus = "UPCOMING";
            if (state === "post") mappedStatus = "COMPLETED";
            else if (state === "in") mappedStatus = "LIVE";

            let shootoutScore: { home: number; away: number } | undefined;
            if (am.status?.type?.name === "STATUS_SHOOTOUT") {
              const homeShootout = homeCompetitor?.shootoutScore;
              const awayShootout = awayCompetitor?.shootoutScore;
              if (homeShootout !== undefined && awayShootout !== undefined) {
                shootoutScore = {
                  home: parseInt(String(homeShootout)),
                  away: parseInt(String(awayShootout)),
                };
              }
            }

            const goals = parseEspnGoals(
              am.competitions?.[0]?.details || [],
              homeCompetitor?.team?.id || "",
              awayCompetitor?.team?.id || "",
              lf.homeTeam || "",
              lf.awayTeam || ""
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

            const homeNameFromApi = homeCompetitor?.team?.name;
            const awayNameFromApi = awayCompetitor?.team?.name;

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

export default async function WorldCupPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const isMock = searchParams?.mock === "true";
  const fixtures = await fetchFixtures(isMock);
  return <MonPageClient initialFixtures={fixtures} />;
}
