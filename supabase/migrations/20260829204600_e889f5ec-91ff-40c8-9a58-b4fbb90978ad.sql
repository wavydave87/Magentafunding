create table public.deal_revision_requests (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  requested_amount numeric not null,
  frequency text not null,
  computed_payment numeric not null,
  computed_payback numeric not null,
  note text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert on public.deal_revision_requests to anon;
grant select, insert, update on public.deal_revision_requests to authenticated;
grant all on public.deal_revision_requests to service_role;

alter table public.deal_revision_requests enable row level security;

create policy "clients read revisions for open deal"
  on public.deal_revision_requests for select to anon
  using (public.deal_is_open(deal_id));

create policy "clients record revision"
  on public.deal_revision_requests for insert to anon
  with check (public.deal_is_open(deal_id));

create policy "reps read own revisions"
  on public.deal_revision_requests for select to authenticated
  using (public.owns_deal(deal_id));

create policy "reps update own revisions"
  on public.deal_revision_requests for update to authenticated
  using (public.owns_deal(deal_id))
  with check (public.owns_deal(deal_id));

create trigger deal_revision_requests_touch_updated_at
  before update on public.deal_revision_requests
  for each row execute function public.touch_updated_at();

create index deal_revision_requests_deal_id_idx
  on public.deal_revision_requests (deal_id, created_at desc);

create or replace function public.request_revision(
  _deal_id uuid,
  _amount numeric,
  _frequency text,
  _payment numeric,
  _payback numeric,
  _note text default null
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _id uuid;
begin
  if _frequency not in ('daily','weekly') then
    raise exception 'invalid frequency';
  end if;

  if not exists (
    select 1 from public.deals d
    where d.id = _deal_id
      and d.expiration_date >= current_date
      and _amount >= d.min_funded
      and _amount <= d.max_funded
  ) then
    raise exception 'this offer is not available for revision';
  end if;

  update public.deal_revision_requests
    set status = 'superseded'
  where deal_id = _deal_id and status = 'open';

  insert into public.deal_revision_requests
    (deal_id, requested_amount, frequency, computed_payment, computed_payback, note)
  values (_deal_id, _amount, _frequency, _payment, _payback, nullif(btrim(coalesce(_note,'')), ''))
  returning id into _id;

  update public.deals set status = 'revision_requested' where id = _deal_id;

  return _id;
end;
$$;

revoke execute on function public.request_revision(uuid, numeric, text, numeric, numeric, text) from public;
grant execute on function public.request_revision(uuid, numeric, text, numeric, numeric, text) to anon, authenticated, service_role;