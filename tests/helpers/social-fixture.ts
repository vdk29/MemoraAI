// Transport simulator only. PostgreSQL access control is verified separately by SQL.
import type { BrowserContext } from "@playwright/test";
export const alice = "10000000-0000-4000-8000-000000000001";
export const boris = "10000000-0000-4000-8000-000000000002";
export const cid = "40000000-0000-4000-8000-000000000001";
export function socialBackend() {
  const now = new Date().toISOString();
  const profiles = [
    {
      id: alice,
      display_name: "Анна",
      bio: "Дизайн, идеи и новые связи.",
      discoverable: true,
      created_at: now,
    },
    {
      id: boris,
      display_name: "Борис",
      bio: "Строю планы и делюсь мыслями.",
      discoverable: true,
      created_at: now,
    },
  ];
  let friendships: any[] = [],
    conversations: any[] = [],
    messages: any[] = [],
    notifications: any[] = [];
  const receipts = new Map<string, string>();
  const sockets: any[] = [];
  let subscriptionId = 1,
    friendPosts = 0;
  function emit(table: string, type: string, row: any) {
    for (const socket of sockets)
      for (const channel of socket.channels.values()) {
        const ids = channel.filters
          .filter(
            (f: any) =>
              f.table === table &&
              (f.event === "*" || f.event === type) &&
              (!f.filter ||
                row[f.filter.split("=eq.")[0]] === f.filter.split("=eq.")[1]),
          )
          .map((f: any) => f.id);
        if (!ids.length) continue;
        if (
          table === "friendships" &&
          ![row.requester_id, row.recipient_id].includes(socket.uid)
        )
          continue;
        if (table === "notifications" && row.user_id !== socket.uid) continue;
        const payload = {
          ids,
          data: {
            schema: "public",
            table,
            type,
            commit_timestamp: new Date().toISOString(),
            columns: Object.keys(row).map((name) => ({ name, type: "text" })),
            record: row,
            old_record: row,
            errors: null,
          },
        };
        socket.send(channel, "postgres_changes", payload);
        // Deliberately repeat message delivery to verify UUID deduplication.
        if (table === "messages")
          socket.send(channel, "postgres_changes", payload);
      }
  }
  function notify(
    user_id: string,
    actor_id: string,
    kind: string,
    reference_id: string,
  ) {
    const row = {
      id: crypto.randomUUID(),
      user_id,
      actor_id,
      kind,
      reference_id,
      read: false,
      created_at: new Date().toISOString(),
    };
    notifications.push(row);
    emit("notifications", "INSERT", row);
  }
  async function attach(context: BrowserContext, uid: string, live = true) {
    await context.addInitScript(
      ({ uid }) => {
        localStorage.setItem("memora-theme", "dark");
        localStorage.setItem(
          "sb-ewsqrqzabahjtmorrqhh-auth-token",
          JSON.stringify({
            access_token: "fixture",
            refresh_token: "fixture",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: uid, aud: "authenticated", role: "authenticated" },
          }),
        );
      },
      { uid },
    );
    await context.routeWebSocket(/supabase.co\/realtime\//, (ws) => {
      const socket = {
        uid,
        channels: new Map(),
        send: (channel: any, event: string, payload: any) => {
          ws.send(
            channel.array
              ? JSON.stringify([
                  channel.joinRef,
                  null,
                  channel.topic,
                  event,
                  payload,
                ])
              : JSON.stringify({
                  topic: channel.topic,
                  event,
                  payload,
                  ref: null,
                }),
          );
        },
      };
      sockets.push(socket);
      ws.onMessage((raw) => {
        if (!live) return;
        const frame = JSON.parse(raw.toString()),
          array = Array.isArray(frame);
        const [joinRef, ref, topic, event, payload] = array
          ? frame
          : [
              frame.join_ref,
              frame.ref,
              frame.topic,
              frame.event,
              frame.payload,
            ];
        const reply = (response: any = {}) =>
          ws.send(
            JSON.stringify(
              array
                ? [joinRef, ref, topic, "phx_reply", { status: "ok", response }]
                : {
                    topic,
                    event: "phx_reply",
                    payload: { status: "ok", response },
                    ref,
                  },
            ),
          );
        if (event === "phx_join") {
          const filters = (payload.config?.postgres_changes || []).map(
            (f: any) => ({ ...f, id: subscriptionId++ }),
          );
          const channel = { joinRef, topic, array, filters };
          socket.channels.set(topic, channel);
          reply({ postgres_changes: filters });
        } else if (event === "phx_leave") {
          socket.channels.delete(topic);
          reply();
        } else if (event === "heartbeat") reply();
      });
      ws.onClose(() => {
        socket.channels.clear();
      });
    });
    await context.route(
      "https://ewsqrqzabahjtmorrqhh.supabase.co/**",
      async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          table = url.pathname.split("/").pop(),
          method = req.method();
        const single = req.headers()["accept"]?.includes("vnd.pgrst.object");
        let data: any = [];
        let changed: any = null,
          type = "INSERT",
          status = 200;
        const fail = async (code: string, message: string, http: number) =>
          route.fulfill({
            status: http,
            contentType: "application/json",
            body: JSON.stringify({ code, message }),
          });
        if (table === "profiles") {
          data = profiles;
          const id = url.searchParams.get("id"),
            neq = url.searchParams.get("id")?.startsWith("neq."),
            name = url.searchParams.get("display_name");
          if (id?.startsWith("in."))
            data = profiles.filter((p) => id.includes(p.id));
          else if (id)
            data = profiles.filter((p) =>
              neq ? p.id !== id.slice(4) : p.id === id.slice(3),
            );
          if (name)
            data = data.filter((p: any) =>
              p.display_name.toLocaleLowerCase().includes(
                name
                  .replace(/^ilike\./, "")
                  .replaceAll("%", "")
                  .toLocaleLowerCase(),
              ),
            );
        }
        if (table === "settings")
          data = [
            { user_id: uid, notify_messages: true, notify_friends: true },
          ];
        if (table === "friendships") {
          if (method === "POST") {
            friendPosts++;
            if (friendships.length)
              return fail("23505", "duplicate friendship", 409);
            changed = {
              ...req.postDataJSON(),
              id: "30000000-0000-4000-8000-000000000001",
              status: "pending",
              created_at: now,
            };
            friendships = [changed];
            notify(changed.recipient_id, uid, "friend_request", changed.id);
          } else if (method === "PATCH") {
            changed = { ...friendships[0], status: "accepted" };
            friendships = [changed];
            type = "UPDATE";
            notify(changed.requester_id, uid, "friend_accepted", changed.id);
          } else if (method === "DELETE") {
            changed = friendships[0];
            friendships = [];
            type = "DELETE";
          }
          data = method === "DELETE" ? [changed] : friendships;
        }
        if (table === "conversations") {
          if (method === "POST") {
            changed = { ...req.postDataJSON(), id: cid, created_at: now };
            conversations = [changed];
          }
          data = conversations;
        }
        if (table === "messages") {
          if (method === "POST") {
            const payload = req.postDataJSON();
            if (!friendships.some((f) => f.status === "accepted"))
              return fail("42501", "friendship required", 403);
            const duplicate = messages.some((m) => m.id === payload.id);
            if (duplicate) return fail("23505", "duplicate message", 409);
            changed = { ...payload, created_at: new Date().toISOString() };
            messages.push(changed);
            notify(uid === alice ? boris : alice, uid, "message", cid);
            data = [changed];
          } else {
            data = messages.filter(
              (m) =>
                !url.searchParams.has("id") ||
                url.searchParams.get("id") === "eq." + m.id,
            );
          }
        }
        if (table === "read_receipts" && method === "POST") {
          const row = req.postDataJSON();
          receipts.set(uid, row.read_at);
        }
        if (table === "conversation_summaries")
          data = conversations.map((c) => ({
            conversation_id: c.id,
            last_body: messages.at(-1)?.body,
            last_at: messages.at(-1)?.created_at,
            unread: messages.filter(
              (m) =>
                m.sender_id !== uid && m.created_at > (receipts.get(uid) || ""),
            ).length,
          }));
        if (table === "notifications") {
          if (method === "PATCH")
            notifications = notifications.map((n) =>
              n.user_id === uid ? { ...n, read: true } : n,
            );
          data = notifications.filter((n) => n.user_id === uid);
        }
        if (single) data = Array.isArray(data) ? (data[0] ?? null) : data;
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
        if (changed && table) emit(table, type, changed);
      },
    );
  }
  return {
    attach,
    seedFriends: () => {
      friendships = [
        {
          id: "30000000-0000-4000-8000-000000000001",
          requester_id: alice,
          recipient_id: boris,
          status: "accepted",
          created_at: now,
        },
      ];
      conversations = [
        { id: cid, user_a: alice, user_b: boris, created_at: now },
      ];
    },
    profiles,
    get friendshipPosts() {
      return friendPosts;
    },
    get messages() {
      return messages;
    },
    chatSubscriptions: (uid: string) =>
      sockets
        .filter((s) => s.uid === uid)
        .reduce(
          (n, s) =>
            n +
            [...s.channels.keys()].filter((t) => t.includes("chat:")).length,
          0,
        ),
  };
}
