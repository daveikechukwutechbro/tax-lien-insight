import { useEffect, useState } from "react";
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
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setDark(document.documentElement.classList.contains("dark"));

    const watch = () => setDark(document.documentElement.classList.contains("dark"));
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) watch();
    };
    window.addEventListener("storage", onStorage);
    const observer = new MutationObserver(watch);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener("storage", onStorage);
      observer.disconnect();
    };
  }, [hydrated]);

  if (!hydrated) {
    return <div className="size-10 rounded-full bg-surface-alt" aria-hidden />;
  }

  const flip = () => applyTheme(dark ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-10 place-items-center rounded-full shadow-sm ring-1 ring-inset transition-all duration-200 hover:scale-105 active:scale-95 dark:ring-gold/30"
      style={
        dark
          ? { backgroundColor: "#1a2f52", color: "#e9b949" }
          : { backgroundColor: "#ffffff", color: "#14213d" }
      }
    >
      {dark ? <Sun className="size-5" strokeWidth={1.75} /> : <Moon className="size-5" strokeWidth={1.75} />}
    </button>
  );
}