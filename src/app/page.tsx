import { Metadata } from "next";
import MonPageClient from "@/app/MonPageClient";
import { fetchFixtures } from "@/data/worldcup";

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

export default async function WorldCupPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const isMock = searchParams?.mock === "true";
  const fixtures = await fetchFixtures(isMock);
  return <MonPageClient initialFixtures={fixtures} />;
}
