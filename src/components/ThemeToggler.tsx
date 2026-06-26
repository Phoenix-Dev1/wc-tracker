"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggler() {
  const [theme, setTheme] = useState<string>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      className="fixed top-5 right-5 z-50 flex items-center justify-center w-10 h-10 rounded-full border bg-white/85 dark:bg-slate-900/85 backdrop-blur-md text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 shadow-md hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
