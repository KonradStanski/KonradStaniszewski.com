import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "react-feather";
import posthog from "posthog-js";

export const ThemeSelect = () => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";

  function toggleTheme() {
    const newTheme = isDark ? "light" : "dark";
    posthog.capture("theme_toggled", { new_theme: newTheme });
    setTheme(newTheme);
  }

  return (
    <button
      className="theme-button"
      type="button"
      disabled={!mounted}
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Change color theme"}
      onClick={toggleTheme}
    >
      {mounted ? (isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />) : <span className="h-5 w-5" />}
    </button>
  );
};
