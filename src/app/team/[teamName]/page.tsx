import { Metadata } from "next";
import { notFound } from "next/navigation";
import { normalizeTeamName, getProcessedMatches, calculateGroupStandings, fetchFixtures } from "@/data/worldcup";
import TeamPageClient from "./TeamPageClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamName: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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
  const simTimeParam = resolvedSearchParams?.simTime;
  const decodedTeamName = decodeURIComponent(teamName);
  const targetNormalized = normalizeTeamName(decodedTeamName);

  // Fetch fixtures from API or mock
  const fixtures = await fetchFixtures(isMock);

  // Fallback check: Verify if the team is valid/exists in fixtures
  const isValidTeam = fixtures.some(
    (f) =>
      normalizeTeamName(f.homeTeam) === targetNormalized ||
      normalizeTeamName(f.awayTeam) === targetNormalized
  );

  if (!isValidTeam) {
    notFound();
  }

  // Parse simulated system time
  const systemTime = typeof simTimeParam === "string" ? simTimeParam : new Date().toISOString();

  // Find team group letter
  const teamMatchWithGroup = fixtures.find(
    (f) =>
      (normalizeTeamName(f.homeTeam) === targetNormalized ||
       normalizeTeamName(f.awayTeam) === targetNormalized) &&
      f.group
  );
  const teamGroupLetter = teamMatchWithGroup?.group;

  // Process all matches relative to the clock
  const processedLocal = getProcessedMatches(systemTime, fixtures);

  // Filter matches belonging to the target team
  const filteredLocal = processedLocal.filter(
    (m) =>
      normalizeTeamName(m.homeTeam) === targetNormalized ||
      normalizeTeamName(m.awayTeam) === targetNormalized
  );

  // Map ProcessedMatch to TeamMatch interface for TeamPageClient compatibility
  const matches: TeamMatch[] = filteredLocal.map((m) => {
    const isLive = m.status === "LIVE";
    const isCompleted = m.status === "COMPLETED";

    let mappedStatus = "TIMED";
    if (isLive) mappedStatus = "IN_PLAY";
    else if (isCompleted) mappedStatus = "FINISHED";

    return {
      id: m.matchNumber,
      matchNumber: m.matchNumber,
      utcDate: m.kickoffUtc,
      status: mappedStatus,
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
        home: m.homeScore !== undefined ? m.homeScore : null,
        away: m.awayScore !== undefined ? m.awayScore : null,
      },
      stadium: m.stadium,
      hostCity: m.hostCity,
      displayClock: m.displayClock,
      goals: m.goals,
      shootoutScore: m.shootoutScore,
    };
  });

  // Calculate dynamic group standings consistent with other views
  let standings: StandingGroup | null = null;
  if (teamGroupLetter) {
    const rawStandings = calculateGroupStandings(systemTime, teamGroupLetter, fixtures);
    if (rawStandings) {
      standings = {
        groupName: rawStandings.groupName,
        table: rawStandings.table.map(t => ({
          position: t.position,
          team: {
            id: t.team.id,
            name: t.team.name,
            shortName: t.team.shortName,
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
        }))
      };
    }
  }

  // Render Client view
  return (
    <TeamPageClient
      teamName={decodedTeamName}
      matches={matches}
      standings={standings}
      isFallback={false}
    />
  );
}
