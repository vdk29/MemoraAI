import { useState, useEffect } from "react";
import { Star, Plus } from "lucide-react";
import { db, result, date } from "../lib/supabase";
import { Empty, Modal } from "../components/ui";
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
  const [edit, setEdit] = useState<any>(null),
    [sort, setSort] = useState("updated_at"),
    [filter, setFilter] = useState(""),
    [matches, setMatches] = useState<any[]>([]),
    [hasMore, setHasMore] = useState(false),
    [searchBusy, setSearchBusy] = useState(false);
  const remote =
    !!search.trim() || favorites || !!filter || sort !== "updated_at";
  const requestPage = async (offset = 0) =>
    (await result(
      db.rpc("search_notes", {
        query_text: search.trim(),
        only_favorites: favorites,
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
  }, [search, favorites, filter, sort, notes]);
  let items = (remote ? matches : notes)
    .filter(
      (n: any) =>
        (!favorites || n.favorite) &&
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
      {items.length ? (
        <div className="notes-grid">
          {items.map((n: any) => (
            <article className="note" key={n.id}>
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
        <Empty
          title={
            favorites ? "Пока нет избранного" : "Чистый лист для ваших идей"
          }
        >
          Создайте заметку — мысль не потеряется.
        </Empty>
      )}
      {edit && (
        <Modal
          title={edit.id ? "Редактировать заметку" : "Новая заметка"}
          close={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const payload = {
                  title: edit.title.trim(),
                  content: edit.content,
                  tags: edit.tags,
                  category_id: edit.category_id || null,
                  favorite: edit.favorite,
                  user_id: userId,
                };
                await result(
                  edit.id
                    ? db.from("notes").update(payload).eq("id", edit.id)
                    : db.from("notes").insert(payload),
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
              Текст
              <textarea
                className="editor"
                maxLength={100000}
                value={edit.content}
                onChange={(e) => setEdit({ ...edit, content: e.target.value })}
              />
            </label>
            <label>
              Категория
              <select
                value={edit.category_id || ""}
                onChange={(e) =>
                  setEdit({ ...edit, category_id: e.target.value })
                }
              >
                <option value="">Без категории</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Теги через запятую
              <input
                value={edit.tags.join(",")}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    tags: [
                      ...new Set(
                        e.target.value.split(",").map((t) => t.trim()),
                      ),
                    ],
                  })
                }
              />
            </label>
            {edit.created_at && (
              <small>
                Создано {date(edit.created_at)} · Изменено{" "}
                {date(edit.updated_at)}
              </small>
            )}
            <footer>
              <button className="primary">Сохранить</button>
              {edit.id && (
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    if (
                      confirm("Удалить заметку без возможности восстановления?")
                    )
                      run(async () => {
                        await result(
                          db.from("notes").delete().eq("id", edit.id),
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
