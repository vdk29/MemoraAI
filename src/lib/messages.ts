import { db, result } from "./supabase";
export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export function mergeMessages(
  current: Message[],
  incoming: Message[],
): Message[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}
export async function messagePage(conversationId: string, before?: Message) {
  let query = db
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  if (before)
    query = query.or(
      `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
    );
  return ((await result(query)) || []) as Message[];
}
export async function sendMessage(
  message: Omit<Message, "created_at">,
): Promise<Message> {
  const response = await db.from("messages").insert(message).select().single();
  if (!response.error) return response.data as Message;
  // A retry uses the same UUID after an ambiguous network outcome. Verify the
  // existing row before treating a uniqueness conflict as successful delivery.
  if (response.error.code === "23505") {
    const existing = (await result(
      db.from("messages").select("*").eq("id", message.id).single(),
    )) as Message;
    if (
      existing.sender_id === message.sender_id &&
      existing.conversation_id === message.conversation_id &&
      existing.body === message.body
    )
      return existing;
  }
  throw response.error;
}
