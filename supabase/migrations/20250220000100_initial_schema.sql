create type public.partnership_status as enum ('unaffiliated', 'pending', 'verified');
create type public.listing_type as enum ('featured', 'other-brand');
create type public.product_review_status as enum ('pending', 'published', 'rejected');
create type public.service_slot_status as enum ('available', 'held', 'booked', 'cancelled');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  name text not null,
  verification_status public.partnership_status not null default 'pending',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors (id) on delete set null,
  name text not null unique,
  logo_url text,
  partnership_status public.partnership_status not null default 'unaffiliated',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  name text not null,
  description text not null default '',
  city text not null,
  country text not null default 'Tanzania',
  address text,
  cover_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.store_brands (
  store_id uuid not null references public.stores (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  primary key (store_id, brand_id)
);

create function public.valid_product_sizes(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.jsonb_typeof(value) = 'array'
    and not exists (
      select 1
      from pg_catalog.jsonb_array_elements(value) entry(item)
      where pg_catalog.jsonb_typeof(entry.item) <> 'object'
        or case
          when pg_catalog.jsonb_typeof(entry.item -> 'size') = 'string'
            and pg_catalog.jsonb_typeof(entry.item -> 'stock') = 'number'
          then
            (entry.item ->> 'stock')::numeric < 0
            or (entry.item ->> 'stock')::numeric > 2147483647
            or pg_catalog.trunc((entry.item ->> 'stock')::numeric) <> (entry.item ->> 'stock')::numeric
          else true
        end
    );
$$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete restrict,
  title text not null,
  description text not null default '',
  price_minor bigint not null check (price_minor >= 0),
  original_price_minor bigint check (original_price_minor is null or original_price_minor >= price_minor),
  currency text not null default 'TZS' check (currency ~ '^[A-Z]{3}$'),
  images text[] not null default '{}',
  sizes jsonb not null default '[]'::jsonb check (public.valid_product_sizes(sizes)),
  colors text[] not null default '{}',
  category text not null,
  listing_type public.listing_type not null default 'other-brand',
  catalog_key text,
  material text,
  fit text,
  care text,
  origin text,
  shipping text,
  returns text,
  authenticity text,
  season text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '',
  status public.product_review_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table public.store_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '',
  status public.product_review_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  name text not null,
  category text not null,
  city text not null,
  area text not null,
  address text,
  cover_url text,
  description text not null default '',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text not null default '',
  price_minor bigint not null check (price_minor >= 0),
  currency text not null default 'TZS' check (currency ~ '^[A-Z]{3}$'),
  duration_min integer not null check (duration_min > 0),
  is_active boolean not null default false
);

create table public.business_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '',
  status public.product_review_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.stylists (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  role text not null,
  avatar_url text not null default '',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.stylist_reviews (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '',
  status public.product_review_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (stylist_id, user_id)
);

create table public.service_slots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid not null references public.business_services (id) on delete cascade,
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  starts_at timestamptz not null,
  duration_min integer not null check (duration_min > 0),
  price_minor bigint not null check (price_minor >= 0),
  currency text not null default 'TZS' check (currency ~ '^[A-Z]{3}$'),
  status public.service_slot_status not null default 'available',
  booked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (stylist_id, starts_at)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete restrict,
  slot_id uuid not null unique references public.service_slots (id) on delete restrict,
  business_id uuid not null references public.businesses (id) on delete restrict,
  service_id uuid not null references public.business_services (id) on delete restrict,
  stylist_id uuid not null references public.stylists (id) on delete restrict,
  starts_at timestamptz not null,
  duration_min integer not null check (duration_min > 0),
  price_minor bigint not null check (price_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.booking_status not null default 'confirmed',
  customer_notes text not null default '',
  created_at timestamptz not null default now()
);

create index products_active_category_idx on public.products (category, created_at desc) where is_active;
create index products_catalog_key_idx on public.products (catalog_key) where catalog_key is not null;
create index service_slots_available_idx on public.service_slots (starts_at) where status = 'available';
create index bookings_customer_idx on public.bookings (customer_id, starts_at desc);

create view public.product_cards with (security_invoker = true) as
select
  p.id,
  p.vendor_id,
  p.title,
  p.price_minor,
  p.original_price_minor,
  p.currency,
  p.images,
  jsonb_build_object(
    'id', b.id,
    'label', b.name,
    'vendor_id', coalesce(b.vendor_id, p.vendor_id),
    'tone', 'dark'
  ) as brand_tag,
  case
    when coalesce(stock.total, 0) = 0 then 'out_of_stock'
    when stock.total <= 3 then 'low_stock'
    else 'in_stock'
  end as status,
  p.sizes,
  p.category,
  p.listing_type as marketplace_category,
  s.name as seller_name,
  coalesce(pr.rating, 0)::numeric(3, 1) as rating,
  coalesce(pr.review_count, 0)::integer as review_count,
  coalesce(sr.rating, 0)::numeric(3, 1) as seller_rating,
  coalesce(sr.review_count, 0)::integer as seller_review_count,
  0::integer as units_sold,
  p.catalog_key,
  p.colors,
  p.description,
  p.material,
  p.fit,
  p.care,
  p.origin,
  p.shipping,
  p.returns,
  p.authenticity,
  p.season
from public.products p
join public.brands b on b.id = p.brand_id and b.is_active
join public.stores s on s.id = p.store_id and s.is_active
left join lateral (
  select sum((entry.value ->> 'stock')::integer) as total
  from jsonb_array_elements(p.sizes) entry(value)
) stock on true
left join lateral (
  select avg(r.rating)::numeric as rating, count(*) as review_count
  from public.product_reviews r
  where r.product_id = p.id and r.status = 'published'
) pr on true
left join lateral (
  select avg(r.rating)::numeric as rating, count(*) as review_count
  from public.store_reviews r
  where r.store_id = s.id and r.status = 'published'
) sr on true
where p.is_active;

create view public.lounge_stylists with (security_invoker = true) as
select
  st.id,
  st.vendor_id,
  st.name,
  st.role,
  st.avatar_url,
  coalesce(reviews.rating, 0)::numeric(3, 1) as rating,
  coalesce(slots.items, '[]'::jsonb) as slots
from public.stylists st
left join lateral (
  select avg(r.rating)::numeric as rating
  from public.stylist_reviews r
  where r.stylist_id = st.id and r.status = 'published'
) reviews on true
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'id', slot.id,
    'starts_at', slot.starts_at,
    'duration_min', slot.duration_min,
    'price_minor', slot.price_minor,
    'currency', slot.currency,
    'status', case when slot.status = 'available' then 'available' else 'taken' end
  ) order by slot.starts_at) as items
  from public.service_slots slot
  where slot.stylist_id = st.id
    and slot.starts_at > now()
    and slot.status in ('available', 'held', 'booked')
) slots on true
where st.is_active;

create view public.fashion_buildings with (security_invoker = true) as
select
  b.id,
  b.name,
  b.category,
  b.city,
  b.area,
  coalesce(reviews.rating, 0)::numeric(3, 1) as rating,
  coalesce(reviews.review_count, 0)::integer as review_count,
  coalesce(b.cover_url, '') as cover_url,
  b.description,
  coalesce(services.items, '[]'::jsonb) as services
from public.businesses b
left join lateral (
  select avg(r.rating)::numeric as rating, count(*) as review_count
  from public.business_reviews r
  where r.business_id = b.id and r.status = 'published'
) reviews on true
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'id', service.id,
    'name', service.name,
    'price_minor', service.price_minor,
    'duration_min', service.duration_min
  ) order by service.price_minor) as items
  from public.business_services service
  where service.business_id = b.id and service.is_active
) services on true
where b.is_active;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.reserve_service_slot(p_slot_id uuid, p_customer_notes text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_slot public.service_slots%rowtype;
  booking_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to book a service.' using errcode = '42501';
  end if;

  select * into selected_slot
  from public.service_slots
  where id = p_slot_id
  for update;

  if not found or selected_slot.status <> 'available' or selected_slot.starts_at <= now() then
    raise exception 'This appointment slot is no longer available.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.businesses b
    join public.business_services service
      on service.id = selected_slot.service_id and service.business_id = b.id
    join public.stylists stylist
      on stylist.id = selected_slot.stylist_id and stylist.business_id = b.id
    where b.id = selected_slot.business_id
      and b.is_active and service.is_active and stylist.is_active
  ) then
    raise exception 'This service is not currently bookable.' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(selected_slot.stylist_id::text, 0)
  );

  if exists (
    select 1
    from public.service_slots other_slot
    where other_slot.stylist_id = selected_slot.stylist_id
      and other_slot.id <> selected_slot.id
      and other_slot.status = 'booked'
      and tstzrange(
        other_slot.starts_at,
        other_slot.starts_at + pg_catalog.make_interval(mins => other_slot.duration_min),
        '[)'
      ) && tstzrange(
        selected_slot.starts_at,
        selected_slot.starts_at + pg_catalog.make_interval(mins => selected_slot.duration_min),
        '[)'
      )
  ) then
    raise exception 'The provider already has an overlapping appointment.' using errcode = 'P0001';
  end if;

  insert into public.bookings (
    customer_id, slot_id, business_id, service_id, stylist_id,
    starts_at, duration_min, price_minor, currency, customer_notes
  ) values (
    auth.uid(), selected_slot.id, selected_slot.business_id, selected_slot.service_id,
    selected_slot.stylist_id, selected_slot.starts_at, selected_slot.duration_min,
    selected_slot.price_minor, selected_slot.currency, left(coalesce(p_customer_notes, ''), 1000)
  ) returning id into booking_id;

  update public.service_slots
  set status = 'booked', booked_by = auth.uid()
  where id = selected_slot.id;

  return booking_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.brands enable row level security;
alter table public.stores enable row level security;
alter table public.store_brands enable row level security;
alter table public.products enable row level security;
alter table public.product_reviews enable row level security;
alter table public.store_reviews enable row level security;
alter table public.businesses enable row level security;
alter table public.business_services enable row level security;
alter table public.business_reviews enable row level security;
alter table public.stylists enable row level security;
alter table public.stylist_reviews enable row level security;
alter table public.service_slots enable row level security;
alter table public.bookings enable row level security;

create policy "Profiles are private to their owner"
  on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Owners can update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Active vendors are public"
  on public.vendors for select to anon, authenticated using (is_active);
create policy "Vendor owners can read their vendor profiles"
  on public.vendors for select to authenticated using (owner_id = (select auth.uid()));
create policy "Vendor owners can create vendor profiles"
  on public.vendors for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Vendor owners can update their vendor profiles"
  on public.vendors for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "Active brands are public"
  on public.brands for select to anon, authenticated using (is_active);
create policy "Brand vendors can manage their brands"
  on public.brands for all to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.owner_id = (select auth.uid())))
  with check (vendor_id in (select v.id from public.vendors v where v.owner_id = (select auth.uid())));

create policy "Active stores are public"
  on public.stores for select to anon, authenticated using (is_active);
create policy "Store vendors can manage their stores"
  on public.stores for all to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.owner_id = (select auth.uid())))
  with check (vendor_id in (select v.id from public.vendors v where v.owner_id = (select auth.uid())));
create policy "Store brand links are public for active stores"
  on public.store_brands for select to anon, authenticated
  using (store_id in (select s.id from public.stores s where s.is_active));

create policy "Active products at active stores are public"
  on public.products for select to anon, authenticated
  using (
    is_active and store_id in (select s.id from public.stores s where s.is_active)
  );
create policy "Product vendors can manage their products"
  on public.products for all to authenticated
  using (
    vendor_id in (select v.id from public.vendors v where v.owner_id = (select auth.uid()))
    and store_id in (select s.id from public.stores s where s.vendor_id = products.vendor_id)
  )
  with check (
    vendor_id in (select v.id from public.vendors v where v.owner_id = (select auth.uid()))
    and store_id in (select s.id from public.stores s where s.vendor_id = products.vendor_id)
    and (
      listing_type = 'other-brand'
      or exists (
        select 1 from public.brands b
        where b.id = products.brand_id
          and b.is_active
          and b.partnership_status = 'verified'
      )
    )
  );

create policy "Published product reviews are public"
  on public.product_reviews for select to anon, authenticated using (status = 'published');
create policy "Users can create their own product reviews"
  on public.product_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy "Users can update their own pending product reviews"
  on public.product_reviews for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()) and status = 'pending');

create policy "Published store reviews are public"
  on public.store_reviews for select to anon, authenticated using (status = 'published');
create policy "Users can create their own store reviews"
  on public.store_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

create policy "Active fashion businesses are public"
  on public.businesses for select to anon, authenticated using (is_active);
create policy "Business vendors can manage their businesses"
  on public.businesses for all to authenticated
  using (vendor_id in (select v.id from public.vendors v where v.owner_id = (select auth.uid())))
  with check (vendor_id in (select v.id from public.vendors v where v.owner_id = (select auth.uid())));

create policy "Services at active businesses are public"
  on public.business_services for select to anon, authenticated
  using (
    is_active and business_id in (select b.id from public.businesses b where b.is_active)
  );
create policy "Business vendors can manage their services"
  on public.business_services for all to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      join public.vendors v on v.id = b.vendor_id
      where v.owner_id = (select auth.uid())
    )
  )
  with check (
    business_id in (
      select b.id from public.businesses b
      join public.vendors v on v.id = b.vendor_id
      where v.owner_id = (select auth.uid())
    )
  );

create policy "Published business reviews are public"
  on public.business_reviews for select to anon, authenticated using (status = 'published');
create policy "Users can create their own business reviews"
  on public.business_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

create policy "Active stylists are public"
  on public.stylists for select to anon, authenticated using (is_active);
create policy "Stylist vendors can manage their stylists"
  on public.stylists for all to authenticated
  using (
    vendor_id in (select v.id from public.vendors v where v.owner_id = (select auth.uid()))
    and business_id in (select b.id from public.businesses b where b.vendor_id = stylists.vendor_id)
  )
  with check (
    vendor_id in (select v.id from public.vendors v where v.owner_id = (select auth.uid()))
    and business_id in (select b.id from public.businesses b where b.vendor_id = stylists.vendor_id)
  );

create policy "Published stylist reviews are public"
  on public.stylist_reviews for select to anon, authenticated using (status = 'published');
create policy "Users can create their own stylist reviews"
  on public.stylist_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

create policy "Available future slots are public"
  on public.service_slots for select to anon, authenticated
  using (
    status = 'available'
    and starts_at > now()
    and exists (
      select 1 from public.businesses b
      where b.id = service_slots.business_id and b.is_active
    )
    and exists (
      select 1 from public.business_services service
      where service.id = service_slots.service_id
        and service.business_id = service_slots.business_id and service.is_active
    )
    and exists (
      select 1 from public.stylists stylist
      where stylist.id = service_slots.stylist_id
        and stylist.business_id = service_slots.business_id and stylist.is_active
    )
  );
create policy "Customers can see their booked slots"
  on public.service_slots for select to authenticated using (booked_by = (select auth.uid()));
create policy "Business vendors can manage appointment slots"
  on public.service_slots for all to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      join public.vendors v on v.id = b.vendor_id
      where v.owner_id = (select auth.uid())
    )
  )
  with check (
    business_id in (
      select b.id from public.businesses b
      join public.vendors v on v.id = b.vendor_id
      where v.owner_id = (select auth.uid())
    )
    and service_id in (
      select service.id from public.business_services service
      where service.business_id = service_slots.business_id
    )
    and stylist_id in (
      select stylist.id from public.stylists stylist
      where stylist.business_id = service_slots.business_id
    )
    and service_id in (
      select service.id from public.business_services service
      where service.id = service_slots.service_id
        and service.business_id = service_slots.business_id
    )
    and stylist_id in (
      select stylist.id from public.stylists stylist
      join public.vendors v on v.id = stylist.vendor_id
      where stylist.id = service_slots.stylist_id
        and stylist.business_id = service_slots.business_id
        and v.owner_id = (select auth.uid())
    )
  );

create policy "Customers can view their own bookings"
  on public.bookings for select to authenticated using (customer_id = (select auth.uid()));
create policy "Business vendors can view their bookings"
  on public.bookings for select to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      join public.vendors v on v.id = b.vendor_id
      where v.owner_id = (select auth.uid())
    )
  );

grant usage on schema public to anon, authenticated;
grant select on public.product_cards, public.lounge_stylists, public.fashion_buildings to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.vendors, public.brands, public.stores, public.products,
  public.product_reviews, public.store_reviews, public.businesses, public.business_services,
  public.business_reviews, public.stylists, public.stylist_reviews, public.service_slots to anon, authenticated;
grant insert (owner_id, name) on public.vendors to authenticated;
grant update (name) on public.vendors to authenticated;
grant insert (vendor_id, name, logo_url) on public.brands to authenticated;
grant update (name, logo_url) on public.brands to authenticated;
grant insert (vendor_id, name, description, city, country, address, cover_url) on public.stores to authenticated;
grant update (name, description, city, country, address, cover_url) on public.stores to authenticated;
grant insert (vendor_id, store_id, brand_id, title, description, price_minor, original_price_minor,
  currency, images, sizes, colors, category, listing_type, catalog_key, material, fit, care,
  origin, shipping, returns, authenticity, season) on public.products to authenticated;
grant update (store_id, brand_id, title, description, price_minor, original_price_minor,
  currency, images, sizes, colors, category, listing_type, catalog_key, material, fit, care,
  origin, shipping, returns, authenticity, season) on public.products to authenticated;
grant insert (product_id, user_id, rating, body) on public.product_reviews to authenticated;
grant update (rating, body) on public.product_reviews to authenticated;
grant insert (store_id, user_id, rating, body) on public.store_reviews to authenticated;
grant insert (vendor_id, name, category, city, area, address, cover_url, description)
  on public.businesses to authenticated;
grant update (name, category, city, area, address, cover_url, description)
  on public.businesses to authenticated;
grant insert (business_id, name, description, price_minor, currency, duration_min)
  on public.business_services to authenticated;
grant update (name, description, price_minor, currency, duration_min)
  on public.business_services to authenticated;
grant insert (business_id, user_id, rating, body) on public.business_reviews to authenticated;
grant insert (stylist_id, user_id, rating, body) on public.stylist_reviews to authenticated;
grant insert (vendor_id, business_id, name, role, avatar_url) on public.stylists to authenticated;
grant update (business_id, name, role, avatar_url) on public.stylists to authenticated;
grant insert (business_id, service_id, stylist_id, starts_at, duration_min, price_minor, currency)
  on public.service_slots to authenticated;
grant update (starts_at, duration_min, price_minor, currency)
  on public.service_slots to authenticated;
grant select on public.store_brands to anon, authenticated;
grant select on public.bookings to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.valid_product_sizes(jsonb) from public, anon, authenticated;
revoke all on function public.reserve_service_slot(uuid, text) from public, anon, authenticated;
grant execute on function public.valid_product_sizes(jsonb) to authenticated;
grant execute on function public.reserve_service_slot(uuid, text) to authenticated;
