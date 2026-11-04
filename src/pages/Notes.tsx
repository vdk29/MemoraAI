import { useState, useEffect } from "react";
import { Star, Plus, LayoutGrid, List } from "lucide-react";
import { db, result, date } from "../lib/supabase";
import { NoteEditor } from "../components/NoteEditor";
import { Empty } from "../components/ui";
export function Notes({
  notes,
  categories,
  userId,
  refresh,
  run,
  favorites = false,
  compact = false,
  search = "",
}: any) {
  const [view, setView] = useState("grid");
  const [edit, setEdit] = useState<any>(null),
    [sort, setSort] = useState("updated_at"),
    [filter, setFilter] = useState(""),
    [matches, setMatches] = useState<any[]>([]),
    [hasMore, setHasMore] = useState(false),
    [searchBusy, setSearchBusy] = useState(false),
    [onlyFavorites, setOnlyFavorites] = useState(favorites);
  const remote =
    !!search.trim() || onlyFavorites || !!filter || sort !== "updated_at";
  const requestPage = async (offset = 0) =>
    (await result(
      db.rpc("search_notes", {
        query_text: search.trim(),
        only_favorites: onlyFavorites,
        category: filter || null,
        sort_by: sort,
        page_offset: offset,
      }),
    )) || [];
  useEffect(() => {
    if (!remote) return;
    let alive = true;
    setSearchBusy(true);
    const timer = setTimeout(
      () =>
        run(async () => {
          const rows = await requestPage();
          if (!alive) return;
          setMatches(rows);
          setHasMore(rows.length === 50);
        }).finally(() => {
          if (alive) setSearchBusy(false);
        }),
      250,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [search, onlyFavorites, filter, sort, notes]);
  let items = (remote ? matches : notes)
    .filter(
      (n: any) =>
        (!onlyFavorites || n.favorite) &&
        (!filter || n.category_id === filter) &&
        `${n.title} ${n.content} ${n.tags.join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a: any, b: any) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : b[sort].localeCompare(a[sort]),
    );
  if (compact) items = items.slice(0, 4);
  return (
    <>
      <header className="section-head">
        <h2>
          {compact
            ? "Последние заметки"
            : favorites
              ? "Избранное"
              : "Мои заметки"}
        </h2>
        <button
          className="primary"
          onClick={() =>
            setEdit({
              title: "",
              content: "",
              tags: [],
              favorite: false,
              category_id: "",
            })
          }
        >
          <Plus size={16} /> Новая заметка
        </button>
      </header>
      {searchBusy && <p role="status">Ищем заметки…</p>}
      {remote && hasMore && !compact && (
        <button
          disabled={searchBusy}
          onClick={() => {
            setSearchBusy(true);
            run(async () => {
              const rows = await requestPage(matches.length);
              setMatches((current) => [...current, ...rows]);
              setHasMore(rows.length === 50);
            }).finally(() => setSearchBusy(false));
          }}
        >
          Загрузить ещё результаты
        </button>
      )}
      {!compact && (
        <div className="toolbar">
          <div className="segmented">
            <button
              className={!onlyFavorites ? "is-active" : ""}
              onClick={() => setOnlyFavorites(false)}
            >
              Все заметки
            </button>
            <button
              className={onlyFavorites ? "is-active" : ""}
              onClick={() => setOnlyFavorites(true)}
            >
              <Star size={14} />
              Избранное
            </button>
          </div>
          <select
            aria-label="Сортировка"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="updated_at">По изменению</option>
            <option value="created_at">По созданию</option>
            <option value="title">По названию</option>
          </select>
          <select
            aria-label="Категория"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Все категории</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const name = prompt("Название категории");
              if (name?.trim())
                run(async () => {
                  await result(
                    db
                      .from("categories")
                      .insert({ name: name.trim(), user_id: userId }),
                  );
                  await refresh();
                });
            }}
          >
            Добавить категорию
          </button>
        </div>
      )}
      <div
        className="trace-view-controls"
        role="group"
        aria-label="Отображение заметок"
      >
        <button
          aria-label="Карточки"
          aria-pressed={view === "grid"}
          onClick={() => setView("grid")}
        >
          <LayoutGrid size={15} />
        </button>
        <button
          aria-label="Список"
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          <List size={16} />
        </button>
      </div>
      {items.length ? (
        <div
          className={
            "notes-grid trace-notes " +
            (view === "list" ? "trace-list" : "trace-grid")
          }
        >
          {items.map((n: any) => (
            <article
              className={"note " + (n.cover === "memory" ? "has-cover" : "")}
              key={n.id}
            >
              {n.cover === "memory" && (
                <button
                  className="trace-note-cover"
                  aria-label={"Открыть заметку " + n.title}
                  onClick={() => setEdit({ ...n })}
                />
              )}
              <header>
                <span className="tag">
                  {categories.find((c: any) => c.id === n.category_id)?.name ||
                    "Без категории"}
                </span>
                <button
                  aria-label="Избранное"
                  aria-pressed={n.favorite}
                  onClick={() =>
                    run(async () => {
                      await result(
                        db
                          .from("notes")
                          .update({ favorite: !n.favorite })
                          .eq("id", n.id),
                      );
                      await refresh();
                    })
                  }
                >
                  <Star size={18} fill={n.favorite ? "currentColor" : "none"} />
                </button>
              </header>
              <button className="note-body" onClick={() => setEdit({ ...n })}>
                <h3>{n.title}</h3>
                <p>{n.content}</p>
              </button>
              <div className="tags">
                {n.tags.map((t: string) => (
                  <span key={t}>#{t}</span>
                ))}
              </div>
              <small>{date(n.updated_at)}</small>
            </article>
          ))}
        </div>
      ) : (
        <Empty title={favorites ? "Пока нет избранного" : "Пока нет заметок"}>
          Создайте первую запись или сохраните мысль с главной.
        </Empty>
      )}
      {edit && (
        <NoteEditor
          note={edit}
          close={() => setEdit(null)}
          categories={categories}
          userId={userId}
          run={run}
          refresh={refresh}
        />
      )}
    </>
  );
}
