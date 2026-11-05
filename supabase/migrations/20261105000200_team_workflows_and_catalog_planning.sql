create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.access_roles (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete restrict,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, name)
);

alter table public.user_roles
  add column department_id uuid references public.departments (id) on delete set null,
  add column access_role_id uuid references public.access_roles (id) on delete set null;

alter table public.products
  add column stock_target integer not null default 0 check (stock_target >= 0),
  add column price_confirmed boolean not null default false;

alter table public.business_services
  add column price_confirmed boolean not null default false;

alter table public.stores
  add column approval_status public.product_review_status not null default 'pending',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null;

alter table public.businesses
  add column approval_status public.product_review_status not null default 'pending',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null;

alter table public.brands
  add column approval_status public.product_review_status not null default 'pending',
  add column verification_reference text,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null;

create index user_roles_department_idx on public.user_roles (department_id);
create index user_roles_access_role_idx on public.user_roles (access_role_id);
create index products_price_confirmed_idx on public.products (price_confirmed, approval_status);
create index stores_approval_status_idx on public.stores (approval_status, created_at desc);
create index businesses_approval_status_idx on public.businesses (approval_status, created_at desc);
create index brands_approval_status_idx on public.brands (approval_status, created_at desc);

update public.stores
set approval_status = case
      when is_active
        and exists (
          select 1 from public.vendors vendor
          where vendor.id = stores.vendor_id
            and vendor.is_active
            and vendor.partner_status = 'approved'
        )
        and pg_catalog.btrim(coalesce(cover_url, '')) ~* '^https?://'
      then 'published'::public.product_review_status
      else 'pending'::public.product_review_status
    end,
    is_active = is_active
where approval_status = 'pending';

create or replace function public.queue_product_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.store_id, new.brand_id, new.title, new.description, new.price_minor,
    new.original_price_minor, new.currency, new.images, new.sizes, new.colors,
    new.category, new.listing_type, new.catalog_key, new.material, new.fit,
    new.care, new.origin, new.shipping, new.returns, new.authenticity, new.season,
    new.price_confirmed
  ) is distinct from row(
    old.store_id, old.brand_id, old.title, old.description, old.price_minor,
    old.original_price_minor, old.currency, old.images, old.sizes, old.colors,
    old.category, old.listing_type, old.catalog_key, old.material, old.fit,
    old.care, old.origin, old.shipping, old.returns, old.authenticity, old.season,
    old.price_confirmed
  ) then
    new.approval_status := 'pending';
    new.is_active := false;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.queue_service_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.business_id, new.name, new.description, new.price_minor,
    new.currency, new.duration_min, new.price_confirmed
  ) is distinct from row(
    old.business_id, old.name, old.description, old.price_minor,
    old.currency, old.duration_min, old.price_confirmed
  ) then
    new.approval_status := 'pending';
    new.is_active := false;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.queue_store_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(new.vendor_id, new.name, new.description, new.city, new.country, new.address, new.cover_url)
    is distinct from
    row(old.vendor_id, old.name, old.description, old.city, old.country, old.address, old.cover_url)
  then
    new.approval_status := 'pending';
    new.is_active := false;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.queue_business_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.vendor_id, new.name, new.category, new.city,
    new.area, new.address, new.cover_url, new.description
  ) is distinct from row(
    old.vendor_id, old.name, old.category, old.city,
    old.area, old.address, old.cover_url, old.description
  ) then
    new.approval_status := 'pending';
    new.is_active := false;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.queue_brand_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(new.vendor_id, new.name, new.logo_url)
    is distinct from
    row(old.vendor_id, old.name, old.logo_url)
  then
    new.approval_status := 'pending';
    new.partnership_status := 'unaffiliated';
    new.is_active := false;
    new.verification_reference := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

create trigger stores_queue_review
  before update on public.stores
  for each row execute function public.queue_store_review();
create trigger businesses_queue_review
  before update on public.businesses
  for each row execute function public.queue_business_review();
create trigger brands_queue_review
  before update on public.brands
  for each row execute function public.queue_brand_review();

insert into public.departments (name, slug)
values
  ('Platform administration', 'platform-administration'),
  ('Catalog and merchandising', 'catalog-and-merchandising'),
  ('Marketing', 'marketing'),
  ('Store operations', 'store-operations'),
  ('Service operations', 'service-operations'),
  ('Finance', 'finance'),
  ('Customer support', 'customer-support')
on conflict (slug) do nothing;

insert into public.access_roles (department_id, name, slug, permissions)
select department.id, template.name, template.slug, template.permissions
from (
  values
    ('Catalog and merchandising', 'Catalog reviewer', 'catalog-reviewer', array['dashboard.view', 'catalog.view', 'catalog.approve']::text[]),
    ('Marketing', 'Marketing coordinator', 'marketing-coordinator', array['dashboard.view', 'catalog.view', 'partners.view']::text[]),
    ('Store operations', 'Store manager', 'store-manager', array['dashboard.view', 'orders.view', 'orders.manage', 'catalog.view', 'catalog.manage']::text[]),
    ('Service operations', 'Service coordinator', 'service-coordinator', array['dashboard.view', 'bookings.view', 'bookings.manage', 'catalog.view', 'catalog.approve']::text[]),
    ('Finance', 'Finance analyst', 'finance-analyst', array['dashboard.view', 'orders.view', 'bookings.view', 'finance.view']::text[]),
    ('Customer support', 'Customer care', 'customer-care', array['dashboard.view', 'orders.view', 'orders.manage', 'bookings.view', 'bookings.manage']::text[])
) as template(department_name, name, slug, permissions)
join public.departments department on department.name = template.department_name
on conflict (slug) do nothing;

create or replace function public.has_role(allowed_roles public.platform_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles role_row
    where role_row.user_id = (select auth.uid())
      and role_row.is_active
      and role_row.role = any(allowed_roles)
  );
$$;

create or replace function public.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles role_row
    where role_row.user_id = (select auth.uid())
      and role_row.is_active
      and (
        role_row.role not in ('supplier', 'provider')
        or exists (
          select 1 from public.vendors vendor
          where vendor.id = role_row.vendor_id and vendor.is_active
        )
      )
      and case
        when role_row.access_role_id is not null then exists (
          select 1
          from public.access_roles assigned_role
          join public.departments department on department.id = assigned_role.department_id
          where assigned_role.id = role_row.access_role_id
            and assigned_role.is_active
            and department.is_active
            and permission_key = any(assigned_role.permissions)
        )
        when role_row.role = 'super_admin' then true
        when role_row.role = 'admin' then permission_key in (
          'dashboard.view', 'orders.view', 'orders.manage', 'bookings.view',
          'bookings.manage', 'catalog.view', 'catalog.manage', 'catalog.approve',
          'partners.view', 'partners.manage', 'team.view', 'team.manage',
          'roles.view', 'roles.edit', 'finance.view'
        )
        when role_row.role = 'finance' then permission_key in (
          'dashboard.view', 'orders.view', 'bookings.view', 'finance.view', 'roles.view'
        )
        when role_row.role = 'support' then permission_key in (
          'dashboard.view', 'orders.view', 'orders.manage', 'bookings.view',
          'bookings.manage', 'catalog.view'
        )
        when role_row.role = 'supplier' then permission_key in (
          'dashboard.view', 'orders.view', 'orders.manage', 'catalog.view',
          'catalog.manage', 'finance.view'
        )
        when role_row.role = 'provider' then permission_key in (
          'dashboard.view', 'bookings.view', 'bookings.manage', 'catalog.view',
          'catalog.manage', 'finance.view'
        )
        else false
      end
  );
$$;

alter table public.departments enable row level security;
alter table public.access_roles enable row level security;

create policy "Authorized staff can read departments"
  on public.departments for select to authenticated
  using (public.has_permission('roles.view'));
create policy "Authorized staff can manage departments"
  on public.departments for all to authenticated
  using (public.has_permission('roles.edit'))
  with check (public.has_permission('roles.edit'));
create policy "Authorized staff can read access roles"
  on public.access_roles for select to authenticated
  using (public.has_permission('roles.view'));
create policy "Authorized staff can manage access roles"
  on public.access_roles for all to authenticated
  using (public.has_permission('roles.edit'))
  with check (public.has_permission('roles.edit'));

create or replace view public.admin_team_members as
select
  role_row.user_id,
  role_row.role,
  role_row.vendor_id,
  role_row.department_id,
  department.name as department_name,
  role_row.access_role_id,
  access_role.name as access_role_name,
  role_row.is_active,
  role_row.created_at,
  profile.display_name,
  profile.email
from public.user_roles role_row
left join public.profiles profile on profile.id = role_row.user_id
left join public.departments department on department.id = role_row.department_id
left join public.access_roles access_role on access_role.id = role_row.access_role_id
where public.has_permission('team.view')
  and public.has_role(array['super_admin', 'admin']::public.platform_role[]);

create or replace view public.admin_stores as
select
  store.id,
  store.vendor_id,
  vendor.name as vendor_name,
  store.name,
  store.city,
  store.country,
  store.cover_url,
  store.is_active,
  store.approval_status,
  store.created_at,
  store.reviewed_at
from public.stores store
join public.vendors vendor on vendor.id = store.vendor_id
where public.has_permission('partners.view')
  and (
    public.has_role(array['super_admin', 'admin']::public.platform_role[])
    or public.owns_vendor(store.vendor_id)
  );

create or replace view public.admin_businesses as
select
  business.id,
  business.vendor_id,
  vendor.name as vendor_name,
  business.name,
  business.category,
  business.city,
  business.area,
  business.cover_url,
  business.is_active,
  business.approval_status,
  business.created_at,
  business.reviewed_at
from public.businesses business
join public.vendors vendor on vendor.id = business.vendor_id
where public.has_permission('partners.view')
  and (
    public.has_role(array['super_admin', 'admin']::public.platform_role[])
    or public.owns_vendor(business.vendor_id)
  );

create or replace view public.admin_brands as
select
  brand.id,
  brand.name,
  brand.logo_url,
  brand.partnership_status,
  brand.approval_status,
  brand.verification_reference,
  brand.is_active,
  brand.created_at,
  brand.reviewed_at
from public.brands brand
where public.has_permission('partners.view')
  and (
    public.has_role(array['super_admin', 'admin']::public.platform_role[])
    or (brand.vendor_id is not null and public.owns_vendor(brand.vendor_id))
  );

create or replace function public.save_department(
  target_department_id uuid,
  department_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  normalized_slug text;
begin
  if not public.has_permission('roles.edit')
    or not public.has_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'You do not have permission to manage departments.' using errcode = '42501';
  end if;

  if pg_catalog.btrim(coalesce(department_name, '')) = '' then
    raise exception 'Enter a department name.' using errcode = '22023';
  end if;

  normalized_slug := pg_catalog.btrim(pg_catalog.regexp_replace(
    pg_catalog.lower(pg_catalog.btrim(department_name)), '[^a-z0-9]+', '-', 'g'
  ), '-');
  if normalized_slug = '' then
    raise exception 'Enter a department name containing letters or numbers.' using errcode = '22023';
  end if;

  if target_department_id is null then
    insert into public.departments (name, slug)
    values (pg_catalog.btrim(department_name), normalized_slug)
    returning id into saved_id;
  else
    update public.departments
    set name = pg_catalog.btrim(department_name),
        slug = normalized_slug,
        updated_at = now()
    where id = target_department_id
    returning id into saved_id;
    if saved_id is null then
      raise exception 'This department could not be found.' using errcode = 'P0002';
    end if;
  end if;
  return saved_id;
end;
$$;

create or replace function public.save_access_role(
  target_access_role_id uuid,
  target_department_id uuid,
  access_role_name text,
  selected_permissions text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  normalized_slug text;
  allowed_permissions constant text[] := array[
    'dashboard.view', 'orders.view', 'orders.manage', 'bookings.view',
    'bookings.manage', 'catalog.view', 'catalog.manage', 'catalog.approve',
    'partners.view', 'roles.view', 'finance.view'
  ];
begin
  if not public.has_permission('roles.edit')
    or not public.has_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'You do not have permission to manage access roles.' using errcode = '42501';
  end if;

  if pg_catalog.btrim(coalesce(access_role_name, '')) = ''
    or target_department_id is null
    or not exists (select 1 from public.departments where id = target_department_id and is_active) then
    raise exception 'Choose an active department and enter a role name.' using errcode = '22023';
  end if;

  if not (coalesce(selected_permissions, '{}') <@ allowed_permissions) then
    raise exception 'Choose only supported permissions. Role management stays limited to platform administrators.' using errcode = '22023';
  end if;

  normalized_slug := pg_catalog.btrim(pg_catalog.regexp_replace(
    pg_catalog.lower(pg_catalog.btrim(access_role_name)), '[^a-z0-9]+', '-', 'g'
  ), '-');
  if normalized_slug = '' then
    raise exception 'Enter a role name containing letters or numbers.' using errcode = '22023';
  end if;

  if target_access_role_id is null then
    insert into public.access_roles (department_id, name, slug, permissions)
    values (
      target_department_id,
      pg_catalog.btrim(access_role_name),
      normalized_slug,
      coalesce(selected_permissions, '{}')
    )
    returning id into saved_id;
  else
    update public.access_roles
    set department_id = target_department_id,
        name = pg_catalog.btrim(access_role_name),
        slug = normalized_slug,
        permissions = coalesce(selected_permissions, '{}'),
        updated_at = now()
    where id = target_access_role_id
    returning id into saved_id;
    if saved_id is null then
      raise exception 'This access role could not be found.' using errcode = 'P0002';
    end if;
  end if;
  return saved_id;
end;
$$;

create or replace function public.assign_team_access(
  target_user_id uuid,
  target_role public.platform_role,
  target_department_id uuid default null,
  target_access_role_id uuid default null,
  target_vendor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role public.platform_role;
  existing_role public.platform_role;
  access_department_id uuid;
begin
  if not public.has_permission('team.manage')
    or not public.has_permission('roles.edit')
    or not public.has_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'You do not have permission to manage team access.' using errcode = '42501';
  end if;

  select role_row.role into caller_role
  from public.user_roles role_row
  where role_row.user_id = (select auth.uid())
    and role_row.is_active
    and role_row.access_role_id is null
    and role_row.role in ('super_admin', 'admin');

  if caller_role is null or target_user_id = (select auth.uid()) then
    raise exception 'You cannot change your own access.' using errcode = '42501';
  end if;

  select role_row.role into existing_role
  from public.user_roles role_row
  where role_row.user_id = target_user_id
  for update;

  if existing_role = 'super_admin' and caller_role <> 'super_admin' then
    raise exception 'Only an Owner can change an Owner account.' using errcode = '42501';
  end if;
  if target_role = 'super_admin' and caller_role <> 'super_admin' then
    raise exception 'Only an Owner can assign the Owner role.' using errcode = '42501';
  end if;

  if target_department_id is not null and not exists (
    select 1 from public.departments where id = target_department_id and is_active
  ) then
    raise exception 'Choose an active department.' using errcode = '22023';
  end if;

  if target_access_role_id is not null then
    select assigned_role.department_id into access_department_id
    from public.access_roles assigned_role
    where assigned_role.id = target_access_role_id
      and assigned_role.is_active;
    if access_department_id is null then
      raise exception 'Choose an active access role.' using errcode = '22023';
    end if;
    if target_department_id is not null and access_department_id <> target_department_id then
      raise exception 'The selected role must belong to the selected department.' using errcode = '22023';
    end if;
    target_department_id := access_department_id;
    target_role := 'support';
    target_vendor_id := null;
  end if;

  if target_role in ('supplier', 'provider') then
    if target_vendor_id is null or not exists (
      select 1 from public.vendors vendor
      where vendor.id = target_vendor_id
        and vendor.is_active
        and vendor.vendor_type = target_role::text
    ) then
      raise exception 'Choose an active business matching the selected partner role.' using errcode = '22023';
    end if;
  elsif target_vendor_id is not null then
    raise exception 'This role cannot be linked to a supplier or provider business.' using errcode = '22023';
  end if;

  insert into public.user_roles (
    user_id, role, vendor_id, is_active, department_id, access_role_id
  )
  values (
    target_user_id, target_role, target_vendor_id, true,
    target_department_id, target_access_role_id
  )
  on conflict (user_id) do update
  set role = excluded.role,
      vendor_id = excluded.vendor_id,
      is_active = true,
      department_id = excluded.department_id,
      access_role_id = excluded.access_role_id;
end;
$$;

create or replace function public.review_store(
  target_store_id uuid,
  decision public.product_review_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_store public.stores%rowtype;
begin
  if not public.has_permission('partners.manage')
    or not public.has_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'You do not have permission to review stores.' using errcode = '42501';
  end if;
  if decision not in ('published', 'rejected') then
    raise exception 'Choose approve or decline for this store.' using errcode = '22023';
  end if;

  select * into selected_store
  from public.stores
  where id = target_store_id
  for update;
  if not found then
    raise exception 'This store could not be found.' using errcode = 'P0002';
  end if;
  if decision = 'published' and (
    pg_catalog.btrim(selected_store.name) = ''
    or pg_catalog.btrim(selected_store.city) = ''
    or pg_catalog.btrim(selected_store.country) = ''
    or pg_catalog.btrim(coalesce(selected_store.cover_url, '')) !~* '^https?://'
    or not exists (
      select 1 from public.vendors vendor
      where vendor.id = selected_store.vendor_id
        and vendor.is_active
        and vendor.partner_status = 'approved'
    )
  ) then
    raise exception 'A verified store photo, location, and approved partner account are required.' using errcode = '22023';
  end if;

  update public.stores
  set approval_status = decision,
      is_active = decision = 'published',
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = target_store_id;
end;
$$;

create or replace function public.review_business(
  target_business_id uuid,
  decision public.product_review_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_business public.businesses%rowtype;
begin
  if not public.has_permission('partners.manage')
    or not public.has_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'You do not have permission to review service providers.' using errcode = '42501';
  end if;
  if decision not in ('published', 'rejected') then
    raise exception 'Choose approve or decline for this service provider.' using errcode = '22023';
  end if;

  select * into selected_business
  from public.businesses
  where id = target_business_id
  for update;
  if not found then
    raise exception 'This service provider could not be found.' using errcode = 'P0002';
  end if;
  if decision = 'published' and (
    pg_catalog.btrim(selected_business.name) = ''
    or pg_catalog.btrim(selected_business.category) = ''
    or pg_catalog.btrim(selected_business.city) = ''
    or pg_catalog.btrim(selected_business.area) = ''
    or pg_catalog.btrim(coalesce(selected_business.cover_url, '')) !~* '^https?://'
    or not exists (
      select 1 from public.vendors vendor
      where vendor.id = selected_business.vendor_id
        and vendor.is_active
        and vendor.partner_status = 'approved'
    )
  ) then
    raise exception 'A verified provider photo, location, and approved partner account are required.' using errcode = '22023';
  end if;

  update public.businesses
  set approval_status = decision,
      is_active = decision = 'published',
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = target_business_id;
end;
$$;

create or replace function public.review_brand(
  target_brand_id uuid,
  decision public.product_review_status,
  evidence_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_brand public.brands%rowtype;
begin
  if not public.has_permission('partners.manage')
    or not public.has_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'You do not have permission to review brands.' using errcode = '42501';
  end if;
  if decision not in ('published', 'rejected') then
    raise exception 'Choose verify or decline for this brand.' using errcode = '22023';
  end if;

  select * into selected_brand
  from public.brands
  where id = target_brand_id
  for update;
  if not found then
    raise exception 'This brand could not be found.' using errcode = 'P0002';
  end if;
  if decision = 'published' and pg_catalog.btrim(coalesce(evidence_reference, '')) !~* '^https?://' then
    raise exception 'Add a verifiable contract, authorization, or brand-owned source URL.' using errcode = '22023';
  end if;

  update public.brands
  set approval_status = decision,
      partnership_status = case when decision = 'published' then 'verified' else 'unaffiliated' end,
      verification_reference = case when decision = 'published' then pg_catalog.btrim(evidence_reference) else null end,
      is_active = decision = 'published',
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = target_brand_id;
end;
$$;

create or replace view public.product_cards with (security_invoker = true) as
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
    'tone', 'dark',
    'partnership_status', b.partnership_status::text,
    'is_local', b.vendor_id is not null
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
join public.brands b on b.id = p.brand_id and b.is_active and b.partnership_status = 'verified'
join public.stores s on s.id = p.store_id and s.is_active and s.approval_status = 'published'
join public.vendors vendor on vendor.id = p.vendor_id and vendor.is_active and vendor.partner_status = 'approved'
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
where p.is_active
  and p.approval_status = 'published'
  and p.price_confirmed;

drop policy if exists "Approved products at active stores are public" on public.products;
create policy "Approved verified products are public"
  on public.products for select to anon, authenticated
  using (
    is_active and approval_status = 'published' and price_confirmed
    and exists (
      select 1 from public.stores store
      where store.id = products.store_id
        and store.is_active
        and store.approval_status = 'published'
    )
    and exists (
      select 1 from public.brands brand
      where brand.id = products.brand_id
        and brand.is_active
        and brand.partnership_status = 'verified'
    )
    and exists (
      select 1 from public.vendors vendor
      where vendor.id = products.vendor_id
        and vendor.is_active
        and vendor.partner_status = 'approved'
    )
  );

drop policy if exists "Catalog staff can read products in their access scope" on public.products;
create policy "Authorized catalog managers can read products"
  on public.products for select to authenticated
  using (public.has_permission('catalog.view'));

drop policy if exists "Approved services at active businesses are public" on public.business_services;
create policy "Approved services from verified providers are public"
  on public.business_services for select to anon, authenticated
  using (
    is_active and approval_status = 'published' and price_confirmed
    and exists (
      select 1
      from public.businesses business
      join public.vendors vendor on vendor.id = business.vendor_id
      where business.id = business_services.business_id
        and business.is_active
        and business.approval_status = 'published'
        and vendor.is_active
        and vendor.partner_status = 'approved'
    )
    and pg_catalog.btrim(coalesce((
      select business.cover_url from public.businesses business
      where business.id = business_services.business_id
    ), '')) ~* '^https?://'
  );

drop policy if exists "Catalog staff can read services in their access scope" on public.business_services;
create policy "Authorized staff can read business services"
  on public.business_services for select to authenticated
  using (public.has_permission('catalog.view'));

create or replace view public.admin_products as
select
  product.id,
  product.vendor_id,
  product.store_id,
  product.brand_id,
  product.title,
  product.category,
  product.price_minor,
  product.original_price_minor,
  product.currency,
  product.images,
  product.sizes,
  product.is_active,
  brand.name as brand_name,
  store.name as store_name,
  coalesce(stock.total, 0)::integer as stock,
  product.description,
  product.approval_status,
  product.created_at,
  product.reviewed_at,
  product.stock_target,
  product.price_confirmed,
  brand.partnership_status::text as brand_partnership_status,
  brand.approval_status as brand_approval_status,
  brand.verification_reference,
  store.approval_status as store_approval_status,
  vendor.partner_status
from public.products product
join public.brands brand on brand.id = product.brand_id
join public.stores store on store.id = product.store_id
join public.vendors vendor on vendor.id = product.vendor_id
left join lateral (
  select sum((entry.value ->> 'stock')::integer) as total
  from jsonb_array_elements(product.sizes) entry(value)
) stock on true
where public.has_permission('catalog.view')
  and (
    public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
    or public.owns_vendor(product.vendor_id)
  );

create or replace view public.admin_services as
select
  service.id,
  business.vendor_id,
  service.business_id,
  business.name as business_name,
  business.category as business_category,
  business.cover_url,
  service.name,
  service.description,
  service.price_minor,
  service.currency,
  service.duration_min,
  service.is_active,
  service.approval_status,
  null::timestamptz as created_at,
  service.reviewed_at,
  service.price_confirmed,
  business.approval_status as business_approval_status,
  vendor.partner_status
from public.business_services service
join public.businesses business on business.id = service.business_id
join public.vendors vendor on vendor.id = business.vendor_id
where public.has_permission('catalog.view')
  and (
    public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
    or public.owns_vendor(business.vendor_id)
  );

grant select on public.departments, public.access_roles to authenticated;
grant select on public.admin_team_members, public.admin_stores, public.admin_businesses, public.admin_brands to authenticated;
grant select on public.admin_products, public.admin_services to authenticated;

revoke all on function public.has_role(public.platform_role[]) from public, anon, authenticated;
revoke all on function public.has_permission(text) from public, anon, authenticated;
revoke all on function public.save_department(uuid, text) from public, anon, authenticated;
revoke all on function public.save_access_role(uuid, uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.assign_team_access(uuid, public.platform_role, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.review_store(uuid, public.product_review_status) from public, anon, authenticated;
revoke all on function public.review_business(uuid, public.product_review_status) from public, anon, authenticated;
revoke all on function public.review_brand(uuid, public.product_review_status, text) from public, anon, authenticated;
grant execute on function public.has_role(public.platform_role[]) to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.save_department(uuid, text) to authenticated;
grant execute on function public.save_access_role(uuid, uuid, text, text[]) to authenticated;
grant execute on function public.assign_team_access(uuid, public.platform_role, uuid, uuid, uuid) to authenticated;
grant execute on function public.review_store(uuid, public.product_review_status) to authenticated;
grant execute on function public.review_business(uuid, public.product_review_status) to authenticated;
grant execute on function public.review_brand(uuid, public.product_review_status, text) to authenticated;

create or replace function public.review_product(
  target_product_id uuid,
  decision public.product_review_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_row public.products%rowtype;
begin
  if not public.has_permission('catalog.approve') then
    raise exception 'You do not have permission to review products.' using errcode = '42501';
  end if;
  if decision not in ('published', 'rejected') then
    raise exception 'Choose approve or decline for this product.' using errcode = '22023';
  end if;

  select * into product_row
  from public.products
  where id = target_product_id
  for update;
  if not found then
    raise exception 'This product could not be found.' using errcode = 'P0002';
  end if;

  if decision = 'published' and (
    pg_catalog.btrim(product_row.title) = ''
    or pg_catalog.btrim(product_row.description) = ''
    or pg_catalog.btrim(product_row.category) = ''
    or product_row.price_minor <= 0
    or not product_row.price_confirmed
    or not exists (
      select 1
      from pg_catalog.unnest(product_row.images) as image_entry(url)
      where pg_catalog.btrim(image_entry.url) ~* '^https?://'
    )
    or not exists (
      select 1 from public.stores store
      where store.id = product_row.store_id
        and store.is_active
        and store.approval_status = 'published'
    )
    or not exists (
      select 1 from public.brands brand
      where brand.id = product_row.brand_id
        and brand.is_active
        and brand.approval_status = 'published'
        and brand.partnership_status = 'verified'
        and pg_catalog.btrim(coalesce(brand.verification_reference, '')) ~* '^https?://'
    )
    or not exists (
      select 1 from public.vendors vendor
      where vendor.id = product_row.vendor_id
        and vendor.is_active
        and vendor.partner_status = 'approved'
    )
    or not exists (
      select 1
      from pg_catalog.jsonb_array_elements(product_row.sizes) entry(value)
      where (entry.value ->> 'stock')::integer > 0
    )
  ) then
    raise exception 'Confirm the price and stock, add a product photo, and verify the store, brand authorization, and supplier before approval.' using errcode = '22023';
  end if;

  update public.products
  set approval_status = decision,
      is_active = decision = 'published',
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = target_product_id;
end;
$$;

create or replace function public.review_business_service(
  target_service_id uuid,
  decision public.product_review_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  service_row public.business_services%rowtype;
  business_image text;
begin
  if not public.has_permission('catalog.approve') then
    raise exception 'You do not have permission to review services.' using errcode = '42501';
  end if;
  if decision not in ('published', 'rejected') then
    raise exception 'Choose approve or decline for this service.' using errcode = '22023';
  end if;

  select * into service_row
  from public.business_services
  where id = target_service_id
  for update;
  if not found then
    raise exception 'This service could not be found.' using errcode = 'P0002';
  end if;

  select business.cover_url into business_image
  from public.businesses business
  where business.id = service_row.business_id;

  if decision = 'published' and (
    pg_catalog.btrim(service_row.name) = ''
    or pg_catalog.btrim(service_row.description) = ''
    or service_row.price_minor <= 0
    or not service_row.price_confirmed
    or service_row.duration_min <= 0
    or pg_catalog.btrim(coalesce(business_image, '')) !~* '^https?://'
    or not exists (
      select 1
      from public.businesses business
      join public.vendors vendor on vendor.id = business.vendor_id
      where business.id = service_row.business_id
        and business.is_active
        and business.approval_status = 'published'
        and vendor.is_active
        and vendor.partner_status = 'approved'
    )
  ) then
    raise exception 'Confirm the service price, provider photo, location, and provider verification before approval.' using errcode = '22023';
  end if;

  update public.business_services
  set approval_status = decision,
      is_active = decision = 'published',
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = target_service_id;
end;
$$;

revoke all on function public.review_product(uuid, public.product_review_status) from public, anon, authenticated;
revoke all on function public.review_business_service(uuid, public.product_review_status) from public, anon, authenticated;
grant execute on function public.review_product(uuid, public.product_review_status) to authenticated;
grant execute on function public.review_business_service(uuid, public.product_review_status) to authenticated;
