import { Metadata } from "next";
// Active client component for the knockout page
import { fetchFixtures } from "@/data/worldcup";
import KnockoutsPageClient from "@/app/knockouts/KnockoutsPageClient";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 Knockout Stages & Stat Leaders",
  description: "Live visual knockout bracket and dynamic stats leaderboard for the 2026 FIFA World Cup.",
};

export default async function KnockoutsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const isMock = searchParams?.mock === "true";
  const fixtures = await fetchFixtures(isMock);
  return <KnockoutsPageClient initialFixtures={fixtures} />;
}
