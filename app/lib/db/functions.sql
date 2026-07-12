-- Fonctions Postgres utilisées par l'app (hors schéma Drizzle).
-- À appliquer après la création des tables, sur chaque base (dev / laptop / VPS).

-- Incrément atomique de total_spent (lot 02)
create or replace function public.increment_total_spent(p_user_id uuid, p_amount integer)
returns void language sql as $$
  update public.users set total_spent = coalesce(total_spent, 0) + p_amount where id = p_user_id;
$$;

-- Enregistrement atomique d'un échec de login + verrouillage glissant (lot 04)
create or replace function public.record_login_failure(
  p_identifier text, p_max integer, p_window_secs integer, p_lockout_secs integer
) returns timestamptz language plpgsql as $$
declare v_row public.login_attempts; v_locked timestamptz;
begin
  select * into v_row from public.login_attempts where identifier = p_identifier for update;
  if not found then
    insert into public.login_attempts (identifier, failed_count, first_failed_at)
      values (p_identifier, 1, now());
    return null;
  end if;
  if v_row.first_failed_at < now() - make_interval(secs => p_window_secs) then
    update public.login_attempts set failed_count = 1, first_failed_at = now(), locked_until = null
      where identifier = p_identifier;
    return null;
  end if;
  v_locked := case when v_row.failed_count + 1 >= p_max then now() + make_interval(secs => p_lockout_secs)
                   else v_row.locked_until end;
  update public.login_attempts set failed_count = v_row.failed_count + 1, locked_until = v_locked
    where identifier = p_identifier;
  return v_locked;
end;
$$;

-- Réinitialisation du compteur après login réussi (lot 04)
create or replace function public.clear_login_attempts(p_identifier text)
returns void language sql as $$
  delete from public.login_attempts where identifier = p_identifier;
$$;
