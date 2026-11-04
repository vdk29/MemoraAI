import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
export type ThemePreference = "light" | "dark" | "system";
const key = "memora-theme";
const read = (): ThemePreference => {
  try {
    const v = localStorage.getItem(key);
    return v === "dark" || v === "light" ? v : "system";
  } catch {
    return "system";
  }
};
const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (v: ThemePreference) => void;
}>({ preference: "system", setPreference: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(read);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme =
        preference === "system"
          ? media.matches
            ? "dark"
            : "light"
          : preference;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "dark" ? "#101115" : "#f7f8fa");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) setPreference(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  function choose(value: ThemePreference) {
    setPreference(value);
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Remain usable when browser storage is restricted. */
    }
  }
  return (
    <ThemeContext.Provider value={{ preference, setPreference: choose }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
