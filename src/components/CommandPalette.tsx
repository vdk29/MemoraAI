import { useEffect, useState, useRef } from "react";
import {
  Search,
  FileText,
  Plus,
  Home,
  CalendarDays,
  MessageCircle,
  Settings,
  Sun,
  Monitor,
  Moon,
  CornerDownLeft,
} from "lucide-react";
import { db, result } from "../lib/supabase";
import { useTheme } from "../lib/theme";
import { Modal } from "./ui";
export function CommandPalette({ notes, close, openNote }: any) {
  const [query, setQuery] = useState(""),
    [hits, setHits] = useState<any[]>(notes.slice(0, 5)),
    [selected, setSelected] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { setPreference } = useTheme();
  const results = useRef<HTMLDivElement>(null);
  useEffect(() => {
    results.current?.children[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  useEffect(() => {
    let alive = true;
    setSelected(0);
    setError("");
    if (!query.trim()) {
      setHits(notes.slice(0, 5));
      setBusy(false);
      return;
    }
    setBusy(true);
    setHits([]);
    const timer = setTimeout(async () => {
      try {
        const rows = await result(
          db.rpc("search_notes", {
            query_text: query.trim(),
            only_favorites: false,
            category: null,
            sort_by: "updated_at",
            page_offset: 0,
          }),
        );
        if (alive) setHits(rows || []);
      } catch (e: any) {
        if (alive) {
          setError(e.message);
          setHits([]);
        }
      } finally {
        if (alive) setBusy(false);
      }
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, notes]);
  const navigate = (route: string) => {
    location.hash = route;
    close();
  };
  const actions = [
    {
      title: "Новая заметка",
      icon: Plus,
      action: () =>
        openNote({ title: "", content: "", tags: [], favorite: false }),
    },
    { title: "Главная", icon: Home, action: () => navigate("home") },
    { title: "Заметки", icon: FileText, action: () => navigate("notes") },
    {
      title: "Календарь",
      icon: CalendarDays,
      action: () => navigate("calendar"),
    },
    {
      title: "Чаты и друзья",
      icon: MessageCircle,
      action: () => navigate("chats"),
    },
    { title: "Настройки", icon: Settings, action: () => navigate("settings") },
    {
      title: "Светлая тема",
      icon: Sun,
      action: () => {
        setPreference("light");
        close();
      },
    },
    {
      title: "Тёмная тема",
      icon: Moon,
      action: () => {
        setPreference("dark");
        close();
      },
    },
  ];
  actions.push({
    title: "Системная тема",
    icon: Monitor,
    action: () => {
      setPreference("system");
      close();
    },
  });
  const matches = [
    ...hits.map((n) => ({
      title: n.title,
      icon: FileText,
      action: () => openNote(n),
    })),
    ...actions.filter((a) =>
      a.title.toLowerCase().includes(query.toLowerCase()),
    ),
  ];
  return (
    <Modal title="Команды MEMORA" close={close}>
      <div className="trace-command">
        <label className="trace-command-input">
          <Search size={18} />
          <input
            aria-label="Найти заметку или команду"
            placeholder="Найти заметку или выполнить команду…"
            maxLength={200}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((i) => (i + 1) % Math.max(matches.length, 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected(
                  (i) =>
                    (i - 1 + Math.max(matches.length, 1)) %
                    Math.max(matches.length, 1),
                );
              }
              if (e.key === "Enter") {
                e.preventDefault();
                matches[Math.min(selected, matches.length - 1)]?.action();
              }
            }}
          />
        </label>
        {busy && <p role="status">Ищем заметки…</p>}
        {error && <p role="alert">Не удалось выполнить поиск: {error}</p>}
        <div className="trace-command-results" ref={results}>
          {matches.map((m, i) => (
            <button
              key={m.title + i}
              className={selected === i ? "selected" : ""}
              onClick={m.action}
              onMouseEnter={() => setSelected(i)}
            >
              <span>
                <m.icon size={16} />
              </span>
              {m.title}
              <CornerDownLeft size={13} />
            </button>
          ))}
          {!matches.length && !busy && (
            <p>Ничего не найдено. Попробуйте другое название.</p>
          )}
        </div>
        <footer>↑ ↓ выбрать · Enter открыть · Esc закрыть</footer>
      </div>
    </Modal>
  );
}
