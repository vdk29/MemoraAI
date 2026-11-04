import { useState } from "react";
import {
  FileText,
  CalendarDays,
  MessageCircle,
  Star,
  ArrowUpRight,
  PenLine,
  Plus,
  Bookmark,
} from "lucide-react";
import { MemorySculpture } from "../components/Identity";
import { db, result } from "../lib/supabase";
import { Avatar, Empty } from "../components/ui";
import { NoteEditor } from "../components/NoteEditor";
import { Notes } from "./Notes";
import { Events } from "./Events";
export function Dashboard({ data, own, shared }: any) {
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [note, setNote] = useState<any>(null);
  return (
    <div className="dashboard editorial-dashboard">
      <div className="dashboard-primary">
        <section className="welcome product-hero">
          <div className="hero-copy">
            <span className="eyebrow">MEMORA / ЛИЧНОЕ ПРОСТРАНСТВО</span>
            <span className="trace-greeting">
              Здравствуйте, {own?.display_name || "друг"}.
            </span>
            <h1>
              Ваши мысли.
              <br />
              <span>Связанные воедино.</span>
            </h1>
            <p>
              Не просто сохранить. Увидеть связи, найти смысл и сделать
              следующий шаг.
            </p>
            <button
              className="trace-hero-action"
              onClick={() =>
                setNote({ title: "", content: "", tags: [], favorite: false })
              }
            >
              Зафиксировать мысль
              <ArrowUpRight size={16} />
            </button>
          </div>
          <MemorySculpture />
        </section>
        <section className="favorites-ribbon" aria-label="Избранные заметки">
          <span>
            <Star size={16} fill="currentColor" />
            Избранное
          </span>
          {data.notes
            .filter((n: any) => n.favorite)
            .slice(0, 3)
            .map((n: any) => (
              <button key={n.id} onClick={() => setNote(n)}>
                <Bookmark size={14} />
                {n.title}
              </button>
            ))}
          <a className="favorite-add" href="#favorites">
            <Plus size={14} />
            {data.notes.some((n: any) => n.favorite)
              ? "Все"
              : "Добавить важное"}
          </a>
        </section>
        <section className="panel quick-capture">
          <header className="section-head">
            <h2>
              <PenLine size={20} />
              Момент ясности начинается здесь.
            </h2>
            <span className="capture-label">Быстрая заметка</span>
          </header>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!text.trim() || busy) return;
              setBusy(true);
              await shared.run(async () => {
                await result(
                  db.from("notes").insert({
                    user_id: shared.userId,
                    title: text.trim().split("\n")[0].slice(0, 200),
                    content: text.trim(),
                    tags: [],
                    favorite: false,
                  }),
                );
                setText("");
                setSaved(true);
                await shared.refresh();
              });
              setBusy(false);
            }}
          >
            <textarea
              aria-label="Быстрая заметка"
              placeholder="Идея, наблюдение или то, что хочется запомнить…"
              required
              maxLength={100000}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setSaved(false);
              }}
            />
            <footer>
              <span className="capture-hint">
                <FileText size={15} />
                Мысли не должны теряться
              </span>
              <button className="primary" disabled={busy || !text.trim()}>
                <Bookmark size={15} />
                {busy ? "Сохраняем…" : "Сохранить"}
              </button>
            </footer>
            {saved && (
              <p className="save-status" role="status">
                Мысль сохранена в заметках.
              </p>
            )}
          </form>
        </section>
        <section className="panel recent-notes">
          <Notes {...shared} compact />
        </section>
        <section className="reflection-strip">
          <FileText size={22} />
          <div>
            <h3>От мысли — к следующему шагу.</h3>
            <p>Фиксируйте идеи и связывайте их с планами.</p>
          </div>
          <a href="#notes" aria-label="Открыть заметки">
            <ArrowUpRight size={22} />
          </a>
        </section>
      </div>
      <aside className="dashboard-secondary">
        <section className="panel dashboard-calendar">
          <Events {...shared} compact />
        </section>
        <section className="panel recent-conversations">
          <header className="section-head">
            <h2>
              <MessageCircle size={18} />
              Последние чаты
            </h2>
            <a href="#chats" aria-label="Все чаты">
              <ArrowUpRight size={17} />
            </a>
          </header>
          {data.conversations.length ? (
            data.conversations.slice(0, 4).map((c: any) => {
              const profile = data.profiles.find(
                (p: any) =>
                  p.id === (c.user_a === shared.userId ? c.user_b : c.user_a),
              );
              return (
                <a className="conversation-preview" href="#chats" key={c.id}>
                  <Avatar profile={profile} />
                  <span>
                    <strong>{profile?.display_name || "Переписка"}</strong>
                    <small>{c.last_body || "Начните разговор"}</small>
                  </span>
                  {Number(c.unread) > 0 && <b>{c.unread}</b>}
                </a>
              );
            })
          ) : (
            <Empty title="Ваши диалоги — здесь">
              Найдите друзей и начните разговор.
            </Empty>
          )}
        </section>
      </aside>
      {note && (
        <NoteEditor
          note={note}
          close={() => setNote(null)}
          categories={data.categories}
          userId={shared.userId}
          run={shared.run}
          refresh={shared.refresh}
        />
      )}
    </div>
  );
}
