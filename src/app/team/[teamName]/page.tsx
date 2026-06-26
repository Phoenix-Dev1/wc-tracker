import { Metadata } from "next";
import { notFound } from "next/navigation";
import { normalizeTeamName, getProcessedMatches, parseEspnGoals, EspnEventDetail, isPlaceholderTeam } from "@/data/worldcup";
import localFixtures from "@/data/fixtures.json";
import TeamPageClient from "./TeamPageClient";

export const dynamic = "force-dynamic";

const REAL_ESPN_API_URL = process.env.REAL_ESPN_API_URL || "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=150";
const MOCK_ESPN_API_URL = process.env.MOCK_ESPN_API_URL || "http://localhost:3000/api/mock-espn";
const STANDINGS_API_URL = process.env.STANDINGS_API_URL || "https://api.football-data.org/v4/competitions/WC/standings";
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN!;

interface PageProps {
  params: Promise<{ teamName: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface EspnApiEvent {
  id: string;
  date: string;
  status: {
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
        name: string; };
    }[];
    details?: EspnEventDetail[];
  }[];
}

interface FootballDataApiStanding {
  stage: string;
  type: string;
  group: string;
  table: {
    position: number;
    team: { id: number; name: string; tla: string; crest: string; shortName?: string };
    playedGames: number;
    won: number;
    draw: number;
    lost: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  }[];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { teamName } = await params;
  const decodedTeamName = decodeURIComponent(teamName);
  return {
    title: `${decodedTeamName} - FIFA World Cup 2026 Tracker`,
    description: `Match schedule, scores, and group standings for ${decodedTeamName} at the 2026 FIFA World Cup.`,
  };
}

export interface TeamMatch {
  id: number | string;
  matchNumber: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: {
    name: string;
    tla: string;
    crest: string;
  };
  awayTeam: {
    name: string;
    tla: string;
    crest: string;
  };
  score: {
    home: number | null;
    away: number | null;
  };
  shootoutScore?: {
    home: number;
    away: number;
  };
  stadium: string;
  hostCity: string;
  displayClock?: string;
  goals?: {
    minute: number;
    injuryTime?: number | null;
    scorer: string;
    team: string;
    type?: string;
  }[];
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

export default async function TeamPage({ params, searchParams }: PageProps) {
  const { teamName } = await params;
  const resolvedSearchParams = await searchParams;
  const isMock = resolvedSearchParams?.mock === "true";
  const decodedTeamName = decodeURIComponent(teamName);
  const targetNormalized = normalizeTeamName(decodedTeamName);

  // Fallback check: Verify if the team is valid/exists in our local fixtures
  const isValidTeam = localFixtures.fixtures.some(
    (f) =>
      normalizeTeamName(f.homeTeam) === targetNormalized ||
      normalizeTeamName(f.awayTeam) === targetNormalized
  );

  if (!isValidTeam) {
    notFound();
  }

  let matches: TeamMatch[] = [];
  let standings: StandingGroup | null = null;
  let isFallback = false;

  try {
    const headers = { "X-Auth-Token": FOOTBALL_DATA_TOKEN };

    const apiUrl = isMock ? MOCK_ESPN_API_URL : REAL_ESPN_API_URL;
    const [matchesRes, standingsRes] = await Promise.all([
      fetch(apiUrl, { cache: "no-store" }),
      fetch(STANDINGS_API_URL, { headers, next: { revalidate: 60 } }),
    ]);

    if (!matchesRes.ok || !standingsRes.ok) {
      throw new Error(`API returned status code error: Matches: ${matchesRes.status}, Standings: ${standingsRes.status}`);
    }

    const matchesData = await matchesRes.json();
    const standingsData = await standingsRes.json();

    if (!matchesData || !Array.isArray(matchesData.events)) {
      throw new Error("Invalid matches response payload");
    }

    // Process & Filter matches from ESPN
    const allMatches = matchesData.events as EspnApiEvent[];

    const systemTime = new Date().toISOString();
    const processedLocal = getProcessedMatches(systemTime);
    
    // Filter local matches belonging to the target team
    const filteredLocal = processedLocal.filter(
      (m) =>
        normalizeTeamName(m.homeTeam) === targetNormalized ||
        normalizeTeamName(m.awayTeam) === targetNormalized
    );

    matches = filteredLocal.map((m) => {
      // Find matching ESPN API match if any
      const am = allMatches.find((apiMatch) => {
        const competitors = apiMatch.competitions?.[0]?.competitors || [];
        const homeCompetitor = competitors.find((c) => c.homeAway === "home");
        const homeName = homeCompetitor?.team?.name || "";

        if (homeName && m.homeTeam && !isPlaceholderTeam(m.homeTeam)) {
          const cleanApiHome = normalizeTeamName(homeName);
          const cleanLocalHome = normalizeTeamName(m.homeTeam);
          if (cleanApiHome === cleanLocalHome) {
            const timeDiff = Math.abs(new Date(apiMatch.date).getTime() - new Date(m.kickoffUtc).getTime());
            return timeDiff < 12 * 60 * 60 * 1000; // 12 hours
          }
          return false;
        }

        const isSameTime = Math.abs(new Date(apiMatch.date).getTime() - new Date(m.kickoffUtc).getTime()) < 120 * 60 * 1000; // 2 hours
        return isSameTime;
      });

      // Default mapped values from local processed fixtures
      let mappedStatus = m.status === "COMPLETED" ? "FINISHED" : m.status === "LIVE" ? "IN_PLAY" : "TIMED";
      let homeScore = m.homeScore ?? null;
      let awayScore = m.awayScore ?? null;
      let displayClock = m.displayClock;
      let shootoutScore: { home: number; away: number } | undefined;
      let goals = m.goals;
      let homeTeamName = m.homeTeam;
      let awayTeamName = m.awayTeam;

      if (am) {
        const competitors = am.competitions?.[0]?.competitors || [];
        const homeCompetitor = competitors.find((c) => c.homeAway === "home");
        const awayCompetitor = competitors.find((c) => c.homeAway === "away");

        const espnHomeScore = homeCompetitor?.score ? parseInt(homeCompetitor.score) : null;
        const espnAwayScore = awayCompetitor?.score ? parseInt(awayCompetitor.score) : null;

        const state = am.status?.type?.state;
        if (state === "post") mappedStatus = "FINISHED";
        else if (state === "in") mappedStatus = "IN_PLAY";

        if (espnHomeScore !== null && !isNaN(espnHomeScore)) homeScore = espnHomeScore;
        if (espnAwayScore !== null && !isNaN(espnAwayScore)) awayScore = espnAwayScore;

        displayClock = am.status?.type?.name === "STATUS_HALFTIME" ? "HT" : am.status?.displayClock;

        const homeNameFromApi = homeCompetitor?.team?.name;
        const awayNameFromApi = awayCompetitor?.team?.name;
        if (isPlaceholderTeam(m.homeTeam) && homeNameFromApi) homeTeamName = homeNameFromApi;
        if (isPlaceholderTeam(m.awayTeam) && awayNameFromApi) awayTeamName = awayNameFromApi;

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

        goals = parseEspnGoals(
          am.competitions?.[0]?.details || [],
          homeCompetitor?.team?.id || "",
          awayCompetitor?.team?.id || "",
          m.homeTeam || "",
          m.awayTeam || ""
        );
      }

      return {
        id: m.matchNumber,
        matchNumber: m.matchNumber,
        utcDate: m.kickoffUtc,
        status: mappedStatus,
        stage: m.stage === "group-stage" ? "GROUP_STAGE" : m.stage.toUpperCase().replace(/-/g, "_"),
        group: m.group ? `GROUP_${m.group.toUpperCase()}` : null,
        homeTeam: {
          name: homeTeamName,
          tla: m.homeCode,
          crest: "",
        },
        awayTeam: {
          name: awayTeamName,
          tla: m.awayCode,
          crest: "",
        },
        score: {
          home: homeScore,
          away: awayScore,
        },
        stadium: m.stadium,
        hostCity: m.hostCity,
        displayClock,
        goals,
        shootoutScore,
      };
    });

    // Find our team's group standings
    if (standingsData && Array.isArray(standingsData.standings)) {
      const groupData = (standingsData.standings as FootballDataApiStanding[]).find((s) => {
        if (!s.table || !Array.isArray(s.table)) return false;
        return s.table.some(
          (t) => t.team?.name && normalizeTeamName(t.team.name) === targetNormalized
        );
      });

      if (groupData) {
        standings = {
          groupName: groupData.group || "Group Standings",
          table: groupData.table.map((t) => ({
            position: t.position,
            team: {
              id: t.team.id,
              name: t.team.name,
              shortName: t.team.shortName || t.team.name,
              tla: t.team.tla,
              crest: t.team.crest,
            },
            playedGames: t.playedGames,
            won: t.won,
            draw: t.draw,
            lost: t.lost,
            points: t.points,
            goalsFor: t.goalsFor,
            goalsAgainst: t.goalsAgainst,
            goalDifference: t.goalDifference,
          })),
        };
      }
    }
  } catch (error) {
    console.error("API error. Falling back to local fixtures:", error);
    isFallback = true;

    // Local fixtures fallback:
    const systemTime = new Date().toISOString(); // standard JS clock
    const processedLocal = getProcessedMatches(systemTime);
    
    // Filter local matches belonging to the target team
    const filteredLocal = processedLocal.filter(
      (m) =>
        normalizeTeamName(m.homeTeam) === targetNormalized ||
        normalizeTeamName(m.awayTeam) === targetNormalized
    );

    matches = filteredLocal.map((m) => {
      return {
        id: m.matchNumber,
        matchNumber: m.matchNumber,
        utcDate: m.kickoffUtc,
        status: m.status === "COMPLETED" ? "FINISHED" : m.status === "LIVE" ? "IN_PLAY" : "TIMED",
        stage: m.stage === "group-stage" ? "GROUP_STAGE" : m.stage.toUpperCase().replace(/-/g, "_"),
        group: m.group ? `GROUP_${m.group.toUpperCase()}` : null,
        homeTeam: {
          name: m.homeTeam,
          tla: m.homeCode,
          crest: "",
        },
        awayTeam: {
          name: m.awayTeam,
          tla: m.awayCode,
          crest: "",
        },
        score: {
          home: m.homeScore ?? null,
          away: m.awayScore ?? null,
        },
        stadium: m.stadium,
        hostCity: m.hostCity,
        displayClock: m.displayClock,
      };
    });
  }

  // Render Client view
  return (
    <TeamPageClient
      teamName={decodedTeamName}
      matches={matches}
      standings={standings}
      isFallback={isFallback}
    />
  );
}
