import { db, result } from "./supabase";

export type Friendship = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted";
};
export const peerId = (friend: Friendship, userId: string) =>
  friend.requester_id === userId ? friend.recipient_id : friend.requester_id;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function searchPeople(text: string, userId: string) {
  const term = text.trim().slice(0, 100);
  if (term.replace(/[%_\\]/g, "").length < 2) return [];
  let query = db
    .from("profiles")
    .select("id,display_name,bio,avatar_path,discoverable,created_at")
    .neq("id", userId)
    .eq("discoverable", true);
  query = uuid.test(term)
    ? query.eq("id", term)
    : query.ilike("display_name", `%${term.replace(/[%_\\]/g, "")}%`);
  return (await result(query.order("display_name").limit(20))) || [];
}
export async function relationship(userId: string, otherId: string) {
  return (await result(
    db
      .from("friendships")
      .select("*")
      .or(
        `and(requester_id.eq.${userId},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${userId})`,
      )
      .maybeSingle(),
  )) as Friendship | null;
}
export async function requestFriend(userId: string, otherId: string) {
  const response = await db
    .from("friendships")
    .insert({
      requester_id: userId,
      recipient_id: otherId,
    })
    .select()
    .single();
  // A simultaneous/repeated request is resolved to the existing relationship.
  if (response.error?.code === "23505") {
    const existing = await relationship(userId, otherId);
    if (existing) return existing;
  }
  if (response.error) throw response.error;
  return response.data as Friendship;
}
export async function acceptFriend(id: string) {
  return (await result(
    db
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", id)
      .select()
      .single(),
  )) as Friendship;
}
export async function removeFriend(id: string) {
  // Returning the row detects denied or already removed requests.
  return await result(
    db.from("friendships").delete().eq("id", id).select().single(),
  );
}
export async function openConversation(userId: string, otherId: string) {
  if (!uuid.test(otherId)) throw new Error("Некорректный ID пользователя.");
  const existing = await result(
    db
      .from("conversations")
      .select("*")
      .or(
        `and(user_a.eq.${userId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${userId})`,
      )
      .maybeSingle(),
  );
  if (existing) return existing;
  const response = await db
    .from("conversations")
    .insert({ user_a: userId, user_b: otherId })
    .select()
    .single();
  if (response.error?.code === "23505") {
    const concurrent = await result(
      db
        .from("conversations")
        .select("*")
        .or(
          `and(user_a.eq.${userId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${userId})`,
        )
        .single(),
    );
    return concurrent;
  }
  if (response.error) throw response.error;
  return response.data;
}
export function socialError(error: any) {
  if (error?.code === "42501")
    return "Действие недоступно. Проверьте, что заявка принята и пользователь разрешает новые знакомства.";
  if (error?.code === "PGRST116")
    return "Запись уже изменилась. Обновите список и попробуйте снова.";
  if (error?.message?.includes("fetch"))
    return "Не удалось связаться с сервером. Проверьте интернет и повторите.";
  return error?.message || "Не удалось выполнить действие. Попробуйте ещё раз.";
}
