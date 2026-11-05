alter table public.products
  add column approval_status public.product_review_status not null default 'pending',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null;

update public.products
set approval_status = 'published'
where is_active;

alter table public.business_services
  add column approval_status public.product_review_status not null default 'pending',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null;

update public.business_services
set approval_status = 'published'
where is_active;

create index products_approval_status_idx
  on public.products (approval_status, created_at desc);
create index business_services_approval_status_idx
  on public.business_services (approval_status, business_id);

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
      and case role_row.role
        when 'super_admin' then true
        when 'admin' then permission_key in (
          'dashboard.view', 'orders.view', 'orders.manage', 'bookings.view',
          'bookings.manage', 'catalog.view', 'catalog.manage', 'catalog.approve',
          'partners.view', 'partners.manage', 'team.view', 'team.manage',
          'roles.view', 'finance.view'
        )
        when 'finance' then permission_key in (
          'dashboard.view', 'orders.view', 'bookings.view', 'finance.view', 'roles.view'
        )
        when 'support' then permission_key in (
          'dashboard.view', 'orders.view', 'orders.manage', 'bookings.view',
          'bookings.manage', 'catalog.view'
        )
        when 'supplier' then permission_key in (
          'dashboard.view', 'orders.view', 'orders.manage', 'catalog.view',
          'catalog.manage', 'finance.view'
        )
        when 'provider' then permission_key in (
          'dashboard.view', 'bookings.view', 'bookings.manage', 'catalog.view',
          'catalog.manage', 'finance.view'
        )
        else false
      end
  );
$$;

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
    new.care, new.origin, new.shipping, new.returns, new.authenticity, new.season
  ) is distinct from row(
    old.store_id, old.brand_id, old.title, old.description, old.price_minor,
    old.original_price_minor, old.currency, old.images, old.sizes, old.colors,
    old.category, old.listing_type, old.catalog_key, old.material, old.fit,
    old.care, old.origin, old.shipping, old.returns, old.authenticity, old.season
  ) then
    new.approval_status := 'pending';
    new.is_active := false;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

create trigger products_queue_review
  before update on public.products
  for each row execute function public.queue_product_review();

create or replace function public.queue_service_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(new.business_id, new.name, new.description, new.price_minor, new.currency, new.duration_min)
    is distinct from
    row(old.business_id, old.name, old.description, old.price_minor, old.currency, old.duration_min)
  then
    new.approval_status := 'pending';
    new.is_active := false;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

create trigger business_services_queue_review
  before update on public.business_services
  for each row execute function public.queue_service_review();

drop policy if exists "Active products at active stores are public" on public.products;
create policy "Approved products at active stores are public"
  on public.products for select to anon, authenticated
  using (
    is_active and approval_status = 'published'
    and store_id in (select s.id from public.stores s where s.is_active)
  );

drop policy if exists "Services at active businesses are public" on public.business_services;
create policy "Approved services at active businesses are public"
  on public.business_services for select to anon, authenticated
  using (
    is_active and approval_status = 'published'
    and business_id in (select b.id from public.businesses b where b.is_active)
  );

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
  product.reviewed_at
from public.products product
join public.brands brand on brand.id = product.brand_id
join public.stores store on store.id = product.store_id
left join lateral (
  select sum((entry.value ->> 'stock')::integer) as total
  from jsonb_array_elements(product.sizes) entry(value)
) stock on true
where public.has_permission('catalog.view')
  and (
    public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
    or public.owns_vendor(product.vendor_id)
  );

create view public.admin_services as
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
  service.created_at,
  service.reviewed_at
from public.business_services service
join public.businesses business on business.id = service.business_id
where public.has_permission('catalog.view')
  and (
    public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
    or public.owns_vendor(business.vendor_id)
  );

create function public.review_product(
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
    raise exception 'Choose approve or reject for this product.' using errcode = '22023';
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
    or pg_catalog.cardinality(product_row.images) = 0
    or not exists (
      select 1
      from pg_catalog.jsonb_array_elements(product_row.sizes) entry(value)
      where (entry.value ->> 'stock')::integer > 0
    )
  ) then
    raise exception 'Add a product description, category, price, photo, and available stock before approval.' using errcode = '22023';
  end if;

  update public.products
  set approval_status = decision,
      is_active = decision = 'published',
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = target_product_id;
end;
$$;

create function public.review_business_service(
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
    raise exception 'Choose approve or reject for this service.' using errcode = '22023';
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
    or service_row.duration_min <= 0
    or pg_catalog.coalesce(business_image, '') = ''
  ) then
    raise exception 'Add a clear description, price, duration, and business photo before approval.' using errcode = '22023';
  end if;

  update public.business_services
  set approval_status = decision,
      is_active = decision = 'published',
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = target_service_id;
end;
$$;

grant select on public.admin_products, public.admin_services to authenticated;

revoke all on function public.queue_product_review() from public, anon, authenticated;
revoke all on function public.queue_service_review() from public, anon, authenticated;
revoke all on function public.review_product(uuid, public.product_review_status) from public, anon, authenticated;
revoke all on function public.review_business_service(uuid, public.product_review_status) from public, anon, authenticated;
grant execute on function public.review_product(uuid, public.product_review_status) to authenticated;
grant execute on function public.review_business_service(uuid, public.product_review_status) to authenticated;
