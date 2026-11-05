create table public.lounge_directory_leads (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  category text not null,
  country text not null default 'Tanzania',
  city text,
  area text,
  business_name text,
  source_name text,
  source_url text,
  published_price_evidence text,
  status text not null default 'awaiting_source'
    check (status in ('awaiting_source', 'contacted', 'verified', 'rejected')),
  linked_business_id uuid references public.businesses (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status <> 'verified'
    or (
      business_name is not null
      and source_url is not null
      and linked_business_id is not null
    )
  )
);

create index lounge_directory_leads_status_idx
  on public.lounge_directory_leads (status, category, reference_code);

alter table public.lounge_directory_leads enable row level security;

create policy "Authorized staff can read Lounge directory leads"
  on public.lounge_directory_leads for select to authenticated
  using (public.has_permission('partners.view'));

grant select on public.lounge_directory_leads to authenticated;

insert into public.lounge_directory_leads (reference_code, category)
select
  'FF-LNG-' || lpad(slot::text, 3, '0'),
  categories.category
from generate_series(1, 110) as series(slot)
cross join lateral (
  select case ((slot - 1) / 10)
    when 0 then 'Hair salon'
    when 1 then 'Barbershop'
    when 2 then 'Nail studio'
    when 3 then 'Spa and wellness'
    when 4 then 'Makeup artist'
    when 5 then 'Fashion boutique'
    when 6 then 'Tailor and alterations'
    when 7 then 'Fashion designer'
    when 8 then 'Beauty studio'
    when 9 then 'Photographer'
    else 'Fashion event and venue'
  end as category
) categories;
