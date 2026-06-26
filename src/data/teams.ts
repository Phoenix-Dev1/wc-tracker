export const TEAM_MAPPING: Record<string, { code: string; flag: string }> = {
  "Mexico": { code: "MEX", flag: "🇲🇽" },
  "South Africa": { code: "RSA", flag: "🇿🇦" },
  "Korea Republic": { code: "KOR", flag: "🇰🇷" },
  "Czechia": { code: "CZE", flag: "🇨🇿" },
  "Canada": { code: "CAN", flag: "🇨🇦" },
  "Bosnia and Herzegovina": { code: "BIH", flag: "🇧🇦" },
  "United States": { code: "USA", flag: "🇺🇸" },
  "Paraguay": { code: "PAR", flag: "🇵🇾" },
  "Haiti": { code: "HAI", flag: "🇭🇹" },
  "Scotland": { code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  "Australia": { code: "AUS", flag: "🇦🇺" },
  "Turkiye": { code: "TUR", flag: "🇹🇷" },
  "Brazil": { code: "BRA", flag: "🇧🇷" },
  "Morocco": { code: "MAR", flag: "🇲🇦" },
  "Qatar": { code: "QAT", flag: "🇶🇦" },
  "Switzerland": { code: "SUI", flag: "🇨🇭" },
  "Cote d'Ivoire": { code: "CIV", flag: "🇨🇮" },
  "Ecuador": { code: "ECU", flag: "🇪🇨" },
  "Germany": { code: "GER", flag: "🇩🇪" },
  "Curacao": { code: "CUW", flag: "🇨🇼" },
  "Netherlands": { code: "NED", flag: "🇳🇱" },
  "Japan": { code: "JPN", flag: "🇯🇵" },
  "Sweden": { code: "SWE", flag: "🇸🇪" },
  "Tunisia": { code: "TUN", flag: "🇹🇳" },
  "Saudi Arabia": { code: "KSA", flag: "🇸🇦" },
  "Uruguay": { code: "URU", flag: "🇺🇾" },
  "Spain": { code: "ESP", flag: "🇪🇸" },
  "Cabo Verde": { code: "CPV", flag: "🇨🇻" },
  "IR Iran": { code: "IRN", flag: "🇮🇷" },
  "New Zealand": { code: "NZL", flag: "🇳🇿" },
  "Belgium": { code: "BEL", flag: "🇧🇪" },
  "Egypt": { code: "EGY", flag: "🇪🇬" },
  "France": { code: "FRA", flag: "🇫🇷" },
  "Senegal": { code: "SEN", flag: "🇸🇳" },
  "Iraq": { code: "IRQ", flag: "🇮🇶" },
  "Norway": { code: "NOR", flag: "🇳🇴" },
  "Argentina": { code: "ARG", flag: "🇦🇷" },
  "Algeria": { code: "ALG", flag: "🇩🇿" },
  "Austria": { code: "AUT", flag: "🇦🇹" },
  "Jordan": { code: "JOR", flag: "🇯🇴" },
  "Ghana": { code: "GHA", flag: "🇬🇭" },
  "Panama": { code: "PAN", flag: "🇵🇦" },
  "England": { code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "Croatia": { code: "CRO", flag: "🇭🇷" },
  "Portugal": { code: "POR", flag: "🇵🇹" },
  "Congo DR": { code: "COD", flag: "🇨🇩" },
  "Uzbekistan": { code: "UZB", flag: "🇺🇿" },
  "Colombia": { code: "COL", flag: "🇨🇴" }
};

export const normalizeTeamName = (name: string): string => {
  if (!name) return "";
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-/g, " ")
    .trim();
  const nameMap: Record<string, string> = {
    "south korea": "korea republic",
    "south-korea": "korea republic",
    "korea republic": "korea republic",
    "bosnia herzegovina": "bosnia and herzegovina",
    "bosnia and herzegovina": "bosnia and herzegovina",
    "turkey": "turkiye",
    "turkiye": "turkiye",
    "ivory coast": "cote d'ivoire",
    "cote d'ivoire": "cote d'ivoire",
    "curacao": "curacao",
    "curaçao": "curacao",
    "cape verde islands": "cabo verde",
    "cape verde": "cabo verde",
    "cabo verde": "cabo verde",
    "iran": "ir iran",
    "ir iran": "ir iran",
    "usa": "united states",
    "united states": "united states",
  };
  return nameMap[clean] || clean;
};

export const isPlaceholderTeam = (teamName?: string | null): boolean => {
  if (!teamName) return true;
  const lower = teamName.toLowerCase();
  
  // Explicit placeholder keywords
  if (
    lower.includes("winner") ||
    lower.includes("loser") ||
    lower.includes("runner") ||
    lower.includes("third place") ||
    lower.includes("tbd") ||
    lower.includes("tbc") ||
    lower.includes("play-off") ||
    lower.includes("match") ||
    lower.includes("placeholder")
  ) {
    return true;
  }

  // Double check: if it's not in TEAM_MAPPING, it's not a qualified team
  const trimmed = teamName.trim();
  if (TEAM_MAPPING[trimmed]) return false;
  const normalized = normalizeTeamName(trimmed);
  const matched = Object.keys(TEAM_MAPPING).some(
    (k) => normalizeTeamName(k) === normalized
  );
  return !matched;
};

export const getTeamInfo = (teamName?: string | null) => {
  if (!teamName) {
    return { code: "TBD", flag: "🏳️" };
  }
  const trimmed = teamName.trim();
  if (TEAM_MAPPING[trimmed]) {
    return TEAM_MAPPING[trimmed];
  }

  // Try normalized lookup
  const normalized = normalizeTeamName(trimmed);
  const matchedKey = Object.keys(TEAM_MAPPING).find(
    (k) => normalizeTeamName(k) === normalized
  );
  if (matchedKey) {
    return TEAM_MAPPING[matchedKey];
  }

  // Knockout stage placeholders
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("winner match")) {
    const num = trimmed.split(" ").pop() || "";
    return { code: `W${num}`, flag: "🏆" };
  }
  if (lower.startsWith("loser match")) {
    const num = trimmed.split(" ").pop() || "";
    return { code: `L${num}`, flag: "🏳️" };
  }
  if (lower.includes("runners-up")) {
    const parts = trimmed.split(" ");
    const group = parts[1] || "";
    return { code: `${group.toUpperCase()}2`, flag: "🥈" };
  }
  if (lower.includes("winners")) {
    const parts = trimmed.split(" ");
    const group = parts[1] || "";
    return { code: `${group.toUpperCase()}1`, flag: "🥇" };
  }
  if (lower.includes("third place")) {
    return { code: "3RD", flag: "🥉" };
  }

  // Fallback
  const code = trimmed.length >= 3 ? trimmed.substring(0, 3).toUpperCase() : "TBD";
  return { code, flag: "🏳️" };
};
