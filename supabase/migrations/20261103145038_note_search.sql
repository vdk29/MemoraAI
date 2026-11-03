create function public.search_notes(query_text text default '',only_favorites boolean default false,category uuid default null,sort_by text default 'updated_at',page_offset integer default 0)
returns setof public.notes language sql stable security invoker set search_path='' as $$
 select n.* from public.notes n where n.user_id=(select auth.uid())
 and (not only_favorites or n.favorite) and (category is null or n.category_id=category)
 and strpos(lower(n.title||' '||n.content||' '||array_to_string(n.tags,' ')),lower(left(query_text,200)))>0
 order by case when sort_by='title' then n.title end asc,
 case when sort_by='created_at' then n.created_at else n.updated_at end desc,n.id
 limit 50 offset greatest(page_offset,0);
$$;
revoke execute on function public.search_notes(text,boolean,uuid,text,integer) from public,anon;
grant execute on function public.search_notes(text,boolean,uuid,text,integer) to authenticated;
