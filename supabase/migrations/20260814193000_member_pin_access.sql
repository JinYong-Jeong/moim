alter table public.profiles
  add column login_name varchar(40) not null;

create unique index profiles_login_name_key
  on public.profiles (login_name);

create table private.auth_attempts (
  key_hash text primary key,
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on table private.auth_attempts from public, anon, authenticated;

create or replace function public.check_member_access_rate_limit(
  p_key_hash text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt private.auth_attempts%rowtype;
begin
  if char_length(p_key_hash) <> 64 then
    raise exception '잘못된 요청이에요.' using errcode = '22023';
  end if;

  select * into attempt
  from private.auth_attempts
  where key_hash = p_key_hash;

  if not found then
    return 0;
  end if;

  if attempt.window_started_at <= now() - interval '15 minutes' then
    delete from private.auth_attempts where key_hash = p_key_hash;
    return 0;
  end if;

  if attempt.blocked_until is not null and attempt.blocked_until > now() then
    return greatest(1, ceil(extract(epoch from (attempt.blocked_until - now())))::integer);
  end if;

  return 0;
end;
$$;

create or replace function public.record_member_access_attempt(
  p_key_hash text,
  p_limit integer,
  p_success boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt private.auth_attempts%rowtype;
  next_attempts integer;
  retry_after integer := 0;
begin
  if char_length(p_key_hash) <> 64 or p_limit not between 1 and 100 then
    raise exception '잘못된 요청이에요.' using errcode = '22023';
  end if;

  if p_success then
    delete from private.auth_attempts where key_hash = p_key_hash;
    return 0;
  end if;

  select * into attempt
  from private.auth_attempts
  where key_hash = p_key_hash
  for update;

  if not found then
    insert into private.auth_attempts (key_hash, attempts)
    values (p_key_hash, 1);
    return 0;
  end if;

  if attempt.window_started_at <= now() - interval '15 minutes' then
    update private.auth_attempts
    set attempts = 1,
        window_started_at = now(),
        blocked_until = null,
        updated_at = now()
    where key_hash = p_key_hash;
    return 0;
  end if;

  next_attempts := attempt.attempts + 1;
  if next_attempts >= p_limit then
    retry_after := 900;
  end if;

  update private.auth_attempts
  set attempts = next_attempts,
      blocked_until = case when retry_after > 0 then now() + interval '15 minutes' else null end,
      updated_at = now()
  where key_hash = p_key_hash;

  return retry_after;
end;
$$;

create or replace function public.register_member_profile(
  p_user_id uuid,
  p_email text,
  p_login_name text,
  p_nickname text,
  p_code_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.invite_codes%rowtype;
begin
  if p_user_id is null
    or char_length(trim(p_nickname)) not between 2 and 20
    or char_length(p_login_name) not between 2 and 40
    or char_length(p_code_hash) <> 64
  then
    raise exception '입력값을 다시 확인해 주세요.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.profiles where login_name = p_login_name
  ) then
    raise exception '이미 사용 중인 이름이에요.' using errcode = '23505';
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

  insert into public.profiles (id, email, nickname, login_name)
  values (p_user_id, p_email, trim(p_nickname), p_login_name);

  update public.invite_codes
  set use_count = use_count + 1
  where id = invite.id;
end;
$$;

revoke all on function public.check_member_access_rate_limit(text) from public, anon, authenticated;
revoke all on function public.record_member_access_attempt(text, integer, boolean) from public, anon, authenticated;
revoke all on function public.register_member_profile(uuid, text, text, text, text) from public, anon, authenticated;

grant execute on function public.check_member_access_rate_limit(text) to service_role;
grant execute on function public.record_member_access_attempt(text, integer, boolean) to service_role;
grant execute on function public.register_member_profile(uuid, text, text, text, text) to service_role;

revoke execute on function public.complete_onboarding(text, text) from authenticated;

insert into public.invite_codes (code_hash, max_uses)
values ('12b8a0f837c8f3906a6fab551308efa52c14799a45ab50254deeddc312a1ef15', 100);
