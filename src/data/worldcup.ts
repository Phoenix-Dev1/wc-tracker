/* =============================================================================
   SIMULATION DATABASE & DATA EVOLUTION ARCHITECTURE
   =============================================================================
   To ensure the "Timeline Warp" (simulation mode) works offline and remains 
   fully functional after the 2026 World Cup ends, match results (scores, goals, 
   shootouts, and stats) should be archived in a separate JSON database file:
   `src/data/simulation-database.json`
   
   HOW TO EXPAND THE DATA AS THE TOURNAMENT EVOLVES:
   --------------------------------------------------
   Create a JSON file structured as a dictionary mapped by the match number:
   
   {
     "1": {
       "homeScore": 2,
       "awayScore": 1,
       "goals": [
         { "minute": 15, "scorer": "J. Hernandez", "team": "Mexico", "type": "NORMAL" },
         { "minute": 88, "scorer": "R. Jimenez", "team": "Mexico", "type": "NORMAL" }
       ],
       "stats": {
         "homePossession": 55,
         "awayPossession": 45,
         "homeShotsOnTarget": 6,
         "awayShotsOnTarget": 3,
         "homeTotalShots": 12,
         "awayTotalShots": 9,
         "homeCorners": 4,
         "awayCorners": 3
       }
     }
   }
   
   PRESERVING SIMULATOR INTEGRITY:
   --------------------------------
   1. MATCH ID ALIGNMENT: Ensure the keys ("1", "2", etc.) correspond exactly 
      to the `matchNumber` values inside `fixtures.json`.
   2. INTERACTIVE OFFSET CLOCK: The timeline engine dynamically scales stats 
      and hides/reveals goals in real-time based on the active simulated time 
      relative to the kickoff. To prevent rendering bugs:
      - Do not include future/upcoming matches in the archive file until they 
        are completed (or actively in play).
      - Ensure goal minute values are realistic integers (1 to 120+).
   3. INTEGRATING THE ARCHIVE: Load this JSON database in this file (`worldcup.ts`), 
      and merge it into the processed matches array:
      
      import historicalDb from "./simulation-database.json";
      // Merge:
      const historicalMatch = (historicalDb as Record<string, any>)[fixture.matchNumber.toString()];
      if (historicalMatch) {
        homeScore = historicalMatch.homeScore;
        awayScore = historicalMatch.awayScore;
        goals = historicalMatch.goals || [];
        stats = historicalMatch.stats;
      }
   ============================================================================= */

export * from "./types";
export * from "./teams";
export * from "./helpers";
export * from "./stats";
export * from "./standings";
export * from "./processing";
