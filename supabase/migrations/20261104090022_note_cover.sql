alter table public.notes add column cover text check(cover is null or cover='memory');
comment on column public.notes.cover is 'Optional user-selected MEMORA memory lens cover. Ownership remains protected by notes RLS.';
