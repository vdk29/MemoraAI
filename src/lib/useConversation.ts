import { useEffect, useRef, useState, type RefObject } from "react";
import { db, result } from "./supabase";
import { mergeMessages, messagePage, type Message } from "./messages";
import { socialError } from "./social";

export function useConversation(
  id: string | undefined,
  userId: string,
  refresh: () => Promise<void>,
  list: RefObject<HTMLDivElement | null>,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("Подключение…");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasOlder, setHasOlder] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const current = useRef(id);
  current.current = id;
  const reload = useRef<() => void>(() => {});
  const near = useRef(true);
  useEffect(() => {
    setMessages([]);
    setError("");
    setHasOlder(false);
    setHistoryBusy(false);
    near.current = true;
    if (!id) return;
    let alive = true,
      live = false,
      loadingPage = false,
      reading = false;
    let pendingRead = "",
      lastRead = "";
    setLoading(true);
    setStatus("Подключение…");
    async function markRead(stamp: string) {
      if (!alive || document.visibilityState !== "visible" || stamp <= lastRead)
        return;
      pendingRead = stamp > pendingRead ? stamp : pendingRead;
      if (reading) return;
      reading = true;
      try {
        while (alive && pendingRead > lastRead) {
          const readAt = pendingRead;
          await result(
            db.from("read_receipts").upsert({
              conversation_id: id,
              user_id: userId,
              read_at: readAt,
            }),
          );
          if (!alive) return;
          await result(
            db
              .from("notifications")
              .update({ read: true })
              .eq("reference_id", id!)
              .eq("kind", "message")
              .eq("read", false)
              .lte("created_at", readAt),
          );
          lastRead = readAt;
        }
        if (alive) void refresh().catch(() => {});
      } catch {
        // The next refresh retries the watermark; message delivery stays independent.
      } finally {
        reading = false;
      }
    }
    async function load() {
      if (!alive || loadingPage) return;
      loadingPage = true;
      try {
        const rows = await messagePage(id!);
        if (!alive) return;
        setMessages((current) => mergeMessages(current, rows));
        setHasOlder(rows.length === 50);
        setError("");
        const newest = rows.reduce(
          (last, m) => (m.created_at > last ? m.created_at : last),
          "",
        );
        if (newest) void markRead(newest);
      } catch (e) {
        if (alive) setError(socialError(e));
      } finally {
        loadingPage = false;
        if (alive) setLoading(false);
      }
    }
    reload.current = () => void load();
    void load();
    const channel = db
      .channel("chat:" + id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          if (!alive) return;
          const message = payload.new as Message;
          setMessages((current) => mergeMessages(current, [message]));
          void markRead(message.created_at);
        },
      )
      .subscribe((state) => {
        if (!alive) return;
        live = state === "SUBSCRIBED";
        setStatus(
          live
            ? "Сообщения в реальном времени"
            : "Проверяем новые сообщения каждые 8 секунд",
        );
        if (live) void load();
      });
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const poll = window.setInterval(() => {
      if (!live && document.visibilityState === "visible") {
        setStatus("Проверяем новые сообщения каждые 8 секунд");
        void load();
      }
    }, 8000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => {
      alive = false;
      reload.current = () => {};
      clearInterval(poll);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
      void db.removeChannel(channel);
    };
  }, [id, userId, refresh]);
  useEffect(() => {
    if (near.current && list.current)
      list.current.scrollTo({
        top: list.current.scrollHeight,
        behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [messages, list]);
  async function older() {
    if (!id || historyBusy || !messages.length) return;
    const owner = id,
      height = list.current?.scrollHeight || 0;
    near.current = false;
    setHistoryBusy(true);
    try {
      const rows = await messagePage(owner, messages[0]);
      if (current.current !== owner) return;
      setMessages((current) => mergeMessages(current, rows));
      setHasOlder(rows.length === 50);
      requestAnimationFrame(() => {
        if (list.current && current.current === owner)
          list.current.scrollTop += list.current.scrollHeight - height;
      });
    } catch (e) {
      if (current.current === owner) setError(socialError(e));
    } finally {
      if (current.current === owner) setHistoryBusy(false);
    }
  }
  return {
    messages,
    status,
    loading,
    error,
    hasOlder,
    historyBusy,
    older,
    near,
    retry: () => reload.current(),
    append: (message: Message) => {
      if (message.conversation_id === current.current)
        setMessages((rows) => mergeMessages(rows, [message]));
    },
  };
}
