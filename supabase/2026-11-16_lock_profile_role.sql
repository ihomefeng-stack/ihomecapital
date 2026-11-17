-- 已于 2026-11-16 在生产库执行（Supabase migration: lock_profile_role_changes）
-- 修复：任何注册用户都能把自己的 profiles.role 改成 admin 的提权漏洞。
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' and new.role is distinct from 'visitor' then
    raise exception 'only admins can assign roles' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.role is distinct from old.role or new.id is distinct from old.id) then
    raise exception 'only admins can change roles' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

revoke execute on function public.guard_profile_role() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
