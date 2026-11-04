import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemePreference } from "../lib/theme";
export function ThemeToggle({ expanded = false }: { expanded?: boolean }) {
  const { preference, setPreference } = useTheme();
  return (
    <div
      className={"theme-switch " + (expanded ? "expanded" : "")}
      role="group"
      aria-label="Тема оформления"
    >
      {(
        [
          ["light", "Светлая", Sun],
          ["dark", "Тёмная", Moon],
          ["system", "Системная", Monitor],
        ] as const
      ).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-label={label + " тема"}
          aria-pressed={preference === value}
          title={label + " тема"}
          onClick={() => setPreference(value as ThemePreference)}
        >
          <Icon size={15} />
          {expanded && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}
