create or replace function public.partner_facing_status_for(_status public.partner_application_status)
returns public.partner_facing_status language sql immutable set search_path to 'public' as $$
  select case _status
    when 'started' then 'application_started'
    when 'submitted' then 'application_submitted'
    when 'missing_information' then 'additional_information_needed'
    when 'under_review' then 'under_review'
    when 'offer_available' then 'approved'
    when 'approved' then 'approved'
    when 'contract_requested' then 'approved'
    when 'contract_sent' then 'approved'
    when 'contract_signed' then 'approved'
    when 'funded' then 'funded'
    when 'declined' then 'declined'
    when 'duplicate' then 'closed_withdrawn'
    when 'offer_expired' then 'closed_withdrawn'
    else 'referred'
  end::public.partner_facing_status
$$;
revoke all on function public.partner_facing_status_for(public.partner_application_status) from public, anon, authenticated;

create or replace function public.partner_application_state_sync()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare _new public.partner_facing_status;
begin
  _new := public.partner_facing_status_for(new.status);

  if new.status is distinct from old.status then
    if new.partner_status is not distinct from old.partner_status then
      new.partner_status := _new;
    end if;

    if new.status = 'funded' then
      new.funding_state := 'funded';
    elsif new.status in ('declined', 'duplicate', 'offer_expired') then
      new.funding_state := 'cancelled';
    end if;

    if new.status = 'submitted' and new.application_state <> 'submitted' then
      new.application_state := 'submitted';
    end if;

    insert into public.partner_application_status_history
      (application_id, state_kind, previous_value, new_value, source, partner_visible, reason)
    values (new.id, 'internal', old.status::text, new.status::text, 'system', false, null);
  end if;

  if new.partner_status is distinct from old.partner_status then
    insert into public.partner_application_status_history
      (application_id, state_kind, previous_value, new_value, source, partner_visible, reason)
    values (new.id, 'partner', old.partner_status::text, new.partner_status::text, 'system', true, null);
  end if;

  if new.funding_state is distinct from old.funding_state then
    insert into public.partner_application_status_history
      (application_id, state_kind, previous_value, new_value, source, partner_visible, reason)
    values (new.id, 'funding', old.funding_state::text, new.funding_state::text, 'system', true, null);
  end if;

  return new;
end $$;
revoke all on function public.partner_application_state_sync() from public, anon, authenticated;

drop trigger if exists partner_application_state_sync_trg on public.partner_applications;
create trigger partner_application_state_sync_trg
before update on public.partner_applications
for each row execute function public.partner_application_state_sync();

alter table public.partner_applications disable trigger partner_applications_guard_trg;

update public.partner_applications
   set partner_status = public.partner_facing_status_for(status)
 where partner_status is distinct from public.partner_facing_status_for(status);

alter table public.partner_applications enable trigger partner_applications_guard_trg;