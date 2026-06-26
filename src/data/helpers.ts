import { Goal, EspnEventDetail } from "./types";
import { normalizeTeamName } from "./teams";

export const parseEspnGoals = (
  details: EspnEventDetail[],
  homeTeamId: string,
  awayTeamId: string,
  localHomeName: string,
  localAwayName: string
): Goal[] => {
  if (!details || !Array.isArray(details)) return [];

  const goals: Goal[] = [];

  for (const event of details) {
    const text = (event.type?.text || "").toLowerCase();
    const isGoal = event.scoringPlay === true || text.includes("goal") || text.includes("penalty");
    const isShootout = text.includes("shootout");

    if (isGoal && !isShootout) {
      const minuteStr = event.clock?.displayValue || "";
      let minute = 0;
      let injuryTime: number | null = null;

      if (minuteStr.includes("+")) {
        const parts = minuteStr.split("+");
        minute = parseInt(parts[0].replace(/\D/g, ""), 10) || 0;
        injuryTime = parseInt(parts[1].replace(/\D/g, ""), 10) || null;
      } else {
        const parsedMin = parseInt(minuteStr.replace(/\D/g, ""), 10);
        if (!isNaN(parsedMin)) {
          if (parsedMin > 90) {
            minute = 90;
            injuryTime = parsedMin - 90;
          } else {
            minute = parsedMin;
          }
        }
      }

      let type: string | undefined = undefined;
      if (text.includes("own goal")) {
        type = "og";
      } else if (text.includes("penalty")) {
        type = "pen";
      }

      const scorerName = event.athletesInvolved?.[0]?.shortName || event.athletesInvolved?.[0]?.displayName || "Unknown";
      const teamId = event.team?.id?.toString();

      let teamName = "Unknown";
      if (teamId === homeTeamId) {
        teamName = localHomeName;
      } else if (teamId === awayTeamId) {
        teamName = localAwayName;
      } else if (event.team?.displayName) {
        const normEv = normalizeTeamName(event.team.displayName);
        const normH = normalizeTeamName(localHomeName);
        const normA = normalizeTeamName(localAwayName);
        if (normEv === normH) teamName = localHomeName;
        else if (normEv === normA) teamName = localAwayName;
        else teamName = event.team.displayName;
      }

      goals.push({
        minute,
        injuryTime,
        scorer: scorerName,
        team: teamName,
        type,
      });
    }
  }

  return goals.sort((a, b) => a.minute - b.minute);
};

export const formatJerusalemTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "00:00";
  }
};

export const formatJerusalemDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return isoString.split("T")[0];
  }
};

export const getStageDisplayName = (stage: string): string => {
  switch (stage) {
    case "group-stage":
      return "Group Stage";
    case "round-of-32":
      return "Round of 32";
    case "round-of-16":
      return "Round of 16";
    case "quarter-finals":
      return "Quarter-finals";
    case "semi-finals":
      return "Semi-finals";
    case "third-place":
      return "Third Place Play-off";
    case "final":
      return "Final";
    default:
      return stage.replace("-", " ");
  }
};
