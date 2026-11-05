begin;

do $$
begin
  if not exists (
    select 1
    from public.stores store
    join public.vendors vendor on vendor.id = store.vendor_id
    where store.name = 'Fashion Floor Point'
      and vendor.name = 'Fashion Floor'
  ) then
    raise exception 'Create or verify the Fashion Floor Point store before loading its catalog.';
  end if;
end;
$$;

with brand_seed(name, segment) as (
  values
    ('Gucci', 'luxury'),
    ('Louis Vuitton', 'luxury'),
    ('Chanel', 'luxury'),
    ('Prada', 'luxury'),
    ('Dior', 'luxury'),
    ('Armani', 'luxury'),
    ('Versace', 'luxury'),
    ('Burberry', 'luxury'),
    ('Zara', 'high-street'),
    ('H&M', 'high-street'),
    ('Nike', 'sportswear'),
    ('Adidas', 'sportswear')
)
insert into public.brands (name, partnership_status, is_active, approval_status)
select name, 'pending', false, 'pending'
from brand_seed
on conflict (name) do nothing;

with brand_seed(name, segment) as (
  values
    ('Gucci', 'luxury'),
    ('Louis Vuitton', 'luxury'),
    ('Chanel', 'luxury'),
    ('Prada', 'luxury'),
    ('Dior', 'luxury'),
    ('Armani', 'luxury'),
    ('Versace', 'luxury'),
    ('Burberry', 'luxury'),
    ('Zara', 'high-street'),
    ('H&M', 'high-street'),
    ('Nike', 'sportswear'),
    ('Adidas', 'sportswear')
),
product_seed(category, title, base_price_tzs) as (
  values
    ('Tops', 'Cotton crew-neck T-shirt', 180000),
    ('Tops', 'Button-front cotton shirt', 320000),
    ('Outerwear', 'Lightweight everyday jacket', 850000),
    ('Bottoms', 'Straight-leg tailored trousers', 480000),
    ('Denim', 'Classic straight-leg jeans', 420000),
    ('Dresses', 'Day dress', 690000),
    ('Footwear', 'Low-top everyday trainers', 750000),
    ('Bags', 'Structured crossbody bag', 920000),
    ('Accessories', 'Leather everyday belt', 220000),
    ('Activewear', 'Training top', 240000)
),
store_record as (
  select store.id as store_id, store.vendor_id
  from public.stores store
  join public.vendors vendor on vendor.id = store.vendor_id
  where store.name = 'Fashion Floor Point'
    and vendor.name = 'Fashion Floor'
  order by store.created_at
  limit 1
),
resolved_products as (
  select
    store_record.vendor_id,
    store_record.store_id,
    brand.id as brand_id,
    brand.name as brand_name,
    product_seed.category,
    product_seed.title,
    product_seed.base_price_tzs,
    brand_seed.segment,
    pg_catalog.lower(pg_catalog.regexp_replace(brand.name, '[^a-zA-Z0-9]+', '-', 'g'))
      || ':' || pg_catalog.lower(pg_catalog.regexp_replace(product_seed.category, '[^a-zA-Z0-9]+', '-', 'g'))
      || ':' || pg_catalog.lower(pg_catalog.regexp_replace(product_seed.title, '[^a-zA-Z0-9]+', '-', 'g')) as catalog_key
  from store_record
  cross join brand_seed
  join public.brands brand on brand.name = brand_seed.name
  cross join product_seed
)
insert into public.products (
  vendor_id,
  store_id,
  brand_id,
  title,
  description,
  price_minor,
  currency,
  images,
  sizes,
  colors,
  category,
  listing_type,
  catalog_key,
  material,
  fit,
  care,
  origin,
  shipping,
  returns,
  authenticity,
  season,
  is_active,
  approval_status,
  price_confirmed,
  stock_target
)
select
  vendor_id,
  store_id,
  brand_id,
  title,
  'Draft catalogue entry for ' || brand_name || '. Product model, image, supplier authorization, proposed TZS price, physical quantity, and fulfilment terms require confirmation before this item can be offered for sale.',
  (round((base_price_tzs * case
    when segment = 'luxury' then 4.0
    when segment = 'sportswear' then 1.35
    else 1.0
  end) / 5000.0) * 5000)::bigint * 100,
  'TZS',
  '{}',
  '[{"size":"XS","stock":0},{"size":"S","stock":0},{"size":"M","stock":0},{"size":"L","stock":0},{"size":"XL","stock":0}]'::jsonb,
  '{}',
  category,
  'featured',
  catalog_key,
  null,
  'Regular; confirm against the received item.',
  'Follow the garment label after sourcing.',
  'Country of manufacture to be verified.',
  'Fulfilment terms to be confirmed.',
  'Returns policy to be confirmed.',
  'Brand partnership and product authenticity are not verified.',
  'Season to be confirmed.',
  false,
  'pending',
  false,
  10
from resolved_products source
where not exists (
  select 1
  from public.products existing
  where existing.store_id = source.store_id
    and existing.catalog_key = source.catalog_key
    and existing.title = source.title
);

with store_record as (
  select store.vendor_id
  from public.stores store
  join public.vendors vendor on vendor.id = store.vendor_id
  where store.name = 'Fashion Floor Point'
    and vendor.name = 'Fashion Floor'
  order by store.created_at
  limit 1
),
business_record as (
  insert into public.businesses (
    vendor_id,
    name,
    category,
    city,
    area,
    description,
    is_active,
    approval_status
  )
  select
    store_record.vendor_id,
    'Fashion Floor Point Style Studio',
    'Fashion and personal styling',
    'Online',
    'Online',
    'Service catalogue draft. Provider identity, location, imagery, prices, appointment capacity, and service delivery must be confirmed before bookings open.',
    false,
    'pending'
  from store_record
  where not exists (
    select 1 from public.businesses business
    where business.vendor_id = store_record.vendor_id
      and business.name = 'Fashion Floor Point Style Studio'
  )
  returning id
),
service_target as (
  select id from business_record
  union all
  select business.id
  from public.businesses business
  join public.stores store on store.vendor_id = business.vendor_id
  where business.name = 'Fashion Floor Point Style Studio'
    and store.name = 'Fashion Floor Point'
  limit 1
),
service_seed(name, description, price_tzs, duration_min) as (
  values
    ('Personal style consultation', 'A one-to-one style consultation. Provider assignment and final service details require confirmation.', 45000, 45),
    ('Wardrobe planning session', 'A guided wardrobe review and outfit-planning session. Final scope requires confirmation.', 65000, 60),
    ('Occasion outfit coordination', 'Outfit recommendations for a special occasion. Garment availability and final scope require confirmation.', 75000, 60),
    ('Personal shopping appointment', 'A guided shopping appointment based on a customer brief. Provider availability requires confirmation.', 90000, 90),
    ('Fit and alteration consultation', 'A fitting consultation to assess alteration needs. Tailoring capacity requires confirmation.', 25000, 30),
    ('Made-to-measure consultation', 'An initial consultation for custom clothing. Measurements, tailoring capacity, and quote require confirmation.', 50000, 45),
    ('Colour and style consultation', 'A personal colour and style consultation. Provider credentials and scope require confirmation.', 55000, 45),
    ('Event styling appointment', 'An event styling appointment with a proposed outfit plan. Availability requires confirmation.', 80000, 60),
    ('Closet edit session', 'A guided review of wardrobe pieces and styling options. Final scope requires confirmation.', 70000, 60),
    ('Gift styling consultation', 'A guided appointment to select a fashion gift. Product availability requires confirmation.', 35000, 30)
)
insert into public.business_services (
  business_id,
  name,
  description,
  price_minor,
  currency,
  duration_min,
  is_active,
  approval_status,
  price_confirmed
)
select
  service_target.id,
  service_seed.name,
  service_seed.description || ' Indicative TZS planning price only; confirm before publishing.',
  service_seed.price_tzs::bigint * 100,
  'TZS',
  service_seed.duration_min,
  false,
  'pending',
  false
from service_target
cross join service_seed
where not exists (
  select 1
  from public.business_services existing
  where existing.business_id = service_target.id
    and existing.name = service_seed.name
);

commit;
