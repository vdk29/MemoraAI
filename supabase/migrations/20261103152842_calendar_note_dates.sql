alter table public.notes add column scheduled_on date;
create index notes_calendar_date on public.notes(user_id,scheduled_on);
comment on column public.notes.scheduled_on is 'Optional calendar day; null notes appear on their local creation date.';
