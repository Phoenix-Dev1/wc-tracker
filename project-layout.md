# Project Layout & Architecture: FIFA World Cup 2026 Live Schedule & Tracker

This document provides a comprehensive overview of the wc-tracker codebase, its features, and the underlying data structures.

---

## 🚀 Key Features

### 1. Timeline Warp (Simulation Mode)
- **Interactive Time Travel**: Allows users to set any date-time between **June 11, 2026** (tournament start) and **July 19, 2026** (the final).
- **Progressive Playback**: Play, pause, and adjust simulation speed (e.g., 15m, 30m, 60m of match time per real-world second).
- **Dynamic Gating**: Matches are automatically categorized as **UPCOMING**, **LIVE**, or **COMPLETED** based on the selected simulated time.
- **Clock Progression**: Simulates the 90-minute clock progress during live windows, showing current minute, halftime (HT), and injury time.

### 2. Matchup Analyzer (Head-to-Head Simulator)
- **Probability Calculations**: Calculates win/draw/loss probabilities between any two qualified teams based on their historical statistics.
- **Metrics Comparison Radar**: Visualizes and compares key metrics (e.g., average possession, goals scored/conceded, corner kicks, and shots on target).
- **Recent Form Tracker**: Displays the last 5 match outcomes (`W` / `D` / `L`) for both teams.

### 3. Dynamic Standings & Brackets
- **Real-Time Group Calculations**: Group standings (Points, GD, GF, GA, Played) are computed on the fly using completed matches relative to the warp clock.
- **Knockout Stage Progression**: Automatically resolves TBD placeholders in knockout brackets (Round of 32, Round of 16, etc.) as preceding matches complete.

### 4. Stats & Top Scorers
- **Dynamic Leaderboards**: Calculates the top goal scorers dynamically.
- **Goal Details**: Shows timing, injury time, and types of goals (e.g., Normal, Penalty, Own Goal).

---

## 📁 File Structure

```
wc-tracker/
├── src/
│   ├── app/
│   │   ├── api/mock-espn/      # Serves mock ESPN scoreboard responses
│   │   ├── team/[teamName]/    # Team detail views (form, stats, matchups)
│   │   ├── globals.css         # Cyberpunk/glassmorphism design styles
│   │   ├── layout.tsx          # Root template with ThemeProvider
│   │   ├── page.tsx            # Server page (loads real or mock API)
│   │   └── MonPageClient.tsx   # Dashboard controller & warp simulation UI
│   │
│   ├── components/
│   │   ├── HeroMatchCard.tsx   # Prominent live/latest match display
│   │   ├── LiveActionCard.tsx  # Interactive live match dashboard
│   │   ├── MatchListRow.tsx    # List item representing standard fixture
│   │   ├── MatchProgressCircle.tsx # Visual gauge showing match status & clustered goal markers
│   │   └── MatchupAnalyzer.tsx # Head-to-Head simulator component
│   │
│   ├── data/
│   │   ├── fixtures.json       # Static schedule database of 104 matches
│   │   ├── simulation-database.json # Archived match results (up to #70)
│   │   ├── types.ts            # TypeScript interfaces (Goal, Fixture, etc.)
│   │   ├── processing.ts       # Gates fixture status relative to warp clock
│   │   ├── standings.ts        # Group stage standings computation
│   │   ├── stats.ts            # Tournament stats and H2H radar comparisons
│   │   ├── teams.ts            # Team names, codes, flag mappings, normalization
│   │   ├── helpers.ts          # Clock parsers & timezone formatters
│   │   └── worldcup.ts         # Main data-layer entry module
│   │
│   └── utils/
│       └── cn.ts               # Tailwinds merge utility helper
│
├── README.md                   # Setup and execution guide
└── package.json                # Project dependencies
```

---

## 🗃️ Data Structures & Schema

The core structures are defined in [types.ts](file:///c:/Projects%202026/wc-tracker/src/data/types.ts).

### 1. Goal Schema
Represents a scored goal:
```typescript
export interface Goal {
  minute: number;             // 1 to 90+
  injuryTime?: number | null; // e.g. 3 (if scored at 90+3')
  scorer: string;             // Player name
  team: string;               // Team name that scored
  type?: string;              // "NORMAL" | "OWN" | "PENALTY"
}
```

### 2. Fixture Schema
Static schedule record template loaded from [fixtures.json](file:///c:/Projects%202026/wc-tracker/src/data/fixtures.json):
```typescript
export interface Fixture {
  matchNumber: number;        // Unique id (1 to 104)
  date: string;               // Kickoff date e.g. "2026-06-11"
  kickoffUtc: string;         // ISO timestamp e.g. "2026-06-11T19:00:00Z"
  stage: string;              // "group-stage" | "round-of-32" etc.
  group: string | null;       // Group letter ("A" to "L") or null for knockouts
  homeTeam: string;           // Home team name (or placeholder e.g. "Group A winners")
  awayTeam: string;           // Away team name
  stadium: string;            // Stadium name
  hostCity: string;           // City tag
  matchUrl: string;           // Details web URL
}
```

### 3. Match Statistics Schema
Archived match-level metrics (e.g., in [simulation-database.json](file:///c:/Projects%202026/wc-tracker/src/data/simulation-database.json)):
```typescript
export interface MatchStats {
  homePossession: number;     // e.g. 58.5
  awayPossession: number;     // e.g. 41.5
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeTotalShots: number;
  awayTotalShots: number;
  homeCorners: number;
  awayCorners: number;
}
```

### 4. ProcessedMatch Schema
Extends the static `Fixture` with runtime states calculated dynamically based on simulated warp time:
```typescript
export interface ProcessedMatch extends Fixture {
  status: 'COMPLETED' | 'LIVE' | 'UPCOMING';
  homeScore?: number;
  awayScore?: number;
  homeFlag: string;           // Country flag emoji
  awayFlag: string;
  homeCode: string;           // FIFA 3-letter country code
  awayCode: string;
  displayClock?: string;      // Current minute text e.g. "72'", "HT", "FT"
  formattedTimeJerusalem: string;
  formattedDateJerusalem: string;
  goals?: Goal[];
  stats?: MatchStats;
}
```
