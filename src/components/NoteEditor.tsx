import { useState } from "react";
import { db, result, date } from "../lib/supabase";
import { Modal } from "./ui";
export function NoteEditor({
  note,
  close,
  categories,
  userId,
  run,
  refresh,
}: any) {
  const [edit, setEdit] = useState({ ...note, tags: note.tags || [] });
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      title={edit.id ? "Редактировать заметку" : "Новая заметка"}
      close={() => close()}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (saving) return;
          setSaving(true);
          run(async () => {
            const payload = {
              title: edit.title.trim(),
              content: edit.content,
              tags: edit.tags.filter(Boolean),
              category_id: edit.category_id || null,
              scheduled_on: edit.scheduled_on || null,
              favorite: edit.favorite,
              user_id: userId,
            };
            await result(
              edit.id
                ? db.from("notes").update(payload).eq("id", edit.id)
                : db.from("notes").insert(payload),
            );
            close();
            await refresh();
          }).finally(() => setSaving(false));
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
            aria-label="Текст"
            maxLength={100000}
            value={edit.content}
            onChange={(e) => setEdit({ ...edit, content: e.target.value })}
          />
        </label>
        <label>
          Категория
          <select
            value={edit.category_id || ""}
            onChange={(e) => setEdit({ ...edit, category_id: e.target.value })}
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
                  ...new Set(e.target.value.split(",").map((t) => t.trim())),
                ],
              })
            }
          />
        </label>
        <label>
          День в календаре
          <input
            type="date"
            value={edit.scheduled_on || ""}
            onChange={(e) => setEdit({ ...edit, scheduled_on: e.target.value })}
          />
        </label>
        {edit.created_at && (
          <small>
            Создано {date(edit.created_at)} · Изменено {date(edit.updated_at)}
          </small>
        )}
        <footer>
          <button className="primary" disabled={saving}>
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
          {edit.id && (
            <button
              type="button"
              className="danger"
              onClick={() => {
                if (confirm("Удалить заметку без возможности восстановления?"))
                  run(async () => {
                    await result(db.from("notes").delete().eq("id", edit.id));
                    close();
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
  );
}
