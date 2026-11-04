-- Real database assertions under authenticated roles. No permanent users or content.
begin;
insert into auth.users(id,email) values
('91000000-0000-4000-8000-000000000001','memora-social-a@example.invalid'),
('91000000-0000-4000-8000-000000000002','memora-social-b@example.invalid'),
('91000000-0000-4000-8000-000000000003','memora-social-c@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.friendships(id,requester_id,recipient_id) values('92000000-0000-4000-8000-000000000001',auth.uid(),'91000000-0000-4000-8000-000000000002');
do $$declare n integer;begin
 update public.friendships set status='accepted' where id='92000000-0000-4000-8000-000000000001';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'requester accepted own request';end if;
 begin
 insert into public.conversations(user_a,user_b) values(auth.uid(),'91000000-0000-4000-8000-000000000002');
 raise exception 'conversation before acceptance allowed';
 exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin
 begin insert into public.friendships(requester_id,recipient_id) values(auth.uid(),'91000000-0000-4000-8000-000000000001');
 raise exception 'reverse duplicate accepted';exception when unique_violation then null;end;
 if (select count(*) from public.notifications where kind='friend_request')<>1 then raise exception 'request notification missing';end if;
end$$;
update public.friendships set status='accepted' where id='92000000-0000-4000-8000-000000000001';
insert into public.conversations(id,user_a,user_b) values('93000000-0000-4000-8000-000000000001',auth.uid(),'91000000-0000-4000-8000-000000000001');
insert into public.messages(conversation_id,sender_id,body) values('93000000-0000-4000-8000-000000000001',auth.uid(),'Сообщение от B');
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.messages(conversation_id,sender_id,body) values('93000000-0000-4000-8000-000000000001',auth.uid(),'Ответ от A');
do $$begin
 if (select count(*) from public.messages)<>2 then raise exception 'participant history incomplete';end if;
 begin insert into public.messages(conversation_id,sender_id,body) values('93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','spoof');
 raise exception 'sender spoof allowed';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.messages) or exists(select 1 from public.friendships) or exists(select 1 from public.conversations) then raise exception 'outsider read social data';end if;
 begin insert into public.messages(conversation_id,sender_id,body) values('93000000-0000-4000-8000-000000000001',auth.uid(),'attack');
 raise exception 'outsider sent';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
delete from public.friendships where id='92000000-0000-4000-8000-000000000001';
do $$begin
 if (select count(*) from public.messages)<>2 then raise exception 'history lost on unfriend';end if;
 begin insert into public.messages(conversation_id,sender_id,body) values('93000000-0000-4000-8000-000000000001',auth.uid(),'after unfriend');
 raise exception 'sending after unfriend allowed';exception when insufficient_privilege then null;end;
end$$;
rollback;
