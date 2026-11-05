alter table public.businesses
  add column source_url text;

create or replace function public.queue_business_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.vendor_id, new.name, new.category, new.city,
    new.area, new.address, new.cover_url, new.description, new.source_url
  ) is distinct from row(
    old.vendor_id, old.name, old.category, old.city,
    old.area, old.address, old.cover_url, old.description, old.source_url
  ) then
    new.approval_status := 'pending';
    new.is_active := false;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

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
  store.reviewed_at,
  store.address,
  store.description
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
  business.reviewed_at,
  business.address,
  business.description,
  business.source_url
from public.businesses business
join public.vendors vendor on vendor.id = business.vendor_id
where public.has_permission('partners.view')
  and (
    public.has_role(array['super_admin', 'admin']::public.platform_role[])
    or public.owns_vendor(business.vendor_id)
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
  product.reviewed_at,
  product.stock_target,
  product.price_confirmed,
  brand.partnership_status::text as brand_partnership_status,
  brand.approval_status as brand_approval_status,
  brand.verification_reference,
  store.approval_status as store_approval_status,
  vendor.partner_status,
  product.material,
  product.fit,
  product.care,
  product.origin,
  product.shipping,
  product.returns,
  product.authenticity,
  product.season,
  product.colors
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
  vendor.partner_status,
  business.source_url
from public.business_services service
join public.businesses business on business.id = service.business_id
join public.vendors vendor on vendor.id = business.vendor_id
where public.has_permission('catalog.view')
  and (
    public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
    or public.owns_vendor(business.vendor_id)
  );

create or replace function public.save_product_listing(
  target_product_id uuid,
  product_title text,
  product_description text,
  product_category text,
  product_price_minor bigint,
  product_original_price_minor bigint,
  product_currency text,
  product_images text[],
  product_sizes jsonb,
  product_colors text[],
  product_material text,
  product_fit text,
  product_care text,
  product_origin text,
  product_shipping text,
  product_returns text,
  product_authenticity text,
  product_season text,
  confirm_price boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_product public.products%rowtype;
begin
  if not public.has_permission('catalog.manage') then
    raise exception 'You do not have permission to edit product listings.' using errcode = '42501';
  end if;
  select * into selected_product
  from public.products
  where id = target_product_id
  for update;
  if not found then
    raise exception 'This product could not be found.' using errcode = 'P0002';
  end if;
  if not public.has_role(array['super_admin', 'admin']::public.platform_role[])
    and not public.owns_vendor(selected_product.vendor_id) then
    raise exception 'You cannot edit a product outside your store.' using errcode = '42501';
  end if;
  if pg_catalog.btrim(coalesce(product_title, '')) = ''
    or pg_catalog.btrim(coalesce(product_description, '')) = ''
    or pg_catalog.btrim(coalesce(product_category, '')) = ''
    or coalesce(product_price_minor, 0) <= 0
    or pg_catalog.btrim(coalesce(product_currency, '')) = ''
    or coalesce(product_sizes, '[]'::jsonb) = '[]'::jsonb
    or jsonb_typeof(coalesce(product_sizes, '[]'::jsonb)) <> 'array'
    or exists (
      select 1
      from jsonb_array_elements(coalesce(product_sizes, '[]'::jsonb)) entry(value)
      where coalesce((entry.value ->> 'stock')::integer, -1) < 0
        or pg_catalog.btrim(coalesce(entry.value ->> 'size', '')) = ''
    )
    or exists (
      select 1
      from pg_catalog.unnest(coalesce(product_images, '{}')) image_entry(url)
      where pg_catalog.btrim(image_entry.url) !~* '^https?://'
    )
    or coalesce(product_original_price_minor, 0) < 0
    or (product_original_price_minor is not null and product_original_price_minor < product_price_minor)
  then
    raise exception 'Complete the product details with a valid price, category, sizes, and photo URLs.' using errcode = '22023';
  end if;

  update public.products
  set title = pg_catalog.btrim(product_title),
      description = pg_catalog.btrim(product_description),
      category = pg_catalog.btrim(product_category),
      price_minor = product_price_minor,
      original_price_minor = product_original_price_minor,
      currency = pg_catalog.upper(pg_catalog.btrim(product_currency)),
      images = coalesce(product_images, '{}'),
      sizes = product_sizes,
      colors = coalesce(product_colors, '{}'),
      material = nullif(pg_catalog.btrim(coalesce(product_material, '')), ''),
      fit = nullif(pg_catalog.btrim(coalesce(product_fit, '')), ''),
      care = nullif(pg_catalog.btrim(coalesce(product_care, '')), ''),
      origin = nullif(pg_catalog.btrim(coalesce(product_origin, '')), ''),
      shipping = nullif(pg_catalog.btrim(coalesce(product_shipping, '')), ''),
      returns = nullif(pg_catalog.btrim(coalesce(product_returns, '')), ''),
      authenticity = nullif(pg_catalog.btrim(coalesce(product_authenticity, '')), ''),
      season = nullif(pg_catalog.btrim(coalesce(product_season, '')), ''),
      price_confirmed = coalesce(confirm_price, false)
  where id = target_product_id;
end;
$$;

create or replace function public.save_business_service(
  target_service_id uuid,
  service_name text,
  service_description text,
  service_price_minor bigint,
  service_currency text,
  service_duration_min integer,
  confirm_price boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_service public.business_services%rowtype;
  selected_vendor_id uuid;
begin
  if not public.has_permission('catalog.manage') then
    raise exception 'You do not have permission to edit services.' using errcode = '42501';
  end if;
  select service.* into selected_service
  from public.business_services service
  where service.id = target_service_id
  for update;
  if not found then
    raise exception 'This service could not be found.' using errcode = 'P0002';
  end if;
  select vendor_id into selected_vendor_id
  from public.businesses
  where id = selected_service.business_id;
  if not public.has_role(array['super_admin', 'admin']::public.platform_role[])
    and not public.owns_vendor(selected_vendor_id) then
    raise exception 'You cannot edit a service outside your provider account.' using errcode = '42501';
  end if;
  if pg_catalog.btrim(coalesce(service_name, '')) = ''
    or pg_catalog.btrim(coalesce(service_description, '')) = ''
    or coalesce(service_price_minor, 0) <= 0
    or pg_catalog.btrim(coalesce(service_currency, '')) = ''
    or coalesce(service_duration_min, 0) <= 0 then
    raise exception 'Enter a service name, description, price, currency, and duration.' using errcode = '22023';
  end if;
  update public.business_services
  set name = pg_catalog.btrim(service_name),
      description = pg_catalog.btrim(service_description),
      price_minor = service_price_minor,
      currency = pg_catalog.upper(pg_catalog.btrim(service_currency)),
      duration_min = service_duration_min,
      price_confirmed = coalesce(confirm_price, false)
  where id = target_service_id;
end;
$$;

create or replace function public.save_partner_listing(
  target_kind text,
  target_id uuid,
  listing_name text,
  listing_category text,
  listing_city text,
  listing_area text,
  listing_country text,
  listing_address text,
  listing_description text,
  listing_image_url text,
  listing_source_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_vendor_id uuid;
begin
  if not public.has_permission('partners.manage')
    or not public.has_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'Only platform administrators can edit provider and store records.' using errcode = '42501';
  end if;
  if pg_catalog.btrim(coalesce(listing_name, '')) = ''
    or pg_catalog.btrim(coalesce(listing_city, '')) = ''
    or pg_catalog.btrim(coalesce(listing_image_url, '')) !~* '^https?://'
    or (nullif(pg_catalog.btrim(coalesce(listing_source_url, '')), '') is not null
      and pg_catalog.btrim(listing_source_url) !~* '^https?://') then
    raise exception 'Enter a name, city, photo, and valid source URL.' using errcode = '22023';
  end if;

  if target_kind = 'provider' then
    select vendor_id into linked_vendor_id from public.businesses where id = target_id for update;
    if not found then raise exception 'This provider could not be found.' using errcode = 'P0002'; end if;
    if pg_catalog.btrim(coalesce(listing_category, '')) = ''
      or pg_catalog.btrim(coalesce(listing_area, '')) = '' then
      raise exception 'Enter the provider category and area.' using errcode = '22023';
    end if;
    update public.businesses
    set name = pg_catalog.btrim(listing_name),
        category = pg_catalog.btrim(listing_category),
        city = pg_catalog.btrim(listing_city),
        area = pg_catalog.btrim(listing_area),
        address = nullif(pg_catalog.btrim(coalesce(listing_address, '')), ''),
        description = pg_catalog.btrim(coalesce(listing_description, '')),
        cover_url = pg_catalog.btrim(listing_image_url),
        source_url = nullif(pg_catalog.btrim(coalesce(listing_source_url, '')), '')
    where id = target_id;
  elsif target_kind = 'store' then
    select vendor_id into linked_vendor_id from public.stores where id = target_id for update;
    if not found then raise exception 'This store could not be found.' using errcode = 'P0002'; end if;
    if pg_catalog.btrim(coalesce(listing_country, '')) = '' then
      raise exception 'Enter the store country.' using errcode = '22023';
    end if;
    update public.stores
    set name = pg_catalog.btrim(listing_name),
        city = pg_catalog.btrim(listing_city),
        country = pg_catalog.btrim(listing_country),
        address = nullif(pg_catalog.btrim(coalesce(listing_address, '')), ''),
        description = pg_catalog.btrim(coalesce(listing_description, '')),
        cover_url = pg_catalog.btrim(listing_image_url)
    where id = target_id;
  else
    raise exception 'Choose a provider or store record.' using errcode = '22023';
  end if;

  if not public.has_role(array['super_admin', 'admin']::public.platform_role[])
    and not public.owns_vendor(linked_vendor_id) then
    raise exception 'You cannot edit a record outside your account.' using errcode = '42501';
  end if;
end;
$$;

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
  select * into product_row from public.products where id = target_product_id for update;
  if not found then raise exception 'This product could not be found.' using errcode = 'P0002'; end if;
  if decision = 'published' and (
    pg_catalog.btrim(product_row.title) = ''
    or pg_catalog.btrim(product_row.description) = ''
    or pg_catalog.btrim(product_row.category) = ''
    or product_row.price_minor <= 0
    or not product_row.price_confirmed
    or not exists (
      select 1 from pg_catalog.unnest(product_row.images) image_entry(url)
      where pg_catalog.btrim(image_entry.url) ~* '^https?://'
    )
    or not exists (
      select 1 from pg_catalog.jsonb_array_elements(product_row.sizes) entry(value)
      where (entry.value ->> 'stock')::integer > 0
    )
    or not exists (
      select 1 from public.brands brand
      where brand.id = product_row.brand_id and brand.is_active
        and brand.partnership_status = 'verified' and brand.approval_status = 'published'
    )
    or not exists (
      select 1 from public.stores store
      where store.id = product_row.store_id and store.is_active
        and store.approval_status = 'published'
    )
    or not exists (
      select 1 from public.vendors vendor
      where vendor.id = product_row.vendor_id and vendor.is_active
        and vendor.partner_status = 'approved'
    )
  ) then
    raise exception 'A confirmed price, verified brand, approved store and partner, product photo, complete details, and received stock are required.' using errcode = '22023';
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
  business_row public.businesses%rowtype;
begin
  if not public.has_permission('catalog.approve') then
    raise exception 'You do not have permission to review services.' using errcode = '42501';
  end if;
  if decision not in ('published', 'rejected') then
    raise exception 'Choose approve or decline for this service.' using errcode = '22023';
  end if;
  select * into service_row from public.business_services where id = target_service_id for update;
  if not found then raise exception 'This service could not be found.' using errcode = 'P0002'; end if;
  select * into business_row from public.businesses where id = service_row.business_id;
  if decision = 'published' and (
    pg_catalog.btrim(service_row.name) = ''
    or pg_catalog.btrim(service_row.description) = ''
    or service_row.price_minor <= 0
    or not service_row.price_confirmed
    or service_row.duration_min <= 0
    or pg_catalog.btrim(coalesce(business_row.cover_url, '')) !~* '^https?://'
    or business_row.approval_status <> 'published'
    or not business_row.is_active
    or not exists (
      select 1 from public.vendors vendor where vendor.id = business_row.vendor_id
        and vendor.is_active and vendor.partner_status = 'approved'
    )
  ) then
    raise exception 'A confirmed price, approved provider and partner, provider photo, clear description, and duration are required.' using errcode = '22023';
  end if;
  update public.business_services
  set approval_status = decision,
      is_active = decision = 'published',
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = target_service_id;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Fashion Floor staff upload listing images" on storage.objects;
create policy "Fashion Floor staff upload listing images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      public.has_permission('catalog.manage')
      or public.has_permission('partners.manage')
    )
  );

drop policy if exists "Fashion Floor staff delete listing images" on storage.objects;
create policy "Fashion Floor staff delete listing images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      public.has_permission('catalog.manage')
      or public.has_permission('partners.manage')
    )
  );

revoke all on function public.save_product_listing(uuid, text, text, text, bigint, bigint, text, text[], jsonb, text[], text, text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.save_business_service(uuid, text, text, bigint, text, integer, boolean) from public, anon, authenticated;
revoke all on function public.save_partner_listing(text, uuid, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.save_product_listing(uuid, text, text, text, bigint, bigint, text, text[], jsonb, text[], text, text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.save_business_service(uuid, text, text, bigint, text, integer, boolean) to authenticated;
grant execute on function public.save_partner_listing(text, uuid, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.review_product(uuid, public.product_review_status) to authenticated;
grant execute on function public.review_business_service(uuid, public.product_review_status) to authenticated;
