import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  CalendarDays,
  Clock,
  ArrowUpRight,
  Pencil,
} from "lucide-react";
import { db, result, date, dayKey } from "../lib/supabase";
import { Empty, Modal } from "../components/ui";
import { NoteEditor } from "../components/NoteEditor";
export function Events({
  events: initialEvents,
  notes: initialNotes = [],
  categories = [],
  userId,
  run,
  refresh,
  calendar = false,
  compact = false,
}: any) {
  const [month, setMonth] = useState(new Date()),
    [selected, setSelected] = useState(dayKey(new Date())),
    [edit, setEdit] = useState<any>(null),
    [noteEdit, setNoteEdit] = useState<any>(null),
    [preview, setPreview] = useState<any>(null),
    [monthEvents, setMonthEvents] = useState<any[]>([]),
    [monthNotes, setMonthNotes] = useState<any[]>([]),
    [upcoming, setUpcoming] = useState<any[]>([]),
    [fetching, setFetching] = useState(false),
    [more, setMore] = useState(false);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(
    month.getFullYear(),
    month.getMonth(),
    1 - ((first.getDay() + 6) % 7),
  );
  const finish = new Date(start);
  finish.setDate(finish.getDate() + 42);
  const getPage = async (offset = 0, noteOffset = offset) => {
    const query = db
      .from("events")
      .select("*")
      .gte("starts_at", start.toISOString())
      .lt("starts_at", finish.toISOString())
      .order("starts_at")
      .order("id")
      .range(offset, offset + 99);
    const notesQuery = db
      .from("notes")
      .select("*")
      .or(
        `and(scheduled_on.gte.${dayKey(start)},scheduled_on.lt.${dayKey(finish)}),and(scheduled_on.is.null,created_at.gte.${start.toISOString()},created_at.lt.${finish.toISOString()})`,
      )
      .order("created_at")
      .order("id")
      .range(noteOffset, noteOffset + 99);
    return Promise.all([result(query), result(notesQuery)]);
  };
  useEffect(() => {
    let alive = true;
    setFetching(true);
    run(async () => {
      const [[events, notes], next] = await Promise.all([
        getPage(),
        result(
          db
            .from("events")
            .select("*")
            .gte("ends_at", new Date().toISOString())
            .order("starts_at")
            .limit(compact ? 3 : 10),
        ),
      ]);
      if (!alive) return;
      setMonthEvents(events || []);
      setMonthNotes(notes || []);
      setUpcoming(next || []);
      setMore(events?.length === 100 || notes?.length === 100);
    }).finally(() => {
      if (alive) setFetching(false);
    });
    return () => {
      alive = false;
    };
  }, [month, initialEvents, initialNotes]);
  const changeMonth = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    setSelected(dayKey(next));
  };
  const local = (s: string) => {
    const d = new Date(s);
    return `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const openEvent = (e: any) =>
    setEdit({ ...e, starts_at: local(e.starts_at), ends_at: local(e.ends_at) });
  const create = () =>
    setEdit({
      title: "",
      description: "",
      starts_at: selected + "T12:00",
      ends_at: selected + "T13:00",
    });
  const noteDay = (n: any) => n.scheduled_on || dayKey(new Date(n.created_at));
  const dayEvents = monthEvents.filter(
      (e) => dayKey(new Date(e.starts_at)) === selected,
    ),
    dayNotes = monthNotes.filter((n) => noteDay(n) === selected);
  const selectedLabel = new Date(selected + "T12:00:00").toLocaleDateString(
    "ru-RU",
    { day: "numeric", month: "long", weekday: "long" },
  );
  return (
    <div className={compact ? "calendar-widget" : "calendar-workspace"}>
      {!compact && (
        <header className="calendar-heading">
          <div>
            <span className="eyebrow">ПЛАНИРОВАНИЕ / КАЛЕНДАРЬ</span>
            <h1>Ваш календарь</h1>
            <p>Заметки и события. Один обзор вашего расписания.</p>
          </div>
          <button
            className="primary"
            aria-label="Создать событие"
            onClick={create}
          >
            <Plus size={17} />
            Создать событие
          </button>
        </header>
      )}
      <section
        className={compact ? "mini-month" : "month-surface"}
        aria-busy={fetching}
      >
        <header className="month-navigation">
          <div className="month-controls">
            <button
              aria-label="Предыдущий месяц"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <h2>
              {month.toLocaleDateString("ru-RU", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button aria-label="Следующий месяц" onClick={() => changeMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
          {!compact && (
            <button
              onClick={() => {
                const today = new Date();
                setMonth(today);
                setSelected(dayKey(today));
              }}
            >
              Сегодня
            </button>
          )}
        </header>
        {!compact && (
          <div className="calendar-legend">
            <span>
              <i className="legend-event" />
              События
            </span>
            <span>
              <i className="legend-note" />
              Заметки
            </span>
            <small>
              Время: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </small>
          </div>
        )}
        <div
          className={"calendar " + (compact ? "mini-grid" : "month-grid")}
          role="group"
          aria-label="Дни месяца"
        >
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
            <div className="weekday" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: 42 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = dayKey(d),
              events = monthEvents.filter(
                (e) => dayKey(new Date(e.starts_at)) === key,
              ),
              notes = monthNotes.filter((n) => noteDay(n) === key),
              today = key === dayKey(new Date());
            return (
              <div
                className={`day-cell ${key === selected ? "selected" : ""} ${d.getMonth() !== month.getMonth() ? "outside" : ""} ${today ? "is-today" : ""}`}
                key={key}
              >
                <button
                  className="day-select"
                  aria-label={d.toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  aria-pressed={selected === key}
                  onClick={() => setSelected(key)}
                >
                  <span>{d.getDate()}</span>
                  {compact && events.length + notes.length > 0 && (
                    <i className="day-dot" />
                  )}
                </button>
                {!compact && (
                  <div className="cell-items">
                    {events.slice(0, 1).map((e) => (
                      <button
                        className="calendar-chip event-chip"
                        key={e.id}
                        onClick={() => {
                          setSelected(key);
                          openEvent(e);
                        }}
                      >
                        <span className="chip-time">
                          {new Date(e.starts_at).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>{e.title}</span>
                      </button>
                    ))}
                    {notes.slice(0, 2).map((n) => (
                      <button
                        className="calendar-chip note-chip"
                        key={n.id}
                        onClick={() => {
                          setSelected(key);
                          setPreview(n);
                        }}
                      >
                        <FileText size={12} />
                        <span>{n.title}</span>
                      </button>
                    ))}
                    {events.length + notes.length > 2 && (
                      <button
                        className="cell-count"
                        onClick={() => setSelected(key)}
                      >
                        +{events.length + notes.length - 2}
                      </button>
                    )}
                    {events.length + notes.length >
                      Math.min(events.length, 1) +
                        Math.min(notes.length, 2) && (
                      <button
                        className="cell-more"
                        onClick={() => setSelected(key)}
                      >
                        Все записи · {events.length + notes.length}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {more && (
          <button
            className="load-month"
            disabled={fetching}
            onClick={() => {
              setFetching(true);
              run(async () => {
                const [e, n] = await getPage(
                  monthEvents.length,
                  monthNotes.length,
                );
                setMonthEvents((current) => [...current, ...(e || [])]);
                setMonthNotes((current) => [...current, ...(n || [])]);
                setMore(e?.length === 100 || n?.length === 100);
              }).finally(() => setFetching(false));
            }}
          >
            Загрузить остальные записи месяца
          </button>
        )}
      </section>
      {compact ? (
        <section className="upcoming-section">
          <header className="section-head">
            <h2>
              <CalendarDays size={17} />
              Ближайшие события
            </h2>
            <a href="#calendar" aria-label="Открыть календарь">
              <ArrowUpRight size={16} />
            </a>
          </header>
          {upcoming.length ? (
            upcoming.map((e) => (
              <button
                className="agenda-event"
                key={e.id}
                onClick={() => openEvent(e)}
              >
                <span className="agenda-line" />
                <span>
                  <strong>{e.title}</strong>
                  <small>{date(e.starts_at)}</small>
                </span>
                <Clock size={15} />
              </button>
            ))
          ) : (
            <Empty title="Событий пока нет">
              Запланируйте событие в календаре.
            </Empty>
          )}
        </section>
      ) : (
        <section className="day-agenda" key={selected}>
          <header className="section-head">
            <div>
              <span className="eyebrow">ВЫБРАННЫЙ ДЕНЬ</span>
              <h2>{selectedLabel}</h2>
            </div>
            <button
              onClick={() =>
                setNoteEdit({
                  title: "",
                  content: "",
                  tags: [],
                  favorite: false,
                  scheduled_on: selected,
                })
              }
            >
              <Plus size={16} />
              Заметка на этот день
            </button>
          </header>
          <div className="agenda-columns">
            <div>
              <h3>
                <CalendarDays size={16} />
                События <span>{dayEvents.length}</span>
              </h3>
              {dayEvents.length ? (
                dayEvents.map((e) => (
                  <button
                    className="agenda-event"
                    key={e.id}
                    onClick={() => openEvent(e)}
                  >
                    <span className="agenda-line" />
                    <span>
                      <strong>{e.title}</strong>
                      <small>{date(e.starts_at)}</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))
              ) : (
                <p className="agenda-empty">Нет событий на выбранную дату.</p>
              )}
            </div>
            <div>
              <h3>
                <FileText size={16} />
                Заметки <span>{dayNotes.length}</span>
              </h3>
              {dayNotes.length ? (
                dayNotes.map((n) => (
                  <button
                    className="agenda-note"
                    key={n.id}
                    onClick={() => setPreview(n)}
                  >
                    <FileText size={18} />
                    <span>
                      <strong>{n.title}</strong>
                      <small>
                        {n.content.slice(0, 90) || "Открыть заметку"}
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))
              ) : (
                <p className="agenda-empty">
                  Сохраните мысль или добавьте заметку на этот день.
                </p>
              )}
            </div>
          </div>
        </section>
      )}
      {preview && (
        <Modal title={preview.title} close={() => setPreview(null)}>
          <div className="note-preview">
            <div className="preview-meta">
              <FileText size={15} />
              {preview.scheduled_on
                ? "Запланировано на " + preview.scheduled_on
                : date(preview.created_at)}
            </div>
            <p>{preview.content || "В этой заметке пока нет текста."}</p>
            <div className="tags">
              {preview.tags?.filter(Boolean).map((t: string) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
            <footer>
              <button
                className="primary"
                onClick={() => {
                  setNoteEdit(preview);
                  setPreview(null);
                }}
              >
                <Pencil size={15} />
                Редактировать заметку
              </button>
            </footer>
          </div>
        </Modal>
      )}
      {noteEdit && (
        <NoteEditor
          note={noteEdit}
          close={() => setNoteEdit(null)}
          categories={categories}
          userId={userId}
          run={run}
          refresh={refresh}
        />
      )}
      {edit && (
        <Modal title="Событие" close={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                if (edit.ends_at <= edit.starts_at)
                  throw Error("Окончание должно быть позже начала");
                const payload = {
                  title: edit.title.trim(),
                  description: edit.description,
                  starts_at: new Date(edit.starts_at).toISOString(),
                  ends_at: new Date(edit.ends_at).toISOString(),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  user_id: userId,
                };
                await result(
                  edit.id
                    ? db.from("events").update(payload).eq("id", edit.id)
                    : db.from("events").insert(payload),
                );
                setEdit(null);
                await refresh();
              });
            }}
          >
            <label>
              Название
              <input
                required
                maxLength={200}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </label>
            <label>
              Описание
              <textarea
                value={edit.description}
                onChange={(e) =>
                  setEdit({ ...edit, description: e.target.value })
                }
              />
            </label>
            {["starts_at", "ends_at"].map((k, i) => (
              <label key={k}>
                {i ? "Окончание" : "Начало"}
                <input
                  required
                  type="datetime-local"
                  value={edit[k]}
                  onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                />
              </label>
            ))}
            <footer>
              <button className="primary">Сохранить</button>
              {edit.id && (
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    if (confirm("Удалить событие?"))
                      run(async () => {
                        await result(
                          db.from("events").delete().eq("id", edit.id),
                        );
                        setEdit(null);
                        await refresh();
                      });
                  }}
                >
                  Удалить
                </button>
              )}
            </footer>
          </form>
        </Modal>
      )}
    </div>
  );
}
