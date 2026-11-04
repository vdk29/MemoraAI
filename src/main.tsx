import {
  useCallback,
  useEffect,
  useState,
  useRef,
  lazy,
  Suspense,
} from "react";
import { createRoot } from "react-dom/client";
import type { User } from "@supabase/supabase-js";
import {
  House,
  FileText,
  CalendarDays,
  MessageCircle,
  UserRound,
  Settings,
  Bell,
  Search,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { db, result } from "./lib/supabase";
import {
  workspaceTables,
  workspacePage,
  relatedProfiles,
  appendRows,
  PAGE_SIZE,
  type WorkspaceTable,
} from "./lib/workspace";
import { Dashboard } from "./pages/Dashboard";
import { Auth } from "./pages/Auth";
import { Notes } from "./pages/Notes";
import { Events } from "./pages/Events";
const Social = lazy(() =>
  import("./pages/Social").then((module) => ({ default: module.Social })),
);
import { Profile } from "./pages/Profile";
import { Avatar, Empty } from "./components/ui";
import { ThemeProvider } from "./lib/theme";
import { ThemeToggle } from "./components/ThemeToggle";
import { Mark } from "./components/Identity";
import { CommandPalette } from "./components/CommandPalette";
import { NoteEditor } from "./components/NoteEditor";
import "./style.css";
import "./trace.css";
import "./depth.css";
const nav = [
  ["home", "Главная", House],
  ["notes", "Заметки", FileText],
  ["calendar", "Календарь", CalendarDays],
  ["chats", "Чаты и друзья", MessageCircle],
] as const;
function App() {
  const [commandOpen, setCommandOpen] = useState(false),
    [commandNote, setCommandNote] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [recovery, setRecovery] = useState(false),
    [route, setRoute] = useState(location.hash.slice(1) || "home"),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [search, setSearch] = useState(""),
    [more, setMore] = useState<Record<string, boolean>>({}),
    [pageBusy, setPageBusy] = useState(false);
  useEffect(() => {
    setCommandOpen(false);
    setCommandNote(null);
  }, [user?.id]);
  const requestVersion = useRef(0);
  const sessionUser = useRef<string | undefined>(undefined);
  sessionUser.current = user?.id;
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message || "Не удалось выполнить действие. Попробуйте снова.");
    }
  }, []);
  useEffect(() => {
    const h = () => {
      setRoute(location.hash.slice(1) || "home");
    };
    window.addEventListener("hashchange", h);
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        const field = document.querySelector<HTMLInputElement>(
          '[aria-label="Быстрый поиск"]',
        );
        if (field) {
          e.preventDefault();
          setCommandOpen(true);
        }
      }
    };
    window.addEventListener("keydown", shortcut);
    db.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setUser(data.session?.user || null);
      setReady(true);
    });
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setUser(session?.user || null);
      if (!session) setData(null);
    });
    return () => {
      window.removeEventListener("hashchange", h);
      window.removeEventListener("keydown", shortcut);
      subscription.unsubscribe();
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!user) return;
    const version = ++requestVersion.current;
    const rows = await Promise.all(
      workspaceTables.map((t) => workspacePage(t)),
    );
    const next = Object.fromEntries(
      workspaceTables.map((t, i) => [t, rows[i]]),
    );
    const summaries = (await result(db.rpc("conversation_summaries"))) || [];
    next.conversations = next.conversations
      .map((c) => ({
        ...c,
        ...summaries.find((s: any) => s.conversation_id === c.id),
      }))
      .sort((a, b) =>
        (b.last_at || b.created_at).localeCompare(a.last_at || a.created_at),
      );
    const profiles = await relatedProfiles(user.id, next);
    if (version !== requestVersion.current || sessionUser.current !== user.id)
      return;
    setMore(
      Object.fromEntries(
        workspaceTables.map((t, i) => [t, rows[i].length === PAGE_SIZE]),
      ),
    );
    setData({ ...next, profiles });
  }, [user?.id]);
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    run(refresh).finally(() => setLoading(false));
    let connected = false;
    let refreshTimer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void run(refresh), 180);
    };
    const channel = db
      .channel("user:" + user.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        scheduleRefresh,
      )
      .subscribe((status) => {
        connected = status === "SUBSCRIBED";
        if (connected) scheduleRefresh();
      });
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    const fallback = window.setInterval(() => {
      if (!connected && document.visibilityState === "visible")
        scheduleRefresh();
    }, 30000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(refreshTimer);
      window.clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      void db.removeChannel(channel);
    };
  }, [user?.id, refresh]);
  useEffect(() => {
    const id = route.startsWith("profile/") ? route.split("/")[1] : null;
    if (!id || !user) return;
    let alive = true;
    run(async () => {
      const profile = await result(
        db.from("profiles").select("*").eq("id", id).maybeSingle(),
      );
      if (alive && profile)
        setData((current: any) =>
          current
            ? { ...current, profiles: appendRows(current.profiles, [profile]) }
            : current,
        );
    });
    return () => {
      alive = false;
    };
  }, [route, user?.id, data?.profiles.length]);
  async function loadMore(table: WorkspaceTable) {
    if (pageBusy || !data || !user) return;
    const owner = user.id,
      version = requestVersion.current;
    setPageBusy(true);
    await run(async () => {
      const rows = await workspacePage(table, data[table].length);
      if (sessionUser.current !== owner || version !== requestVersion.current)
        return;
      const next = { ...data, [table]: appendRows(data[table], rows) };
      next.profiles = await relatedProfiles(owner, next);
      if (sessionUser.current !== owner || version !== requestVersion.current)
        return;
      setData(next);
      setMore((current) => ({
        ...current,
        [table]: rows.length === PAGE_SIZE,
      }));
    });
    setPageBusy(false);
  }
  if (!ready) return <div className="loading">Загрузка MEMORA…</div>;
  if (!user || recovery) return <Auth recovery={recovery} />;
  const own = data?.profiles.find((p: any) => p.id === user.id),
    unread = data?.notifications.filter((n: any) => !n.read).length || 0;
  const shared = {
    ...data,
    friends: data?.friendships,
    userId: user.id,
    run,
    refresh,
    search,
  };
  return (
    <div className="app trace-app">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <Mark /> memora<span>2.0</span>
        </a>
        <div className="trace-space">
          <Avatar profile={own} />
          <span>
            {own?.display_name || "Ваше пространство"}
            <small>Личный аккаунт</small>
          </span>
        </div>
        <button
          className="trace-sidebar-command"
          onClick={() => setCommandOpen(true)}
        >
          <Search size={14} />
          Найти или выполнить<kbd>⌘ K</kbd>
        </button>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <a
              key={id}
              href={"#" + id}
              className={route.split("/")[0] === id ? "active" : ""}
            >
              <Icon size={20} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Mark />
          <p>
            Идеи. В фокусе.
            <br />
            Планы. В действии.
          </p>
          <small>Одно место для важного.</small>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <label className="search">
            <Search size={19} />
            <input
              aria-label="Быстрый поиск"
              maxLength={200}
              placeholder="Поиск по заметкам…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!["home", "notes", "favorites"].includes(route))
                  location.hash = "notes";
              }}
            />
            <kbd className="search-key">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} K
            </kbd>
          </label>
          <div className="row">
            <button
              className="trace-command-trigger"
              aria-label="Открыть командную панель"
              onClick={() => setCommandOpen(true)}
            >
              <Search size={16} />
            </button>
            <ThemeToggle />
            <a
              className="notification-button"
              href="#notifications"
              aria-label={`Уведомления: ${unread}`}
            >
              <Bell size={21} />
              {unread > 0 && <b>{unread}</b>}
            </a>
            <details
              className="account-menu"
              onKeyDown={(e) => {
                if (e.key === "Escape") e.currentTarget.open = false;
              }}
            >
              <summary>
                <Avatar profile={own} />
                <span className="user-name">
                  {own?.display_name || "Мой аккаунт"}
                </span>
                <ChevronDown size={15} />
              </summary>
              <div
                className="account-dropdown"
                onClick={(e) =>
                  e.currentTarget.parentElement?.removeAttribute("open")
                }
              >
                <a href="#profile">
                  <UserRound size={16} />
                  Мой профиль
                </a>
                <a href="#settings">
                  <Settings size={16} />
                  Настройки
                </a>
                <button
                  onClick={() =>
                    run(async () => {
                      await result(db.auth.signOut());
                    })
                  }
                >
                  <LogOut size={16} />
                  Выйти
                </button>
              </div>
            </details>
          </div>
        </header>
        {commandOpen && data && (
          <CommandPalette
            notes={data.notes}
            close={() => setCommandOpen(false)}
            openNote={(n: any) => {
              setCommandOpen(false);
              setCommandNote(n);
            }}
          />
        )}
        {commandNote && data && (
          <NoteEditor
            note={commandNote}
            close={() => setCommandNote(null)}
            categories={data.categories}
            userId={user.id}
            run={run}
            refresh={refresh}
          />
        )}
        <main className="content">
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => run(refresh)}>Повторить загрузку</button>
              <button aria-label="Закрыть ошибку" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {loading && <p role="status">Загружаем ваше пространство…</p>}
          {data &&
            Object.entries(more)
              .filter(
                ([table, available]) =>
                  available &&
                  ((table === "categories" &&
                    ["notes", "favorites"].includes(route)) ||
                    (table === "notes" && route === "notes" && !search) ||
                    (["friendships", "conversations"].includes(table) &&
                      route.startsWith("chats")) ||
                    (table === "notifications" && route === "notifications")),
              )
              .map(([table]) => (
                <button
                  key={table}
                  disabled={pageBusy}
                  onClick={() => loadMore(table as WorkspaceTable)}
                >
                  {pageBusy
                    ? "Загрузка…"
                    : `Загрузить ещё: ${{ notes: "заметки", categories: "категории", events: "события", friendships: "друзья и заявки", conversations: "переписки", notifications: "уведомления" }[table]}`}
                </button>
              ))}
          {data && (
            <>
              {route === "home" ? (
                <Dashboard data={data} own={own} shared={shared} />
              ) : route === "notes" || route === "favorites" ? (
                <Notes {...shared} favorites={route === "favorites"} />
              ) : route === "calendar" || route === "events" ? (
                <section className="calendar-page">
                  <Events {...shared} calendar />
                </section>
              ) : route.startsWith("chats") ? (
                <Suspense fallback={<p role="status">Загружаем общение…</p>}>
                  <Social
                    {...shared}
                    initialPeer={
                      route.split("/")[1] === "people"
                        ? ""
                        : route.split("/")[1] || ""
                    }
                    initialTab={
                      route === "chats/people" ? "people" : "messages"
                    }
                  />
                </Suspense>
              ) : route.startsWith("profile") || route === "settings" ? (
                <Profile
                  key={route + own?.avatar_path}
                  profile={
                    route.includes("/")
                      ? data.profiles.find(
                          (p: any) => p.id === route.split("/")[1],
                        )
                      : own
                  }
                  user={user}
                  run={run}
                  refresh={refresh}
                  settings={route === "settings"}
                  preferences={data.settings[0]}
                  friends={data.friendships}
                />
              ) : route === "notifications" ? (
                <section className="panel">
                  <header className="section-head">
                    <h1>Уведомления</h1>
                    <button
                      onClick={() =>
                        run(async () => {
                          await result(
                            db
                              .from("notifications")
                              .update({ read: true })
                              .eq("user_id", user.id),
                          );
                          await refresh();
                        })
                      }
                    >
                      Прочитать все
                    </button>
                  </header>
                  {data.notifications.map((n: any) => (
                    <button
                      className={"event-row " + (!n.read ? "unread" : "")}
                      key={n.id}
                      onClick={() =>
                        run(async () => {
                          await result(
                            db
                              .from("notifications")
                              .update({ read: true })
                              .eq("id", n.id),
                          );
                          await refresh();
                          location.hash =
                            n.kind === "message"
                              ? "chats/" + n.actor_id
                              : "chats/people";
                        })
                      }
                    >
                      <Bell size={18} />
                      <span>
                        {n.kind === "message"
                          ? "Новое сообщение"
                          : n.kind === "friend_request"
                            ? "Новая заявка в друзья"
                            : "Заявка принята"}
                        <small>
                          {
                            data.profiles.find((p: any) => p.id === n.actor_id)
                              ?.display_name
                          }{" "}
                          · {new Date(n.created_at).toLocaleString("ru-RU")}
                        </small>
                      </span>
                      {!n.read && <i className="dot" />}
                    </button>
                  ))}
                  {!data.notifications.length && (
                    <Empty title="Вы ничего не пропустили" />
                  )}
                </section>
              ) : (
                <Empty title="Страница не найдена">
                  <a href="#home">На главную</a>
                </Empty>
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          MEMORA <span>Идеи, планы и люди — в одном месте</span>
        </footer>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
