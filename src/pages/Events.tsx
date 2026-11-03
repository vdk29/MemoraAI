import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { db, result, date, dayKey } from "../lib/supabase";
import { Empty, Modal } from "../components/ui";
export function Events({
  events: initialEvents,
  userId,
  run,
  refresh,
  calendar = false,
  compact = false,
}: any) {
  const [month, setMonth] = useState(new Date()),
    [selected, setSelected] = useState(dayKey(new Date())),
    [edit, setEdit] = useState<any>(null),
    [monthEvents, setMonthEvents] = useState<any[]>([]),
    [upcoming, setUpcoming] = useState<any[]>([]),
    [monthMore, setMonthMore] = useState(false),
    [upcomingMore, setUpcomingMore] = useState(false),
    [fetching, setFetching] = useState(false);
  const monthPage = async (offset = 0) => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(
      month.getFullYear(),
      month.getMonth(),
      1 - ((first.getDay() + 6) % 7),
    );
    const end = new Date(start);
    end.setDate(end.getDate() + 42);
    return (
      (await result(
        db
          .from("events")
          .select("*")
          .gte("starts_at", start.toISOString())
          .lt("starts_at", end.toISOString())
          .order("starts_at")
          .order("id")
          .range(offset, offset + 99),
      )) || []
    );
  };
  const upcomingPage = async (offset = 0) =>
    (await result(
      db
        .from("events")
        .select("*")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at")
        .order("id")
        .range(offset, offset + (compact ? 2 : 49)),
    )) || [];
  useEffect(() => {
    let alive = true;
    setFetching(true);
    run(async () => {
      const [monthRows, nextRows] = await Promise.all([
        calendar || compact ? monthPage() : Promise.resolve([]),
        !calendar ? upcomingPage() : Promise.resolve([]),
      ]);
      if (!alive) return;
      setMonthEvents(monthRows);
      setUpcoming(nextRows);
      setMonthMore(monthRows.length === 100);
      setUpcomingMore(!compact && nextRows.length === 50);
    }).finally(() => {
      if (alive) setFetching(false);
    });
    return () => {
      alive = false;
    };
  }, [month, calendar, compact, initialEvents]);
  const events = calendar || compact ? monthEvents : initialEvents;
  const changeMonth = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    setSelected(dayKey(next));
  };
  const local = (s: string) => {
    const d = new Date(s);
    return `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const create = () =>
    setEdit({
      title: "",
      description: "",
      starts_at: selected + "T12:00",
      ends_at: selected + "T13:00",
    });
  let items = (calendar ? events : upcoming).filter((e: any) =>
    calendar
      ? dayKey(new Date(e.starts_at)) === selected
      : new Date(e.ends_at) >= new Date(),
  );
  if (compact) items = items.slice(0, 3);
  return (
    <>
      <header className="section-head">
        <h2>
          {calendar ? "Календарь" : compact ? "Ближайшие события" : "События"}
        </h2>
        <button aria-label="Создать событие" onClick={create}>
          <Plus size={19} />
          {!compact && "Создать событие"}
        </button>
      </header>
      {fetching && <p role="status">Загрузка событий…</p>}
      {monthMore && (calendar || compact) && (
        <button
          disabled={fetching}
          onClick={() => {
            setFetching(true);
            run(async () => {
              const rows = await monthPage(monthEvents.length);
              setMonthEvents((current) => [...current, ...rows]);
              setMonthMore(rows.length === 100);
            }).finally(() => setFetching(false));
          }}
        >
          Загрузить остальные события месяца
        </button>
      )}
      {upcomingMore && !calendar && (
        <button
          disabled={fetching}
          onClick={() => {
            setFetching(true);
            run(async () => {
              const rows = await upcomingPage(upcoming.length);
              setUpcoming((current) => [...current, ...rows]);
              setUpcomingMore(rows.length === 50);
            }).finally(() => setFetching(false));
          }}
        >
          Ещё предстоящие события
        </button>
      )}
      {!compact && (
        <p className="muted">
          {calendar
            ? "Выберите день, чтобы спланировать его."
            : "Предстоящие события в хронологическом порядке."}{" "}
          Время: {Intl.DateTimeFormat().resolvedOptions().timeZone}.
        </p>
      )}
      {(calendar || compact) && (
        <>
          <div className="month">
            <button
              aria-label="Предыдущий месяц"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <strong>
              {month.toLocaleDateString("ru-RU", {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <button aria-label="Следующий месяц" onClick={() => changeMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="calendar">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
              <small key={d}>{d}</small>
            ))}
            {Array.from({ length: 42 }, (_, i) => {
              const start = new Date(month.getFullYear(), month.getMonth(), 1),
                d = new Date(
                  month.getFullYear(),
                  month.getMonth(),
                  i - ((start.getDay() + 6) % 7) + 1,
                ),
                key = dayKey(d);
              return (
                <button
                  key={key}
                  className={`${key === selected ? "selected" : ""} ${d.getMonth() !== month.getMonth() ? "outside" : ""}`}
                  onClick={() => setSelected(key)}
                >
                  {d.getDate()}
                  {events.some(
                    (e: any) => dayKey(new Date(e.starts_at)) === key,
                  ) && <i />}
                </button>
              );
            })}
          </div>
        </>
      )}
      {calendar && <h3>{selected}</h3>}
      {items.length ? (
        items.map((e: any) => (
          <button
            className="event-row"
            key={e.id}
            onClick={() =>
              setEdit({
                ...e,
                starts_at: local(e.starts_at),
                ends_at: local(e.ends_at),
              })
            }
          >
            <span className="event-day">{new Date(e.starts_at).getDate()}</span>
            <span>
              <strong>{e.title}</strong>
              <small>{date(e.starts_at)}</small>
            </span>
          </button>
        ))
      ) : (
        <Empty title="Время для новых планов">
          Добавьте событие в свой календарь.
        </Empty>
      )}
      {!compact &&
        !calendar &&
        events.some((e: any) => new Date(e.ends_at) < new Date()) && (
          <details>
            <summary>Прошедшие события</summary>
            {events
              .filter((e: any) => new Date(e.ends_at) < new Date())
              .map((e: any) => (
                <button
                  className="event-row"
                  key={e.id}
                  onClick={() =>
                    setEdit({
                      ...e,
                      starts_at: local(e.starts_at),
                      ends_at: local(e.ends_at),
                    })
                  }
                >
                  {e.title} · {date(e.starts_at)}
                </button>
              ))}
          </details>
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
    </>
  );
}
