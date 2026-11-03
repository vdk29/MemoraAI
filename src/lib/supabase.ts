import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (
  !url ||
  !key ||
  new URL(url).hostname !== "ewsqrqzabahjtmorrqhh.supabase.co"
)
  throw new Error("Настройте переменные окружения проекта Memora");
export const db = createClient(url, key);
export async function result<T extends { error: unknown; data?: unknown }>(
  request: PromiseLike<T>,
): Promise<T["data"]> {
  const response = await request;
  if (response.error) throw response.error;
  return response.data;
}
export const date = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
