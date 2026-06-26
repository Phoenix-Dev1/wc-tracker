"use client";

import { useState, useEffect } from "react";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark"; // Default to dark for the cyberpunk vibe
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  if (theme === null) {
    // Prevent hydration flicker
    return <div className="invisible">{children}</div>;
  }

  return <div data-theme={theme}>{children}</div>;
}
