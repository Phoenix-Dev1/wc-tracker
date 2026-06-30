import { Fixture, ProcessedMatch, StandingGroup, StandingTeam } from "./types";
import { getTeamInfo } from "./teams";
import { getProcessedMatches } from "./processing";

export function calculateGroupStandingsFromMatches(
  matches: ProcessedMatch[],
  groupLetter: string
): StandingGroup | null {
  if (!groupLetter) return null;

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

      tableMap[home].goalDifference = tableMap[home].goalsFor - tableMap[home].goalsAgainst;
      tableMap[away].goalDifference = tableMap[away].goalsFor - tableMap[away].goalsAgainst;
    }
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

export function calculateGroupStandings(
  systemTimeStr: string,
  groupLetter: string,
  rawFixturesInput?: Fixture[]
): StandingGroup | null {
  const matches = getProcessedMatches(systemTimeStr, rawFixturesInput);
  return calculateGroupStandingsFromMatches(matches, groupLetter);
}
