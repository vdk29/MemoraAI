import { useEffect, useRef, useState } from "react";
import { db, result, date } from "../lib/supabase";
import {
  mergeMessages,
  messagePage,
  sendMessage,
  type Message,
} from "../lib/messages";
import { Avatar, Empty } from "../components/ui";
export function Social({
  userId,
  run,
  profiles,
  friends,
  conversations,
  refresh,
  notifications = [],
}: any) {
  const [query, setQuery] = useState(""),
    [found, setFound] = useState<any[]>([]),
    [active, setActive] = useState<any>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [hasOlder, setHasOlder] = useState(false),
    [historyBusy, setHistoryBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null),
    near = useRef(true),
    draft = useRef<{
      id: string;
      body: string;
      conversation_id: string;
    } | null>(null),
    list = useRef<HTMLDivElement>(null),
    currentConversation = useRef<string | undefined>(undefined);
  currentConversation.current = active?.id;
  const person = (id: string) => profiles.find((p: any) => p.id === id);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length < 2) {
        setFound([]);
        return;
      }
      run(async () =>
        setFound(
          (await result(
            db
              .from("profiles")
              .select("*")
              .eq("discoverable", true)
              .neq("id", userId)
              .ilike("display_name", `%${query.trim().replace(/[%_]/g, "")}%`)
              .limit(20),
          )) || [],
        ),
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    setMessages([]);
    setHasOlder(false);
    setText("");
    draft.current = null;
    near.current = true;
    const markRead = async () => {
      const readAt = new Date().toISOString();
      await result(
        db.from("read_receipts").upsert({
          conversation_id: active.id,
          user_id: userId,
          read_at: readAt,
        }),
      );
      await result(
        db
          .from("notifications")
          .update({ read: true })
          .eq("reference_id", active.id)
          .eq("kind", "message")
          .eq("read", false)
          .lte("created_at", readAt),
      );
      await refresh();
    };
    const load = async () => {
      const rows = await messagePage(active.id);
      if (!alive) return;
      setMessages((current) => mergeMessages(current, rows));
      setHasOlder(rows.length === 50);
      await markRead();
    };
    run(load);
    const channel = db
      .channel("chat:" + active.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${active.id}`,
        },
        (payload) => {
          if (!alive) return;
          setMessages((current) =>
            mergeMessages(current, [payload.new as Message]),
          );
          if (document.visibilityState === "visible") run(markRead);
        },
      )
      .subscribe((status) => {
        if (!alive) return;
        setStatus(
          status === "SUBSCRIBED"
            ? "В реальном времени"
            : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
              ? "Связь потеряна. Переподключаемся…"
              : "Подключение…",
        );
        if (status === "SUBSCRIBED") run(load);
      });
    const onVisible = () => {
      if (document.visibilityState === "visible") run(load);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      void db.removeChannel(channel);
    };
  }, [active?.id, userId]);
  useEffect(() => {
    if (near.current) end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  async function open(other: string) {
    let c = conversations.find((c: any) =>
      [c.user_a, c.user_b].includes(other),
    );
    if (!c) {
      const response = await db
        .from("conversations")
        .insert({ user_a: userId, user_b: other })
        .select()
        .single();
      if (response.error?.code === "23505")
        c = await result(
          db
            .from("conversations")
            .select("*")
            .or(`user_a.eq.${userId},user_b.eq.${userId}`)
            .or(`user_a.eq.${other},user_b.eq.${other}`)
            .single(),
        );
      else if (response.error) throw response.error;
      else c = response.data;
      await refresh();
    }
    setActive(c);
  }
  return (
    <div className="social">
      <section className="panel">
        <h2>Люди и переписки</h2>
        <input
          aria-label="Поиск пользователей"
          placeholder="Найти по имени…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {found.map((p) => (
          <div className="person" key={p.id}>
            <a href={"#profile/" + p.id}>
              <Avatar profile={p} />
              {p.display_name}
            </a>
            {friends.some((f: any) =>
              [f.requester_id, f.recipient_id].includes(p.id),
            ) ? (
              <small>Заявка уже есть</small>
            ) : (
              <button
                onClick={() =>
                  run(async () => {
                    await result(
                      db
                        .from("friendships")
                        .insert({ requester_id: userId, recipient_id: p.id }),
                    );
                    await refresh();
                  })
                }
              >
                Добавить
              </button>
            )}
          </div>
        ))}
        <h3>Заявки</h3>
        {friends
          .filter((f: any) => f.status === "pending")
          .map((f: any) => {
            const incoming = f.recipient_id === userId;
            return (
              <div className="person" key={f.id}>
                <span>
                  {person(incoming ? f.requester_id : f.recipient_id)
                    ?.display_name || "Участник"}
                  <small>
                    {incoming ? "Входящая заявка" : "Ожидает ответа"}
                  </small>
                </span>
                {incoming && (
                  <button
                    onClick={() =>
                      run(async () => {
                        await result(
                          db
                            .from("friendships")
                            .update({ status: "accepted" })
                            .eq("id", f.id),
                        );
                        await refresh();
                      })
                    }
                  >
                    Принять
                  </button>
                )}
                <button
                  onClick={() =>
                    run(async () => {
                      await result(
                        db.from("friendships").delete().eq("id", f.id),
                      );
                      await refresh();
                    })
                  }
                >
                  {incoming ? "Отклонить" : "Отменить"}
                </button>
              </div>
            );
          })}
        <h3>Друзья</h3>
        {friends
          .filter((f: any) => f.status === "accepted")
          .map((f: any) => {
            const id =
              f.requester_id === userId ? f.recipient_id : f.requester_id;
            return (
              <div className="person" key={id}>
                <a href={"#profile/" + id}>
                  <Avatar profile={person(id)} />
                  {person(id)?.display_name || "Участник"}
                </a>
                <button onClick={() => run(() => open(id))}>Написать</button>
                <button
                  aria-label="Удалить друга"
                  onClick={() => {
                    if (confirm("Удалить из друзей?"))
                      run(async () => {
                        await result(
                          db.from("friendships").delete().eq("id", f.id),
                        );
                        await refresh();
                      });
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        <h3>История переписок</h3>
        {conversations.map((c: any) => (
          <button
            className="event-row"
            key={c.id}
            onClick={() => {
              setActive(c);
            }}
          >
            {person(c.user_a === userId ? c.user_b : c.user_a)?.display_name ||
              "Переписка"}{" "}
            {c.last_body && <small>{c.last_body.slice(0, 80)}</small>}
            {Number(c.unread) > 0 && (
              <b aria-label="Непрочитанные">{c.unread}</b>
            )}
          </button>
        ))}
      </section>
      <section className="panel chat">
        {active ? (
          <>
            <header>
              <h2>
                {person(
                  active.user_a === userId ? active.user_b : active.user_a,
                )?.display_name || "Переписка"}
              </h2>
              <small>{status}</small>
            </header>
            <div
              className="messages"
              ref={list}
              onScroll={(e) => {
                const t = e.currentTarget;
                near.current =
                  t.scrollHeight - t.scrollTop - t.clientHeight < 100;
              }}
            >
              {hasOlder && (
                <button
                  disabled={historyBusy}
                  onClick={() => {
                    const conversationId = active.id;
                    near.current = false;
                    setHistoryBusy(true);
                    const height = list.current?.scrollHeight || 0;
                    run(async () => {
                      const rows = await messagePage(
                        conversationId,
                        messages[0],
                      );
                      if (currentConversation.current !== conversationId)
                        return;
                      setMessages((current) => mergeMessages(current, rows));
                      setHasOlder(rows.length === 50);
                      requestAnimationFrame(() => {
                        if (list.current)
                          list.current.scrollTop +=
                            list.current.scrollHeight - height;
                      });
                    }).finally(() => setHistoryBusy(false));
                  }}
                >
                  {historyBusy ? "Загрузка…" : "Загрузить предыдущие"}
                </button>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={"bubble " + (m.sender_id === userId ? "mine" : "")}
                >
                  {m.body}
                  <small>{date(m.created_at)}</small>
                </div>
              ))}
              <div ref={end} />
            </div>
            <form
              className="composer"
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy || !text.trim()) return;
                setBusy(true);
                try {
                  if (
                    !draft.current ||
                    draft.current.body !== text.trim() ||
                    draft.current.conversation_id !== active.id
                  )
                    draft.current = {
                      id: crypto.randomUUID(),
                      body: text.trim(),
                      conversation_id: active.id,
                    };
                  const message = await sendMessage({
                    ...draft.current,
                    sender_id: userId,
                  });
                  if (currentConversation.current !== message.conversation_id)
                    return;
                  setMessages((current) => mergeMessages(current, [message]));
                  draft.current = null;
                  setText("");
                  near.current = true;
                } catch (e) {
                  run(() => Promise.reject(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <textarea
                aria-label="Сообщение"
                placeholder="Напишите сообщение…"
                maxLength={8000}
                value={text}
                disabled={busy}
                onChange={(e) => setText(e.target.value)}
                required
              />
              <button className="primary" disabled={busy}>
                {busy ? "Отправка…" : "Отправить"}
              </button>
            </form>
          </>
        ) : (
          <Empty title="Разговор начинается здесь">
            Выберите друга или переписку.
          </Empty>
        )}
      </section>
    </div>
  );
}
