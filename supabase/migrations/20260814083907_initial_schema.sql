create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nickname varchar(20) not null check (char_length(nickname) between 2 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_key on public.profiles (lower(email));

create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  is_active boolean not null default true,
  max_uses integer check (max_uses is null or max_uses >= 1),
  use_count integer not null default 0 check (use_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  title varchar(60) not null check (char_length(title) between 1 and 60),
  description text,
  category varchar(16) not null default 'ETC'
    check (category in ('GAME', 'FOOD', 'SPORT', 'STUDY', 'DRINK', 'ETC')),
  start_at timestamptz not null,
  deadline_at timestamptz,
  min_participants integer not null check (min_participants >= 1),
  max_participants integer not null check (
    max_participants >= min_participants and max_participants <= 100
  ),
  join_url text,
  status varchar(16) not null default 'OPEN'
    check (status in ('OPEN', 'CANCELLED', 'COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deadline_at is null or deadline_at <= start_at)
);

create index tasks_status_start_at_idx on public.tasks (status, start_at);
create index tasks_creator_id_idx on public.tasks (creator_id);

create table public.task_participants (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status varchar(16) not null check (status in ('JOINED', 'MAYBE', 'DECLINED')),
  leave_reason varchar(100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index task_participants_task_status_idx
  on public.task_participants (task_id, status);
create index task_participants_user_id_idx
  on public.task_participants (user_id);

create table public.task_watchers (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index task_watchers_user_id_idx on public.task_watchers (user_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  device_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  event_type varchar(32) not null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, event_type)
);

create index notification_events_unsent_idx
  on public.notification_events (scheduled_for)
  where sent_at is null;

create or replace function private.is_member(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = check_user_id
  );
$$;

revoke all on function private.is_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.tasks enable row level security;
alter table public.task_participants enable row level security;
alter table public.task_watchers enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_events enable row level security;

create policy profiles_member_read on public.profiles
  for select to authenticated
  using ((select private.is_member()));

create policy profiles_self_update on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id and (select private.is_member()))
  with check ((select auth.uid()) = id and (select private.is_member()));

create policy tasks_member_read on public.tasks
  for select to authenticated
  using ((select private.is_member()));

create policy tasks_member_create on public.tasks
  for insert to authenticated
  with check ((select private.is_member()) and creator_id = (select auth.uid()));

create policy tasks_creator_update on public.tasks
  for update to authenticated
  using ((select private.is_member()) and creator_id = (select auth.uid()))
  with check ((select private.is_member()) and creator_id = (select auth.uid()));

create policy participants_member_read on public.task_participants
  for select to authenticated
  using ((select private.is_member()));

create policy participants_self_create on public.task_participants
  for insert to authenticated
  with check ((select private.is_member()) and user_id = (select auth.uid()));

create policy participants_self_update on public.task_participants
  for update to authenticated
  using ((select private.is_member()) and user_id = (select auth.uid()))
  with check ((select private.is_member()) and user_id = (select auth.uid()));

create policy watchers_self_read on public.task_watchers
  for select to authenticated
  using ((select private.is_member()) and user_id = (select auth.uid()));

create policy watchers_self_create on public.task_watchers
  for insert to authenticated
  with check ((select private.is_member()) and user_id = (select auth.uid()));

create policy watchers_self_delete on public.task_watchers
  for delete to authenticated
  using ((select private.is_member()) and user_id = (select auth.uid()));

create policy subscriptions_self_read on public.push_subscriptions
  for select to authenticated
  using ((select private.is_member()) and user_id = (select auth.uid()));

create policy subscriptions_self_create on public.push_subscriptions
  for insert to authenticated
  with check ((select private.is_member()) and user_id = (select auth.uid()));

create policy subscriptions_self_update on public.push_subscriptions
  for update to authenticated
  using ((select private.is_member()) and user_id = (select auth.uid()))
  with check ((select private.is_member()) and user_id = (select auth.uid()));

create policy subscriptions_self_delete on public.push_subscriptions
  for delete to authenticated
  using ((select private.is_member()) and user_id = (select auth.uid()));

create view public.task_overview
with (security_invoker = on)
as
select
  t.id,
  t.title,
  t.description,
  t.category,
  t.start_at,
  t.deadline_at,
  t.min_participants,
  t.max_participants,
  t.join_url,
  t.status,
  t.creator_id,
  p.nickname as creator_nickname,
  count(tp.user_id) filter (where tp.status = 'JOINED')::integer as joined_count
from public.tasks t
join public.profiles p on p.id = t.creator_id
left join public.task_participants tp on tp.task_id = t.id
group by t.id, p.nickname;

revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.tasks to authenticated;
grant select, insert, update on public.task_participants to authenticated;
grant select, insert, delete on public.task_watchers to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select on public.task_overview to authenticated;

create or replace function public.complete_onboarding(
  p_code_hash text,
  p_nickname text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invite public.invite_codes%rowtype;
  user_email text := auth.jwt() ->> 'email';
begin
  if current_user_id is null then
    raise exception '로그인이 필요해요.' using errcode = '42501';
  end if;

  if char_length(trim(p_nickname)) not between 2 and 20 then
    raise exception '닉네임은 2~20자로 입력해 주세요.' using errcode = '22023';
  end if;

  if exists (select 1 from public.profiles where id = current_user_id) then
    return;
  end if;

  select * into invite
  from public.invite_codes
  where code_hash = p_code_hash
  for update;

  if not found
    or not invite.is_active
    or (invite.expires_at is not null and invite.expires_at <= now())
    or (invite.max_uses is not null and invite.use_count >= invite.max_uses)
  then
    raise exception '사용할 수 없는 초대 코드예요.' using errcode = '22023';
  end if;

  insert into public.profiles (id, email, nickname)
  values (current_user_id, coalesce(user_email, ''), trim(p_nickname));

  update public.invite_codes
  set use_count = use_count + 1
  where id = invite.id;
end;
$$;

revoke all on function public.complete_onboarding(text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text) to authenticated;

create or replace function public.create_task(
  p_title text,
  p_description text,
  p_category text,
  p_start_at timestamptz,
  p_deadline_at timestamptz,
  p_min_participants integer,
  p_max_participants integer,
  p_join_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_task_id uuid;
begin
  if current_user_id is null or not private.is_member(current_user_id) then
    raise exception '가입 후 이용해 주세요.' using errcode = '42501';
  end if;

  if p_start_at <= now() then
    raise exception '시작 시간은 현재보다 뒤여야 해요.' using errcode = '22023';
  end if;

  insert into public.tasks (
    creator_id, title, description, category, start_at, deadline_at,
    min_participants, max_participants, join_url
  ) values (
    current_user_id, trim(p_title), nullif(trim(p_description), ''), p_category,
    p_start_at, p_deadline_at, p_min_participants, p_max_participants,
    nullif(trim(p_join_url), '')
  )
  returning id into new_task_id;

  insert into public.task_participants (task_id, user_id, status)
  values (new_task_id, current_user_id, 'JOINED');

  insert into public.notification_events (task_id, event_type)
  values (new_task_id, 'TASK_CREATED');

  return new_task_id;
end;
$$;

revoke all on function public.create_task(text, text, text, timestamptz, timestamptz, integer, integer, text) from public, anon;
grant execute on function public.create_task(text, text, text, timestamptz, timestamptz, integer, integer, text) to authenticated;

create or replace function public.set_task_participation(
  p_task_id uuid,
  p_status text,
  p_reason text default null
)
returns table (new_status text, joined_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_task public.tasks%rowtype;
  previous_status text;
  final_joined_count integer;
begin
  if current_user_id is null or not private.is_member(current_user_id) then
    raise exception '가입 후 이용해 주세요.' using errcode = '42501';
  end if;

  if p_status not in ('JOINED', 'MAYBE', 'DECLINED') then
    raise exception '참여 상태를 확인해 주세요.' using errcode = '22023';
  end if;

  select * into selected_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception '모임을 찾을 수 없어요.' using errcode = 'P0002';
  end if;

  if selected_task.status <> 'OPEN' then
    raise exception '종료된 모임이에요.' using errcode = '22023';
  end if;

  select tp.status into previous_status
  from public.task_participants tp
  where tp.task_id = p_task_id and tp.user_id = current_user_id;

  if p_status = 'JOINED' and previous_status is distinct from 'JOINED' then
    if selected_task.deadline_at is not null and selected_task.deadline_at <= now() then
      raise exception '모집이 마감되었어요.' using errcode = '22023';
    end if;

    select count(*)::integer into final_joined_count
    from public.task_participants tp
    where tp.task_id = p_task_id and tp.status = 'JOINED';

    if final_joined_count >= selected_task.max_participants then
      raise exception '현재 모집이 완료되었습니다.' using errcode = '22023';
    end if;
  end if;

  insert into public.task_participants (task_id, user_id, status, leave_reason)
  values (
    p_task_id,
    current_user_id,
    p_status,
    case when p_status = 'JOINED' then null else left(nullif(trim(p_reason), ''), 100) end
  )
  on conflict (task_id, user_id) do update
  set status = excluded.status,
      leave_reason = excluded.leave_reason,
      updated_at = now();

  select count(*)::integer into final_joined_count
  from public.task_participants tp
  where tp.task_id = p_task_id and tp.status = 'JOINED';

  if final_joined_count >= selected_task.min_participants then
    insert into public.notification_events (task_id, event_type)
    values (p_task_id, 'MIN_REACHED')
    on conflict (task_id, event_type) do nothing;
  end if;

  if final_joined_count >= selected_task.max_participants then
    insert into public.notification_events (task_id, event_type)
    values (p_task_id, 'FULL')
    on conflict (task_id, event_type) do nothing;
  end if;

  return query select p_status, final_joined_count;
end;
$$;

revoke all on function public.set_task_participation(uuid, text, text) from public, anon;
grant execute on function public.set_task_participation(uuid, text, text) to authenticated;

create or replace function private.record_task_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED' then
    insert into public.notification_events (task_id, event_type)
    values (new.id, 'TASK_CANCELLED')
    on conflict (task_id, event_type) do nothing;
  end if;
  return new;
end;
$$;

create trigger tasks_record_cancelled
after update of status on public.tasks
for each row execute function private.record_task_cancelled();

alter table public.tasks replica identity full;
alter table public.task_participants replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_participants'
  ) then
    alter publication supabase_realtime add table public.task_participants;
  end if;
end;
$$;
