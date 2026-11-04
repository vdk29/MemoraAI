import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  LoaderCircle,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { db, result } from "../lib/supabase";
import { sendMessage } from "../lib/messages";
import {
  acceptFriend,
  openConversation,
  peerId,
  removeFriend,
  requestFriend,
  searchPeople,
  socialError,
  type Friendship,
} from "../lib/social";
import { useConversation } from "../lib/useConversation";
import { Avatar } from "../components/ui";

export function Social({
  userId,
  profiles,
  friends,
  conversations,
  refresh,
  initialPeer = "",
  initialTab = "messages",
}: any) {
  const [tab, setTab] = useState<"messages" | "people">("messages");
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const [query, setQuery] = useState(""),
    [found, setFound] = useState<any[]>([]),
    [searching, setSearching] = useState(false);
  const [links, setLinks] = useState<Record<string, Friendship | null>>({});
  const [active, setActive] = useState<any>(null),
    [extraProfiles, setExtraProfiles] = useState<any[]>([]);
  const [opening, setOpening] = useState(false),
    [actionBusy, setActionBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [sendError, setSendError] = useState("");
  const searchInput = useRef<HTMLInputElement>(null),
    composer = useRef<HTMLFormElement>(null);
  const list = useRef<HTMLDivElement>(null),
    actionLock = useRef(false),
    openVersion = useRef(0),
    current = useRef<string | undefined>(undefined);
  const draft = useRef<{
    id: string;
    body: string;
    conversation_id: string;
  } | null>(null);
  current.current = active?.id;
  const chat = useConversation(active?.id, userId, refresh, list);
  const person = (id: string) =>
    profiles.find((p: any) => p.id === id) ||
    extraProfiles.find((p) => p.id === id);
  const other = active
    ? active.user_a === userId
      ? active.user_b
      : active.user_a
    : "";
  const link = (id: string): Friendship | null =>
    Object.hasOwn(links, id)
      ? links[id]
      : friends.find((f: Friendship) => peerId(f, userId) === id) || null;
  const accepted = friends.filter((f: Friendship) => f.status === "accepted");
  const requests = friends.filter((f: Friendship) => f.status === "pending");
  const incoming = requests.filter(
    (f: Friendship) => f.recipient_id === userId,
  );
  const canSend = link(other)?.status === "accepted";
  useEffect(() => {
    setText("");
    setSendError("");
    draft.current = null;
  }, [active?.id]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    let alive = true;
    setError("");
    setFound([]);
    if (query.trim().length < 2) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const rows = await searchPeople(query, userId);
        if (alive) setFound(rows);
      } catch (e) {
        if (alive) setError(socialError(e));
      } finally {
        if (alive) setSearching(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, userId]);
  // Search/selected peers may be outside the first page of friendships.
  useEffect(() => {
    let alive = true;
    const ids = [
      ...new Set([...found.map((p) => p.id), ...(other ? [other] : [])]),
    ];
    if (!ids.length) return;
    void (async () => {
      try {
        const rows =
          (await result(
            db
              .from("friendships")
              .select("*")
              .or(
                `requester_id.in.(${ids.join(",")}),recipient_id.in.(${ids.join(",")})`,
              ),
          )) || [];
        if (alive)
          setLinks((current) => {
            const next = { ...current };
            for (const id of ids)
              next[id] =
                rows.find((f: Friendship) => peerId(f, userId) === id) || null;
            return next;
          });
      } catch (e) {
        if (alive) setError(socialError(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [found, other, friends, userId]);
  async function mutate(
    id: string,
    task: () => Promise<unknown>,
    message: string,
  ) {
    if (actionLock.current) return;
    actionLock.current = true;
    setActionBusy(id);
    setError("");
    try {
      await task();
      setNotice(message);
      await refresh();
    } catch (e) {
      setError(socialError(e));
    } finally {
      actionLock.current = false;
      setActionBusy("");
    }
  }
  async function add(id: string) {
    await mutate(
      id,
      async () => {
        const row = await requestFriend(userId, id);
        setLinks((v) => ({ ...v, [id]: row }));
      },
      "Заявка отправлена",
    );
  }
  async function accept(f: Friendship) {
    await mutate(
      peerId(f, userId),
      async () => {
        const row = await acceptFriend(f.id);
        setLinks((v) => ({ ...v, [peerId(f, userId)]: row }));
      },
      "Теперь вы друзья. Можно начать разговор.",
    );
  }
  async function remove(f: Friendship) {
    await mutate(
      peerId(f, userId),
      async () => {
        await removeFriend(f.id);
        setLinks((v) => ({ ...v, [peerId(f, userId)]: null }));
      },
      f.status === "accepted"
        ? "Пользователь удалён из друзей"
        : "Заявка закрыта",
    );
  }
  async function open(id: string) {
    const version = ++openVersion.current;
    setOpening(true);
    setError("");
    try {
      let c = conversations.find((c: any) => [c.user_a, c.user_b].includes(id));
      if (!c) c = await openConversation(userId, id);
      if (version !== openVersion.current) return;
      if (!person(id)) {
        const profile = await result(
          db.from("profiles").select("*").eq("id", id).maybeSingle(),
        );
        if (version !== openVersion.current) return;
        if (profile)
          setExtraProfiles((rows) => [
            ...rows.filter((p) => p.id !== id),
            profile,
          ]);
      }
      setActive(c);
      setTab("messages");
      if (!conversations.some((row: any) => row.id === c.id))
        void refresh().catch(() => {});
    } catch (e) {
      if (version === openVersion.current) setError(socialError(e));
    } finally {
      if (version === openVersion.current) setOpening(false);
    }
  }
  useEffect(() => {
    if (initialPeer) void open(initialPeer);
  }, [initialPeer]);
  useEffect(
    () => () => {
      openVersion.current++;
    },
    [],
  );
  function showPeople() {
    setTab("people");
    if (matchMedia("(max-width:760px)").matches && active) {
      setActive(null);
      if (initialPeer) location.hash = "chats";
    }
    requestAnimationFrame(() => searchInput.current?.focus());
  }
  async function submit() {
    if (busy || !text.trim() || !active || !canSend) return;
    const conversationId = active.id;
    setBusy(true);
    setSendError("");
    try {
      if (
        !draft.current ||
        draft.current.body !== text.trim() ||
        draft.current.conversation_id !== conversationId
      )
        draft.current = {
          id: crypto.randomUUID(),
          body: text.trim(),
          conversation_id: conversationId,
        };
      const message = await sendMessage({
        ...draft.current,
        sender_id: userId,
      });
      if (current.current !== conversationId) return;
      chat.near.current = true;
      chat.append(message);
      draft.current = null;
      setText("");
      void refresh().catch(() => {});
    } catch (e) {
      if (current.current === conversationId) setSendError(socialError(e));
    } finally {
      setBusy(false);
    }
  }
  function relationshipAction(p: any) {
    const f = link(p.id),
      disabled = !!actionBusy;
    if (f?.status === "accepted")
      return (
        <button
          className="social-write"
          disabled={opening}
          onClick={() => void open(p.id)}
        >
          <MessageCircle size={14} />
          Написать
        </button>
      );
    if (f && f.recipient_id === userId)
      return (
        <button
          className="social-write"
          disabled={disabled}
          onClick={() => void accept(f)}
        >
          <Check size={14} />
          Принять
        </button>
      );
    if (f)
      return (
        <button
          className="request-pending"
          disabled={disabled}
          onClick={() => void remove(f)}
        >
          Отменить заявку
        </button>
      );
    return (
      <button
        className="social-write"
        disabled={disabled}
        onClick={() => void add(p.id)}
      >
        {actionBusy === p.id ? (
          <LoaderCircle size={14} className="is-spinning" />
        ) : (
          <UserPlus size={14} />
        )}
        Добавить в друзья
      </button>
    );
  }
  const me = person(userId);
  return (
    <div className={"social social-v3" + (active ? " has-active" : "")}>
      <section className="panel social-directory">
        <header className="social-heading">
          <span className="eyebrow">MEMORA / ОБЩЕНИЕ</span>
          <div>
            <h2>Люди и переписки</h2>
            <button
              className="social-add"
              aria-label="Добавить друга"
              onClick={showPeople}
            >
              <Plus size={18} />
            </button>
          </div>
          <p>Хорошие идеи становятся лучше вместе.</p>
        </header>
        <div className="social-tabs" role="tablist" aria-label="Общение">
          <button
            role="tab"
            aria-selected={tab === "messages"}
            onClick={() => setTab("messages")}
          >
            <MessageCircle size={15} />
            Переписки
          </button>
          <button
            role="tab"
            aria-selected={tab === "people"}
            onClick={showPeople}
          >
            <Users size={15} />
            Люди{incoming.length > 0 && <b>{incoming.length}</b>}
          </button>
        </div>
        {notice && (
          <p className="social-notice" role="status">
            <Check size={14} />
            {notice}
          </p>
        )}
        {error && (
          <p className="social-error" role="alert">
            {error}
            <button
              aria-label="Закрыть ошибку общения"
              onClick={() => setError("")}
            >
              <X size={14} />
            </button>
          </p>
        )}
        {opening && (
          <p className="social-loading" role="status">
            <LoaderCircle size={15} className="is-spinning" />
            Открываем переписку…
          </p>
        )}
        <div className="social-directory-scroll">
          {tab === "people" ? (
            <>
              <label className="people-search">
                <Search size={16} />
                <input
                  ref={searchInput}
                  aria-label="Поиск пользователей"
                  placeholder="Имя или ID пользователя"
                  maxLength={100}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <p className="social-hint">
                Найдите человека по имени или попросите его ID.
              </p>
              {searching && (
                <p className="social-loading" role="status">
                  Ищем пользователей…
                </p>
              )}
              {!!query.trim() && query.trim().length < 2 && (
                <p className="social-hint">Введите хотя бы два символа.</p>
              )}
              {query.trim().length >= 2 &&
                !searching &&
                !found.length &&
                !error && (
                  <div className="social-inline-empty">
                    <Search size={21} />
                    <strong>Пока никого не нашли</strong>
                    <p>
                      Проверьте имя или вставьте полный ID. Пользователь должен
                      разрешить поиск в настройках.
                    </p>
                  </div>
                )}
              {found.map((p) => (
                <div className="social-person search-result" key={p.id}>
                  <a href={"#profile/" + p.id}>
                    <Avatar profile={p} />
                    <span>
                      <strong>{p.display_name}</strong>
                      <small>
                        {link(p.id)?.status === "accepted"
                          ? "У вас в друзьях"
                          : link(p.id)?.recipient_id === userId
                            ? "Хочет добавить вас в друзья"
                            : link(p.id)
                              ? "Заявка ожидает ответа"
                              : p.bio || "Пользователь MEMORA"}
                      </small>
                    </span>
                  </a>
                  {relationshipAction(p)}
                </div>
              ))}
              <div className="social-group-label">
                <h3>Заявки</h3>
                <span>{requests.length}</span>
              </div>
              {!requests.length && (
                <p className="social-quiet">Новых заявок пока нет.</p>
              )}
              {requests.map((f: Friendship) => {
                const id = peerId(f, userId),
                  p = person(id),
                  isIncoming = f.recipient_id === userId;
                return (
                  <div className="social-person request-card" key={f.id}>
                    <a href={"#profile/" + id}>
                      <Avatar profile={p} />
                      <span>
                        <strong>{p?.display_name || "Пользователь"}</strong>
                        <small>
                          {isIncoming
                            ? "Хочет стать вашим другом"
                            : "Заявка отправлена"}
                        </small>
                      </span>
                    </a>
                    <div className="request-actions">
                      {isIncoming && (
                        <button
                          disabled={!!actionBusy}
                          className="social-write"
                          onClick={() => void accept(f)}
                        >
                          <Check size={14} />
                          Принять
                        </button>
                      )}
                      <button
                        disabled={!!actionBusy}
                        onClick={() => void remove(f)}
                      >
                        {isIncoming ? "Отклонить" : "Отменить"}
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="social-group-label">
                <h3>Друзья</h3>
                <span>{accepted.length}</span>
              </div>
              {!accepted.length && (
                <div className="social-inline-empty">
                  <UserPlus size={24} />
                  <strong>Всё начинается со знакомства</strong>
                  <p>
                    Найдите друга выше и отправьте заявку. После принятия вы
                    сможете переписываться.
                  </p>
                </div>
              )}
              {accepted.map((f: Friendship) => {
                const id = peerId(f, userId),
                  p = person(id);
                return (
                  <div className="social-person" key={f.id}>
                    <a href={"#profile/" + id}>
                      <Avatar profile={p} />
                      <span>
                        <strong>{p?.display_name || "Пользователь"}</strong>
                        <small>В друзьях</small>
                      </span>
                    </a>
                    <div className="request-actions">
                      <button
                        className="social-write"
                        disabled={opening}
                        onClick={() => void open(id)}
                      >
                        Написать
                        <ArrowUpRight size={13} />
                      </button>
                      <button
                        aria-label={"Удалить друга " + (p?.display_name || "")}
                        className="icon-only"
                        onClick={() => {
                          if (
                            confirm(
                              "Удалить из друзей? История переписки сохранится.",
                            )
                          )
                            void remove(f);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <div className="social-group-label">
                <h3>Все переписки</h3>
                <span>{conversations.length}</span>
              </div>
              {!conversations.length && (
                <div className="social-inline-empty">
                  <MessageCircle size={27} />
                  <strong>Ваши разговоры — здесь</strong>
                  <p>Добавьте друга, чтобы обмениваться мыслями и планами.</p>
                  <button onClick={showPeople}>
                    <UserPlus size={15} />
                    Найти человека
                  </button>
                </div>
              )}
              {conversations.map((c: any) => {
                const id = c.user_a === userId ? c.user_b : c.user_a,
                  p = person(id);
                return (
                  <button
                    className={
                      "event-row trace-conversation" +
                      (active?.id === c.id ? " selected" : "")
                    }
                    key={c.id}
                    aria-label={
                      "Переписка: " + (p?.display_name || "Пользователь")
                    }
                    onClick={() => void open(id)}
                  >
                    <Avatar profile={p} />
                    <span>
                      <strong>{p?.display_name || "Переписка"}</strong>
                      <small>{c.last_body || "Начните разговор"}</small>
                    </span>
                    <span className="conversation-meta">
                      {c.last_at && (
                        <time>
                          {new Date(c.last_at).toLocaleDateString() ===
                          new Date().toLocaleDateString()
                            ? new Date(c.last_at).toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : new Date(c.last_at).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "short",
                              })}
                        </time>
                      )}
                      {Number(c.unread) > 0 && (
                        <b aria-label="Непрочитанные">{c.unread}</b>
                      )}
                    </span>
                  </button>
                );
              })}
              {accepted.length > 0 && (
                <>
                  <div className="social-group-label">
                    <h3>Начать разговор</h3>
                    <Users size={14} />
                  </div>
                  {accepted.slice(0, 8).map((f: Friendship) => {
                    const id = peerId(f, userId),
                      p = person(id);
                    return (
                      <button
                        className="social-quick-friend"
                        key={id}
                        disabled={opening}
                        onClick={() => void open(id)}
                      >
                        <Avatar profile={p} />
                        <span>{p?.display_name || "Пользователь"}</span>
                        <ChevronRight size={15} />
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
        <footer className="social-self">
          <Avatar profile={me} />
          <span>
            <strong>{me?.display_name || "Мой аккаунт"}</strong>
            <small>Пригласите друга по ID</small>
          </span>
          <button
            aria-label="Скопировать мой ID"
            title="Скопировать мой ID"
            onClick={() =>
              void navigator.clipboard.writeText(userId).then(
                () => setNotice("ID скопирован — отправьте его другу"),
                () => setError("Не удалось скопировать ID: " + userId),
              )
            }
          >
            <Copy size={15} />
          </button>
        </footer>
      </section>
      <section className="panel chat">
        {active ? (
          <>
            <header className="chat-header">
              <button
                className="chat-back icon-only"
                aria-label="Назад к перепискам"
                onClick={() => {
                  setActive(null);
                  if (initialPeer) location.hash = "chats";
                }}
              >
                <ArrowLeft size={19} />
              </button>
              <a className="chat-peer" href={"#profile/" + other}>
                <Avatar profile={person(other)} />
                <span>
                  <h2>{person(other)?.display_name || "Переписка"}</h2>
                  <small>
                    <span
                      className={
                        "connection-dot" +
                        (chat.status.startsWith("Сообщения")
                          ? " connected"
                          : "")
                      }
                    />
                    {chat.status}
                  </small>
                </span>
              </a>
              <a
                className="chat-profile-link"
                href={"#profile/" + other}
                aria-label="Открыть профиль собеседника"
              >
                <ArrowUpRight size={18} />
              </a>
            </header>
            {chat.error && (
              <div className="social-error" role="alert">
                {chat.error}
                <button onClick={chat.retry}>Повторить</button>
              </div>
            )}
            <div
              className="messages"
              ref={list}
              role="log"
              aria-label="История сообщений"
              aria-live="polite"
              onScroll={(e) => {
                const t = e.currentTarget;
                chat.near.current =
                  t.scrollHeight - t.scrollTop - t.clientHeight < 100;
              }}
            >
              {chat.loading && (
                <p className="social-loading" role="status">
                  Загружаем историю…
                </p>
              )}
              {chat.hasOlder && (
                <button
                  className="chat-load-older"
                  disabled={chat.historyBusy}
                  onClick={() => void chat.older()}
                >
                  {chat.historyBusy ? "Загрузка…" : "Загрузить предыдущие"}
                </button>
              )}
              {!chat.loading && !chat.messages.length && !chat.error && (
                <div className="chat-start">
                  <Avatar profile={person(other)} />
                  <strong>Начало вашей переписки</strong>
                  <p>Первое сообщение — начало новой связи.</p>
                </div>
              )}
              {chat.messages.map((m, index) => (
                <div className="trace-message-group" key={m.id}>
                  {(index === 0 ||
                    new Date(
                      chat.messages[index - 1].created_at,
                    ).toLocaleDateString() !==
                      new Date(m.created_at).toLocaleDateString()) && (
                    <div className="trace-date-divider">
                      {new Date(m.created_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                  )}
                  <div
                    className={
                      "bubble " + (m.sender_id === userId ? "mine" : "")
                    }
                  >
                    {m.body}
                    <small>
                      <time dateTime={m.created_at}>
                        {new Date(m.created_at).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                      {m.sender_id === userId && (
                        <Check size={11} aria-label="Отправлено" />
                      )}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            <div className="composer-area">
              {sendError && (
                <div className="social-error" role="alert">
                  {sendError}
                  <button disabled={busy} onClick={() => void submit()}>
                    Повторить отправку
                  </button>
                </div>
              )}
              {canSend ? (
                <form
                  ref={composer}
                  className="composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                  }}
                >
                  <textarea
                    aria-label="Сообщение"
                    placeholder="Напишите сообщение…"
                    maxLength={8000}
                    value={text}
                    disabled={busy}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing &&
                        matchMedia("(min-width:761px)").matches
                      ) {
                        e.preventDefault();
                        composer.current?.requestSubmit();
                      }
                    }}
                    required
                  />
                  <button
                    className="primary"
                    aria-label={busy ? "Отправка…" : "Отправить"}
                    disabled={busy || !text.trim()}
                  >
                    {busy ? (
                      <LoaderCircle size={17} className="is-spinning" />
                    ) : (
                      <Send size={17} />
                    )}
                    <span>{busy ? "Отправка…" : "Отправить"}</span>
                  </button>
                </form>
              ) : (
                <div className="chat-readonly">
                  <ShieldCheck size={18} />
                  <p>
                    История сохранена. Для новых сообщений добавьте собеседника
                    в друзья.
                  </p>
                  <button onClick={showPeople}>Открыть людей</button>
                </div>
              )}
              <div className="composer-footnote">
                <ShieldCheck size={12} />
                <span>Переписка доступна только её участникам</span>
                <small>Enter — отправить · Shift+Enter — новая строка</small>
              </div>
            </div>
          </>
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-art">
              <span>
                <MessageCircle size={43} />
              </span>
              <i>
                <Users size={18} />
              </i>
              <b>
                <Plus size={15} />
              </b>
            </div>
            <span className="eyebrow">ПРОСТРАНСТВО ДЛЯ ДИАЛОГА</span>
            <h2>
              Мысли, которыми
              <br />
              хочется поделиться.
            </h2>
            <p>
              Обсуждайте идеи и стройте планы вместе.
              <br />
              Выберите переписку или найдите друга.
            </p>
            <button className="primary" onClick={showPeople}>
              <UserPlus size={16} />
              Добавить друга
            </button>
            <small>
              <ShieldCheck size={13} />
              Личные сообщения. Только для вас двоих.
            </small>
          </div>
        )}
      </section>
    </div>
  );
}
