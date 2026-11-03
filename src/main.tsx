import { useCallback, useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { User } from "@supabase/supabase-js";
import {
  Leaf,
  House,
  FileText,
  CalendarDays,
  List,
  MessageCircle,
  Star,
  UserRound,
  Settings,
  Bell,
  Search,
  ArrowUpRight,
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
import { Auth } from "./pages/Auth";
import { Notes } from "./pages/Notes";
import { Events } from "./pages/Events";
import { Social } from "./pages/Social";
import { Profile } from "./pages/Profile";
import { Avatar, Empty } from "./components/ui";
import "./style.css";
const nav = [
  ["home", "Главная", House],
  ["notes", "Заметки", FileText],
  ["calendar", "Календарь", CalendarDays],
  ["events", "События", List],
  ["chats", "Чаты и друзья", MessageCircle],
  ["favorites", "Избранное", Star],
  ["profile", "Профиль", UserRound],
  ["settings", "Настройки", Settings],
] as const;
function App() {
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
      setSearch("");
    };
    window.addEventListener("hashchange", h);
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
        () => run(refresh),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => run(refresh),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => run(refresh),
      )
      .subscribe();
    return () => {
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
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <Leaf size={27} /> MEMORA<span>2.0</span>
        </a>
        <span className="workspace">ЛИЧНОЕ ПРОСТРАНСТВО</span>
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
          <Leaf size={25} />
          <p>
            Сохраняйте мысли.
            <br />
            Освобождайте внимание.
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
              placeholder="Поиск по заметкам…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!["home", "notes", "favorites"].includes(route))
                  location.hash = "notes";
              }}
            />
          </label>
          <div className="row">
            <a
              className="notification-button"
              href="#notifications"
              aria-label={`Уведомления: ${unread}`}
            >
              <Bell size={21} />
              {unread > 0 && <b>{unread}</b>}
            </a>
            <a href="#profile" className="row">
              <Avatar profile={own} />
              <span className="user-name">{own?.display_name}</span>
            </a>
          </div>
        </header>
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
                  (table === "categories" ||
                    (table === "notes" &&
                      ["home", "notes", "favorites"].includes(route)) ||
                    (table === "events" &&
                      ["home", "calendar", "events"].includes(route)) ||
                    (["friendships", "conversations"].includes(table) &&
                      route === "chats") ||
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
                <>
                  <header className="page-title">
                    <div>
                      <span className="eyebrow">ВАШ ДЕНЬ, В ВАШЕМ РИТМЕ</span>
                      <h1>Здравствуйте, {own?.display_name || "друг"}.</h1>
                      <p>Место, где мысли становятся планами.</p>
                    </div>
                    <span className="today">
                      {new Date().toLocaleDateString("ru-RU", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </header>
                  <section className="welcome">
                    <div>
                      <span className="eyebrow">ПРОСТРАНСТВО ДЛЯ ВАЖНОГО</span>
                      <h2>
                        Хорошие идеи начинаются
                        <br />
                        со свободной мысли.
                      </h2>
                      <p>Запишите, что у вас на уме. Остальное подождёт.</p>
                      <div className="row">
                        <a className="button primary" href="#notes">
                          Создать заметку <ArrowUpRight size={16} />
                        </a>
                        <a className="button" href="#calendar">
                          Запланировать событие
                        </a>
                      </div>
                    </div>
                    <Leaf className="hero-leaf" size={150} strokeWidth={0.7} />
                  </section>
                  <div className="dashboard">
                    <div>
                      <section className="panel">
                        <Notes {...shared} compact />
                      </section>
                      <section className="panel">
                        <header className="section-head">
                          <h2>Избранное</h2>
                          <a href="#favorites">
                            Открыть <ArrowUpRight size={15} />
                          </a>
                        </header>
                        {data.notes
                          .filter((n: any) => n.favorite)
                          .slice(0, 3)
                          .map((n: any) => (
                            <a
                              className="event-row"
                              href="#favorites"
                              key={n.id}
                            >
                              <Star size={18} />
                              {n.title}
                            </a>
                          ))}
                        {!data.notes.some((n: any) => n.favorite) && (
                          <Empty title="Важное всегда под рукой">
                            Отметьте заметку звёздочкой.
                          </Empty>
                        )}
                      </section>
                      <section className="panel">
                        <header className="section-head">
                          <h2>Последние переписки</h2>
                          <a href="#chats">Все чаты</a>
                        </header>
                        {data.conversations.slice(0, 3).map((c: any) => (
                          <a className="event-row" href="#chats" key={c.id}>
                            <MessageCircle size={20} />
                            {data.profiles.find(
                              (p: any) =>
                                p.id ===
                                (c.user_a === user.id ? c.user_b : c.user_a),
                            )?.display_name || "Переписка"}
                          </a>
                        ))}
                        {!data.conversations.length && (
                          <Empty title="Оставайтесь на связи">
                            Найдите друзей и начните разговор.
                          </Empty>
                        )}
                      </section>
                    </div>
                    <aside>
                      <section className="panel">
                        <Events {...shared} compact />
                      </section>
                      <section className="panel calm">
                        <Leaf size={26} />
                        <h3>Всё начинается с одной мысли.</h3>
                        <p>
                          Не обязательно держать всё в голове. Для этого есть
                          MEMORA.
                        </p>
                      </section>
                    </aside>
                  </div>
                </>
              ) : route === "notes" || route === "favorites" ? (
                <Notes {...shared} favorites={route === "favorites"} />
              ) : route === "calendar" || route === "events" ? (
                <section className="panel">
                  <Events {...shared} calendar={route === "calendar"} />
                </section>
              ) : route === "chats" ? (
                <Social {...shared} />
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
                            n.kind === "message" ? "chats" : "chats";
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
          MEMORA <span>Ваше спокойное цифровое пространство</span>
        </footer>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
