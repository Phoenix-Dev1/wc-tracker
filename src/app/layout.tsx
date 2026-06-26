import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeToggler from "@/components/ThemeToggler";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 Live Schedule & Tracker",
  description:
    "Live schedule, results, and countdowns for all 104 matches of the 2026 FIFA World Cup in Jerusalem Time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-bg-900 text-text-primary antialiased font-sans">
        <ThemeProvider>
          <ThemeToggler />
          <div id="main-content">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
