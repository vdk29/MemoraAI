-- Invoker RPC: all reads retain the caller's RLS context.
create function public.conversation_summaries()
returns table(conversation_id uuid,last_body text,last_at timestamptz,unread bigint)
language sql stable security invoker set search_path='' as $$
 select c.id,last_message.body,last_message.created_at,
 (select count(*) from public.messages m where m.conversation_id=c.id
  and m.sender_id<>(select auth.uid()) and m.created_at>coalesce(r.read_at,'-infinity'::timestamptz))
 from public.conversations c
 left join public.read_receipts r on r.conversation_id=c.id and r.user_id=(select auth.uid())
 left join lateral(select m.body,m.created_at from public.messages m where m.conversation_id=c.id order by m.created_at desc,m.id desc limit 1) last_message on true
 where (select auth.uid()) in(c.user_a,c.user_b);
$$;
revoke execute on function public.conversation_summaries() from public,anon;
grant execute on function public.conversation_summaries() to authenticated;
