import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  FileText,
  CalendarDays,
  MessagesSquare,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Command,
  CornerDownLeft,
  MoreHorizontal,
  Star,
  Check,
  CheckCheck,
  X,
  LayoutGrid,
  List,
  Link2,
  Clock,
  PanelRight,
  Folder,
  Settings,
  LogIn,
  Bookmark,
  Send,
  Paperclip,
  SlidersHorizontal,
  ArrowDown,
  Dot,
  Sparkles,
} from "lucide-react";
import "./styles.css";
const params = new URLSearchParams(location.search),
  concept = params.get("concept") === "b" ? "b" : "a";
const seed = [
  {
    id: "01",
    title: "Пространство для хороших идей",
    description: "Как собрать всё важное и не потерять фокус.",
    body: "Хорошие идеи редко приходят по расписанию. Поэтому им нужно место, в котором они смогут остаться.\n\nЗдесь — мысли о новом проекте, наблюдения из разговора и то, к чему хочется вернуться. Без лишней структуры в момент записи. С ясной структурой, когда она понадобится.",
    tag: "Проект MEMORA",
    date: "Сегодня, 10:24",
    cover: "lens",
    favorite: true,
  },
  {
    id: "02",
    title: "О внимании и глубокой работе",
    description: "Наблюдения после недели без лишних переключений.",
    body: "Один фокус на один отрезок времени.\n\n— Сначала определить следующий шаг.\n— Убрать всё, что отвлекает.\n— Оставить пространство для неожиданного решения.",
    tag: "Личное",
    date: "Вчера, 18:40",
    favorite: true,
  },
  {
    id: "03",
    title: "Следующий релиз",
    description: "Идеи, решения и вопросы к встрече в четверг.",
    body: "Что мы хотим сделать лучше?\n\n1. Простое начало работы.\n2. Ясная навигация.\n3. Инструменты, которые не мешают думать.\n\nОбсудить с командой приоритеты и критерии готовности.",
    tag: "Работа",
    date: "Вчера, 12:10",
    favorite: false,
  },
  {
    id: "04",
    title: "Книги на ноябрь",
    description: "Небольшой список для новых перспектив.",
    body: "Книги, из которых хочется не только выписать цитаты, но и попробовать идеи в действии.\n\nДобавлять по одной книге. Оставлять после неё одну мысль.",
    tag: "Библиотека",
    date: "2 ноября",
    favorite: false,
  },
];
function Mark() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <path
        d="M7 10a9 9 0 0 1 18 0v12a5 5 0 0 1-10 0V11a2 2 0 0 1 4 0v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M7 10v11a9 9 0 0 0 18 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity=".4"
      />
    </svg>
  );
}
function App() {
  const [theme, applyTheme] = useState(
      params.get("theme") === "light" ? "light" : "dark",
    ),
    [appearance, setAppearance] = useState(params.get("theme") || "dark"),
    [screen, setScreen] = useState(
      params.get("screen") === "auth" ? "auth" : "home",
    ),
    [section, setSection] = useState("home"),
    [notes, setNotes] = useState(() => {
      try {
        return (
          JSON.parse(localStorage.getItem("memora-prototype-" + concept)) ||
          seed
        );
      } catch {
        return seed;
      }
    }),
    [note, setNote] = useState(null),
    [palette, setPalette] = useState(false),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(0),
    [capture, setCapture] = useState(""),
    [toast, setToast] = useState(""),
    [view, setView] = useState(concept === "a" ? "list" : "grid"),
    [chat, setChat] = useState(false),
    [message, setMessage] = useState(""),
    [messages, setMessages] = useState([
      "Привет! Посмотрим идеи к следующему релизу?",
    ]),
    [month, setMonth] = useState(10),
    [day, setDay] = useState(4),
    [saved, setSaved] = useState(false),
    [closing, setClosing] = useState(false),
    [busy, setBusy] = useState(false);
  const setTheme = (value) => {
    const next = typeof value === "function" ? value(theme) : value;
    setAppearance(next);
    applyTheme(
      next === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next,
    );
  };
  useEffect(() => {
    if (appearance !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [appearance]);
  const origin = useRef(null);
  const focus = useRef(null),
    previousFocus = useRef(null),
    toastTimer = useRef(null),
    closeTimer = useRef(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.concept = concept;
    document.documentElement.style.colorScheme = theme;
    const url = new URL(location);
    url.searchParams.set("concept", concept);
    url.searchParams.set("theme", appearance);
    url.searchParams.set("screen", screen);
    history.replaceState(null, "", url);
  }, [theme, appearance, screen]);
  useEffect(() => {
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setPalette((p) => !p);
      }
      if (e.key === "Escape") {
        setPalette(false);
        if (document.querySelector(".note-sheet")) closeNote();
        else setNote(null);
        setChat(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "memora-prototype-" + concept,
        JSON.stringify(notes),
      );
    } catch {}
  }, [notes]);
  useLayoutEffect(() => {
    if (palette || note || chat) {
      previousFocus.current = document.activeElement;
      document.body.style.overflow = "hidden";
      document
        .querySelector(
          '[role="dialog"] input,[role="dialog"] textarea,[role="dialog"] button',
        )
        ?.focus();
    } else {
      document.body.style.overflow = "";
      previousFocus.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [palette, !!note, chat]);
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );
  const tell = (text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  };
  const navigate = (id) => {
    setSection(id);
    setScreen("home");
    setPalette(false);
  };
  const newNote = () => {
    clearTimeout(closeTimer.current);
    setClosing(false);
    origin.current = null;
    setPalette(false);
    setSaved(false);
    setNote({
      id: null,
      title: "",
      body: "",
      tag: "Личное",
      date: "Только что",
    });
  };
  function openNote(n, e) {
    clearTimeout(closeTimer.current);
    setClosing(false);
    origin.current = e?.currentTarget?.getBoundingClientRect() || null;
    n = n || seed[2];
    setSaved(false);
    setNote({ ...n });
    setPalette(false);
  }
  useLayoutEffect(() => {
    if (
      !note ||
      concept !== "b" ||
      !origin.current ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const el = document.querySelector(".note-sheet"),
      to = el.getBoundingClientRect(),
      from = origin.current;
    el.animate(
      [
        {
          opacity: 0.2,
          transform: `translate(${from.x + from.width / 2 - to.x - to.width / 2}px,${from.y + from.height / 2 - to.y - to.height / 2}px) scale(${Math.max(0.18, from.width / to.width)},${Math.max(0.1, from.height / to.height)})`,
        },
        { opacity: 1, transform: "none" },
      ],
      { duration: 430, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  }, [!!note]);
  function closeNote() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setNote(null);
      return;
    }
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setNote(null);
      setClosing(false);
    }, 190);
  }
  function saveNote() {
    if (!note.title.trim()) {
      tell("Добавьте название заметки");
      return;
    }
    const next = {
      ...note,
      id: note.id || "note-" + Date.now(),
      description: note.body.split("\n")[0] || "Новая заметка",
      date: "Только что",
    };
    setNotes((current) =>
      current.some((n) => n.id === next.id)
        ? current.map((n) => (n.id === next.id ? next : n))
        : [next, ...current],
    );
    setNote(next);
    setSaved(true);
    tell("Заметка сохранена в демо-пространстве");
  }
  function quickSave() {
    if (!capture.trim()) {
      focus.current?.focus();
      return;
    }
    setNotes((n) => [
      {
        id: "capture-" + Date.now(),
        title: capture.trim().split("\n")[0].slice(0, 90),
        description: "Новая мысль",
        body: capture.trim(),
        tag: "Входящие",
        date: "Только что",
      },
      ...n,
    ]);
    setCapture("");
    tell("Мысль сохранена");
  }
  const actions = [
    { title: "Новая заметка", meta: "Создать", icon: Plus, action: newNote },
    {
      title: "Главная",
      meta: "Перейти",
      icon: Home,
      action: () => navigate("home"),
    },
    {
      title: "Заметки",
      meta: "Перейти",
      icon: FileText,
      action: () => navigate("notes"),
    },
    {
      title: "Календарь",
      meta: "Перейти",
      icon: CalendarDays,
      action: () => navigate("calendar"),
    },
    {
      title: "Чаты и друзья",
      meta: "Перейти",
      icon: MessagesSquare,
      action: () => {
        setPalette(false);
        setChat(true);
      },
    },
    {
      title: theme === "dark" ? "Светлая тема" : "Тёмная тема",
      meta: "Оформление",
      icon: theme === "dark" ? Sun : Moon,
      action: () => {
        setTheme((t) => (t === "dark" ? "light" : "dark"));
        setPalette(false);
      },
    },
  ];
  actions.push({
    title: "Системная тема",
    meta: "Оформление устройства",
    icon: Monitor,
    action: () => {
      setTheme("system");
      setPalette(false);
    },
  });
  actions.push(
    {
      title: "Пустое пространство",
      meta: "Посмотреть состояние",
      icon: Folder,
      action: () => {
        setNotes([]);
        setPalette(false);
        navigate("home");
        tell(
          "Пустое демо-пространство. Данные можно восстановить через команды.",
        );
      },
    },
    {
      title: "Восстановить демоданные",
      meta: "Демонстрация",
      icon: Plus,
      action: () => {
        setNotes(seed);
        setPalette(false);
        tell("Демонстрационные заметки восстановлены");
      },
    },
  );
  const matches = [
    ...notes
      .filter((n) =>
        (n.title + " " + n.body).toLowerCase().includes(query.toLowerCase()),
      )
      .map((n) => ({
        title: n.title,
        meta: n.tag,
        icon: FileText,
        action: () => openNote(n),
      })),
    ...actions.filter((a) =>
      a.title.toLowerCase().includes(query.toLowerCase()),
    ),
  ];

  const trap = (e) => {
    if (e.key !== "Tab") return;
    const els = [
      ...e.currentTarget.querySelectorAll(
        'button,input,textarea,[tabindex="0"]',
      ),
    ].filter((el) => !el.disabled);
    if (e.shiftKey && document.activeElement === els[0]) {
      e.preventDefault();
      els.at(-1)?.focus();
    } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
      e.preventDefault();
      els[0]?.focus();
    }
  };
  function Calendar({ large = false }) {
    const label = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];
    return (
      <section className={"mini-calendar " + (large ? "large-calendar" : "")}>
        <header>
          <span>
            {label[((month % 12) + 12) % 12]}{" "}
            <em>{2026 + Math.floor(month / 12)}</em>
          </span>
          <div>
            <button
              aria-label="Предыдущий месяц"
              onClick={() => setMonth((m) => m - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              aria-label="Следующий месяц"
              onClick={() => setMonth((m) => m + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </header>
        <div className="calendar-grid">
          {["П", "В", "С", "Ч", "П", "С", "В"].map((d, i) => (
            <small key={i}>{d}</small>
          ))}
          {Array.from({ length: 42 }, (_, i) => {
            const first = new Date(2026, month, 1),
              cell = new Date(2026, month, i - ((first.getDay() + 6) % 7) + 1),
              d = cell.getDate(),
              outside = cell.getMonth() !== first.getMonth();
            return (
              <button
                key={i}
                className={outside ? "dim" : d === day ? "chosen" : ""}
                disabled={outside}
                onClick={() => {
                  if (!outside) setDay(d);
                }}
              >
                {d}
                {!outside && [4, 12, 18].includes(d) && <i />}
              </button>
            );
          })}
        </div>
        {large && (
          <div className="calendar-detail">
            <h3>
              {day} {label[((month % 12) + 12) % 12].toLowerCase()} / ваш день
            </h3>
            <button
              className="day-plan"
              onClick={() => openNote(notes[2] || notes[0])}
            >
              <span>14:00</span>
              <strong>Следующий релиз</strong>
              <ArrowUpRight size={15} />
            </button>
            <button
              onClick={() => {
                newNote();
                tell("Заметка на выбранный день — демонстрация");
              }}
              className="text-button"
            >
              <Plus size={14} />
              Заметка на этот день
            </button>
          </div>
        )}
      </section>
    );
  }
  function Upcoming() {
    return (
      <section className="upcoming">
        <div className="section-label">
          <span>Далее по плану</span>
          <span>СЕГОДНЯ</span>
        </div>
        <button onClick={() => openNote(notes[2] || notes[0])}>
          <span className="time-block">
            14:00<small>30 мин</small>
          </span>
          <div>
            <strong>Следующий релиз</strong>
            <small>Идеи, решения, следующие шаги</small>
          </div>
          <ArrowUpRight size={14} />
        </button>
      </section>
    );
  }
  function Chats() {
    return (
      <section className="recent-chats">
        <div className="section-label">
          <span>На связи</span>
          <button onClick={() => setChat(true)}>
            Все чаты
            <ArrowUpRight size={12} />
          </button>
        </div>
        {[
          ["Даниил", "Д", "Посмотрим идеи к релизу?", "12:08"],
          ["Мария", "М", "Спасибо, сохранила заметку", "Вчера"],
        ].map(([name, initial, text, time], i) => (
          <button
            className="chat-person"
            key={name}
            onClick={() => setChat(true)}
          >
            <span className={"avatar avatar-" + i}>
              {initial}
              <i />
            </span>
            <span>
              <strong>{name}</strong>
              <small>{text}</small>
            </span>
            <span className="chat-time">
              {time}
              {i === 0 && <b>1</b>}
            </span>
          </button>
        ))}
      </section>
    );
  }
  function Capture() {
    return (
      <section className="capture">
        <div className="capture-top">
          <span className="capture-icon">
            <Plus size={17} />
          </span>
          <strong>
            {concept === "a"
              ? "Что у вас на уме?"
              : "Момент ясности начинается здесь."}
          </strong>
          <span className="subtle">Быстрая заметка</span>
        </div>
        <textarea
          ref={focus}
          aria-label="Быстрая заметка"
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          placeholder={
            concept === "a"
              ? "Запишите мысль. Вернитесь к ней, когда будет нужно."
              : "Идея, наблюдение или вопрос. Просто начните писать…"
          }
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") quickSave();
          }}
        />
        <footer>
          <span>
            <FileText size={13} />
            Входящие <ChevronDown size={11} />
          </span>
          <button className="primary" onClick={quickSave}>
            Сохранить
            <CornerDownLeft size={13} />
          </button>
        </footer>
      </section>
    );
  }
  function NoteCards() {
    return (
      <section className="materials">
        <div className="materials-heading">
          <div>
            <span className="eyebrow">ВАША БИБЛИОТЕКА</span>
            <h2>{section === "notes" ? "Все заметки" : "К чему вернуться"}</h2>
          </div>
          <div
            className="view-switch"
            role="group"
            aria-label="Отображение заметок"
          >
            <button
              aria-label="Карточки"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              aria-label="Список"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List size={15} />
            </button>
          </div>
        </div>
        <div className={"notes-collection " + view}>
          {!notes.length && (
            <div className="empty-library">
              <div className="empty-mark">
                <Mark />
              </div>
              <h3>Здесь начинается ваша библиотека.</h3>
              <p>Одна мысль сегодня. Что-то важное завтра.</p>
              <button className="primary" onClick={newNote}>
                <Plus size={14} />
                Первая заметка
              </button>
            </div>
          )}
          {notes.map((n, i) => (
            <button
              className={"note-card " + (n.cover ? "with-cover" : "")}
              key={n.id}
              onClick={(e) => openNote(n, e)}
              style={{ "--order": i }}
            >
              {n.cover && (
                <div className="note-cover">
                  <div className="orbital-lines" />
                  <span>
                    MEMORA
                    <br />
                    FIELD NOTES / 001
                  </span>
                </div>
              )}
              <div className="note-info">
                <div className="note-top">
                  <span className="note-symbol">
                    <FileText size={16} />
                  </span>
                  {n.favorite ? (
                    <Star size={12} fill="currentColor" />
                  ) : (
                    <MoreHorizontal size={16} />
                  )}
                </div>
                <h3>{n.title}</h3>
                <p>{n.description}</p>
                <footer>
                  <span>{n.tag}</span>
                  <time>{n.date}</time>
                </footer>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }
  return (
    <div className={"prototype " + concept}>
      {screen === "auth" ? (
        <main className="auth-scene">
          <div className="auth-brand">
            <Mark />
            <span>memora</span>
          </div>
          <div className="auth-art">
            <div className="memory-art" />
            <span className="art-caption">
              EVERY THOUGHT
              <br />
              LEAVES A TRACE.
            </span>
            <div className="art-coordinates">
              MEMORA® / PERSONAL SPACE
              <br />
              FORM STUDY — {concept === "a" ? "01" : "02"}
            </div>
          </div>
          <section className="auth-form">
            <span className="eyebrow">ВАШЕ ЛИЧНОЕ ПРОСТРАНСТВО</span>
            <h1>
              {concept === "a" ? (
                "С возвращением."
              ) : (
                <>
                  Важное
                  <br />
                  остаётся с вами.
                </>
              )}
            </h1>
            <p>Для мыслей, которые заслуживают продолжения.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setBusy(true);
                setTimeout(() => {
                  setScreen("home");
                  setBusy(false);
                }, 350);
              }}
            >
              <label>
                Email
                <input
                  type="email"
                  defaultValue="anna@example.invalid"
                  aria-label="Email"
                />
              </label>
              <label>
                Пароль
                <input
                  type="password"
                  placeholder="Демонстрационный пароль"
                  aria-label="Пароль"
                />
              </label>
              <button className="primary auth-submit" disabled={busy}>
                {busy ? "Открываем пространство…" : "Открыть демо-пространство"}
                <ArrowRight size={16} />
              </button>
            </form>
            <p className="auth-disclaimer">
              Визуальный прототип. Данные формы не отправляются.
            </p>
            <button
              className="text-button"
              onClick={() => {
                setScreen("home");
                newNote();
              }}
            >
              Впервые здесь? Посмотреть, как это работает
              <ArrowUpRight size={13} />
            </button>
          </section>
        </main>
      ) : (
        <>
          <aside className="sidebar">
            <a
              className="brand"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("home");
              }}
            >
              <Mark />
              <span>memora</span>
              <span className="brand-dot" />
            </a>
            <button
              className="workspace-switch"
              onClick={() => tell("Личное пространство · демонстрация")}
            >
              <span className="workspace-avatar">А</span>
              <span>
                Пространство Анны<small>Личный аккаунт</small>
              </span>
              <ChevronDown size={13} />
            </button>
            <button className="sidebar-search" onClick={() => setPalette(true)}>
              <Search size={14} />
              Быстрый поиск<kbd>⌘ K</kbd>
            </button>
            <nav>
              {[
                ["home", "Обзор", Home],
                ["notes", "Заметки", FileText],
                ["calendar", "Календарь", CalendarDays],
                ["chats", "Люди и чаты", MessagesSquare],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={section === id ? "active" : ""}
                  onClick={() =>
                    id === "chats" ? setChat(true) : navigate(id)
                  }
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {id === "notes" && <small>{notes.length}</small>}
                  {id === "chats" && <i />}
                </button>
              ))}
            </nav>
            <div className="sidebar-divider" />
            <div className="sidebar-label">
              ЗАКРЕПЛЕНО{" "}
              <button
                aria-label="Добавить закреплённую заметку"
                onClick={newNote}
              >
                <Plus size={12} />
              </button>
            </div>
            {notes
              .filter((n) => n.favorite)
              .slice(0, 2)
              .map((n) => (
                <button
                  className="pinned"
                  key={n.id}
                  onClick={(e) => openNote(n, e)}
                >
                  <Bookmark size={13} />
                  <span>{n.title}</span>
                </button>
              ))}
            <div className="sidebar-bottom">
              <div className="space-status">
                <span />
                Всё на своём месте<small>Демо-пространство</small>
              </div>
              <button
                className="account-button"
                onClick={() => setScreen("auth")}
              >
                <span className="avatar">А</span>
                <span>
                  Анна Морозова<small>Личное пространство</small>
                </span>
                <LogIn size={15} />
              </button>
            </div>
          </aside>
          <div className="workspace">
            <header className="topbar">
              <div className="breadcrumb">
                <span>Личное пространство</span>
                <ChevronRight size={12} />
                <strong>
                  {section === "home"
                    ? "Обзор"
                    : section === "notes"
                      ? "Заметки"
                      : "Календарь"}
                </strong>
              </div>
              <div className="top-actions">
                <button
                  className="command-trigger"
                  onClick={() => setPalette(true)}
                >
                  <Search size={15} />
                  <span>Найти или выполнить…</span>
                  <kbd>⌘ K</kbd>
                </button>
                <button className="new-top" onClick={newNote}>
                  <Plus size={16} />
                  Создать
                </button>
                <span className="tiny-avatar">А</span>
              </div>
            </header>
            <main className="canvas" key={section}>
              {section === "calendar" ? (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">ВРЕМЯ ДЛЯ ВАЖНОГО</span>
                      <h1>Ваш календарь</h1>
                    </div>
                    <button className="primary" onClick={newNote}>
                      <Plus size={15} />
                      Новая запись
                    </button>
                  </div>
                  {Calendar({ large: true })}
                </>
              ) : section === "notes" ? (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">СОБРАНО В ОДНОМ МЕСТЕ</span>
                      <h1>Идеи, к которым вы вернётесь.</h1>
                    </div>
                    <button className="primary" onClick={newNote}>
                      <Plus size={15} />
                      Новая заметка
                    </button>
                  </div>
                  {NoteCards()}
                </>
              ) : (
                <div className="dashboard">
                  <div className="main-column">
                    <section className="greeting">
                      <div className="greeting-copy">
                        <span className="eyebrow">
                          <span className="status-point" />
                          СРЕДА, 4 НОЯБРЯ
                        </span>
                        <h1>
                          {concept === "a" ? (
                            <>
                              Хороший день,
                              <br className="mobile-break" /> чтобы начать.
                            </>
                          ) : (
                            <>
                              Ваши мысли.
                              <br />
                              <span>Связанные воедино.</span>
                            </>
                          )}
                        </h1>
                        <p>
                          {concept === "a"
                            ? "С возвращением, Анна. Всё важное — перед вами."
                            : "Не просто сохранить. Увидеть связи, найти смысл и сделать следующий шаг."}
                        </p>
                        {concept === "b" && (
                          <button
                            className="hero-action"
                            onClick={() => {
                              focus.current?.focus();
                              focus.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });
                            }}
                          >
                            Зафиксировать мысль
                            <ArrowUpRight size={16} />
                          </button>
                        )}
                      </div>
                      {concept === "a" ? (
                        <div className="trace-emblem">
                          <Mark />
                          <span>
                            YOUR MIND,
                            <br />
                            IN ONE PLACE.
                          </span>
                          <div className="trace-orbit" />
                        </div>
                      ) : (
                        <div className="memory-art">
                          <span className="art-index">01 / MEMORY LENS</span>
                        </div>
                      )}
                    </section>
                    {Capture()}
                    {NoteCards()}
                  </div>
                  <aside className="right-column">
                    <div className="right-heading">
                      <span className="eyebrow">ВАШ ДЕНЬ</span>
                      <span>GMT+3</span>
                    </div>
                    {Calendar({})}
                    {Upcoming()}
                    {Chats()}
                    <div className="sidebar-quote">
                      <span className="trace-dot" />
                      <p>
                        Идея может прийти за секунду.
                        <br />
                        Дайте ей больше времени.
                      </p>
                    </div>
                  </aside>
                </div>
              )}
            </main>
            <footer className="workspace-footer">
              <span>
                <span className="online-dot" />
                Демонстрационное пространство
              </span>
              <button onClick={() => setPalette(true)}>
                <Command size={11} />
                Команды
              </button>
              <span>Создано, чтобы думать яснее.</span>
            </footer>
          </div>
          <nav className="mobile-nav">
            {[
              ["home", "Обзор", Home],
              ["notes", "Заметки", FileText],
              ["calendar", "Календарь", CalendarDays],
              ["chats", "Чаты", MessagesSquare],
            ].map(([id, label, Icon]) => (
              <button
                className={section === id ? "active" : ""}
                key={id}
                onClick={() => (id === "chats" ? setChat(true) : navigate(id))}
              >
                <Icon size={19} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </>
      )}
      <div className="preview-dock">
        <span className="concept-label">КОНЦЕПТ {concept.toUpperCase()}</span>
        <a
          href={"?concept=" + (concept === "a" ? "b" : "a") + "&theme=" + theme}
        >
          Сравнить {concept === "a" ? "B" : "A"}
          <ArrowUpRight size={11} />
        </a>
        <button
          aria-label="Переключить тему"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
        <button
          aria-label="Системная тема"
          aria-pressed={appearance === "system"}
          title="Следовать теме устройства"
          onClick={() => setTheme("system")}
        >
          <Monitor size={13} />
        </button>
        <button
          onClick={() => setScreen((s) => (s === "auth" ? "home" : "auth"))}
        >
          {screen === "auth" ? <Home size={13} /> : <LogIn size={13} />}
          <span>{screen === "auth" ? "Обзор" : "Вход"}</span>
        </button>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={13} />
          </span>
          {toast}
        </div>
      )}
      {note && (
        <div
          className={"overlay note-overlay " + (closing ? "closing" : "")}
          onKeyDown={trap}
        >
          <section
            className="note-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Редактор заметки"
          >
            <header>
              <span>
                <FileText size={14} />
                {note.tag}
                <ChevronRight size={11} />
                <span>Заметка</span>
              </span>
              <div>
                <button
                  aria-label="Добавить в избранное"
                  className={note.favorite ? "favorited" : ""}
                  onClick={() =>
                    setNote((n) => ({ ...n, favorite: !n.favorite }))
                  }
                >
                  <Star
                    size={15}
                    fill={note.favorite ? "currentColor" : "none"}
                  />
                </button>
                <button aria-label="Закрыть заметку" onClick={closeNote}>
                  <X size={18} />
                </button>
              </div>
            </header>
            {note.cover && (
              <div className="sheet-cover">
                <div className="orbital-lines" />
                <span>MEMORA / FIELD NOTES</span>
              </div>
            )}
            <div className="sheet-body">
              <span className="eyebrow">{note.date} · ЛИЧНАЯ ЗАМЕТКА</span>
              <input
                aria-label="Название заметки"
                placeholder="Без названия"
                className="note-title"
                value={note.title}
                onChange={(e) => {
                  setSaved(false);
                  setNote((n) => ({ ...n, title: e.target.value }));
                }}
              />
              <div className="editor-toolbar">
                <span>
                  Текст
                  <ChevronDown size={11} />
                </span>
                <i />
                <button
                  onClick={() =>
                    setNote((n) => ({ ...n, body: n.body + "\n\n— " }))
                  }
                  aria-label="Добавить пункт списка"
                >
                  <List size={15} />
                </button>
                <button
                  onClick={() => {
                    setNote((n) => ({ ...n, body: n.body + "\nhttps://" }));
                    tell("Добавлена строка для ссылки");
                  }}
                  aria-label="Добавить ссылку"
                >
                  <Link2 size={15} />
                </button>
              </div>
              <textarea
                aria-label="Текст заметки"
                value={note.body}
                placeholder="Начните с одной мысли…"
                onChange={(e) => {
                  setSaved(false);
                  setNote((n) => ({ ...n, body: e.target.value }));
                }}
              />
              <div className="linked-note">
                <Link2 size={14} />
                <span>Связано с пространством</span>
                <b>{note.tag}</b>
              </div>
            </div>
            <footer>
              <span>
                {saved ? (
                  <>
                    <CheckCheck size={14} />
                    Сохранено локально
                  </>
                ) : (
                  <>
                    <span className="status-point" />
                    Только в этом прототипе
                  </>
                )}
              </span>
              <button className="primary" onClick={saveNote}>
                Сохранить
                <Check size={14} />
              </button>
            </footer>
          </section>
        </div>
      )}
      {palette && (
        <div className="overlay command-overlay" onKeyDown={trap}>
          <section
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Командная панель"
          >
            <div className="palette-input">
              <Search size={19} />
              <input
                aria-label="Найти заметку или команду"
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
                        (i - 1 + matches.length) % Math.max(matches.length, 1),
                    );
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    matches[
                      Math.min(
                        Math.max(Number.isFinite(selected) ? selected : 0, 0),
                        Math.max(matches.length - 1, 0),
                      )
                    ]?.action();
                  }
                }}
                placeholder="Найти заметку или выполнить команду…"
              />
              <button
                onClick={() => setPalette(false)}
                aria-label="Закрыть команды"
              >
                <kbd>esc</kbd>
              </button>
            </div>
            <div className="palette-label">
              {query ? "РЕЗУЛЬТАТЫ" : "ЗАМЕТКИ И БЫСТРЫЕ ДЕЙСТВИЯ"}
            </div>
            <div className="palette-results">
              {matches.length ? (
                matches.map((m, i) => (
                  <button
                    className={selected === i ? "selected" : ""}
                    key={m.title + i}
                    onMouseEnter={() => setSelected(i)}
                    onClick={m.action}
                  >
                    <span className="result-icon">
                      <m.icon size={16} />
                    </span>
                    <span>
                      {m.title}
                      <small>{m.meta}</small>
                    </span>
                    {selected === i && <CornerDownLeft size={14} />}
                  </button>
                ))
              ) : (
                <div className="no-results">
                  <Search size={22} />
                  <p>Ничего не найдено</p>
                  <button onClick={newNote}>
                    Создать новую заметку
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
            <footer>
              <span>
                <Mark />
                MEMORA
              </span>
              <span>
                ↑ ↓ выбрать <kbd>↵</kbd> открыть
              </span>
            </footer>
          </section>
        </div>
      )}
      {chat && (
        <div className="overlay" onKeyDown={trap}>
          <section
            className="chat-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Демонстрационная переписка"
          >
            <header>
              <span className="avatar">
                Д<i />
              </span>
              <div>
                <strong>Даниил</strong>
                <small>Демо-переписка · локальные сообщения</small>
              </div>
              <button
                onClick={() => setChat(false)}
                aria-label="Закрыть переписку"
              >
                <X size={18} />
              </button>
            </header>
            <div className="messages">
              <div className="date-separator">Сегодня, 4 ноября</div>
              {messages.map((m, i) => (
                <div className={"bubble " + (i > 0 ? "mine" : "")} key={i}>
                  {m}
                  <small>
                    {i === 0 ? "12:08" : "Только что"}
                    <CheckCheck size={11} />
                  </small>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!message.trim()) return;
                setMessages((m) => [...m, message.trim()]);
                setMessage("");
              }}
            >
              <input
                aria-label="Сообщение"
                placeholder="Написать сообщение…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button className="primary" aria-label="Отправить сообщение">
                <ArrowUpRight size={17} />
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
