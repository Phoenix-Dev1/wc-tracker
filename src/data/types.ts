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
  stats?: MatchStats;
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
  period?: {
    number?: number;
  };
  shootout?: boolean;
}

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

export interface MatchupProbabilities {
  teamA: number; // whole-number percentage (e.g. 45)
  draw: number;
  teamB: number;
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
