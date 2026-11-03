import { db, result } from "./supabase";
export const PAGE_SIZE = 50;
export const workspaceTables = [
  "notes",
  "categories",
  "events",
  "friendships",
  "conversations",
  "notifications",
  "settings",
] as const;
export type WorkspaceTable = (typeof workspaceTables)[number];
export async function workspacePage(table: WorkspaceTable, offset = 0) {
  let query = db.from(table).select("*");
  if (table === "notes")
    query = query.order("updated_at", { ascending: false });
  else if (table === "events") query = query.order("starts_at");
  else if (table === "settings") query = query.order("user_id");
  else if (table === "categories") query = query.order("name");
  else query = query.order("created_at", { ascending: false });
  if (table !== "settings") query = query.order("id");
  return (await result(query.range(offset, offset + PAGE_SIZE - 1))) || [];
}
export async function relatedProfiles(
  userId: string,
  data: Record<string, any[]>,
) {
  const ids = new Set<string>([userId]);
  for (const f of data.friendships || []) {
    ids.add(f.requester_id);
    ids.add(f.recipient_id);
  }
  for (const c of data.conversations || []) {
    ids.add(c.user_a);
    ids.add(c.user_b);
  }
  for (const n of data.notifications || []) if (n.actor_id) ids.add(n.actor_id);
  const all = [...ids];
  const rows: any[] = [];
  for (let i = 0; i < all.length; i += 100)
    rows.push(
      ...((await result(
        db
          .from("profiles")
          .select("*")
          .in("id", all.slice(i, i + 100)),
      )) || []),
    );
  return rows;
}
export function appendRows(current: any[], incoming: any[]) {
  const rows = new Map(current.map((r) => [r.id, r]));
  for (const row of incoming) rows.set(row.id, row);
  return [...rows.values()];
}
