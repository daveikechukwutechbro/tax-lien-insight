import { Moon, Sun } from "lucide-react";
import { useHydrated } from "@/hooks/use-hydrated";

const STORAGE_KEY = "al-theme";

export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // private mode — ignore
  }
}

export function ThemeToggle() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return <div className="grid size-9 place-items-center rounded-md" aria-hidden />;
  }
  const dark = document.documentElement.classList.contains("dark");
  return (
    <button
      type="button"
      onClick={() => applyTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-9 place-items-center rounded-md border border-hairline bg-surface text-ink transition-colors hover:text-navy"
    >
      {dark ? <Sun className="size-5" strokeWidth={1.75} /> : <Moon className="size-5" strokeWidth={1.75} />}
    </button>
  );
}