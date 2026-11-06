create or replace function public.import_product_drafts(
  target_store_id uuid,
  product_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_vendor_id uuid;
  entry jsonb;
  selected_brand_id uuid;
  row_count integer := 0;
  price_minor bigint;
  original_price_minor bigint;
  product_sizes jsonb;
  product_images text[];
  product_colors text[];
  brand_name text;
  product_title text;
  product_description text;
  product_category text;
  product_currency text;
begin
  if not public.has_permission('catalog.manage') then
    raise exception 'You do not have permission to import products.' using errcode = '42501';
  end if;
  if product_rows is null
    or jsonb_typeof(product_rows) <> 'array'
    or jsonb_array_length(product_rows) < 1
    or jsonb_array_length(product_rows) > 250 then
    raise exception 'Import between 1 and 250 product rows at a time.' using errcode = '22023';
  end if;

  select store.vendor_id into selected_vendor_id
  from public.stores store
  where store.id = target_store_id
  for update;
  if selected_vendor_id is null then
    raise exception 'Choose an existing store.' using errcode = 'P0002';
  end if;
  if not public.has_role(array['super_admin', 'admin']::public.platform_role[])
    and not public.owns_vendor(selected_vendor_id) then
    raise exception 'You can only import products into your own store.' using errcode = '42501';
  end if;

  for entry in select value from jsonb_array_elements(product_rows)
  loop
    brand_name := pg_catalog.btrim(coalesce(entry ->> 'brand_name', ''));
    product_title := pg_catalog.btrim(coalesce(entry ->> 'title', ''));
    product_description := pg_catalog.btrim(coalesce(entry ->> 'description', ''));
    product_category := pg_catalog.btrim(coalesce(entry ->> 'category', ''));
    product_currency := pg_catalog.upper(pg_catalog.btrim(coalesce(entry ->> 'currency', 'TZS')));

    if brand_name = '' or product_title = '' or product_description = '' or product_category = '' then
      raise exception 'Each row needs a brand, product name, description, and category.' using errcode = '22023';
    end if;
    if product_currency !~ '^[A-Z]{3}$' then
      raise exception 'Use a three-letter currency code such as TZS or USD.' using errcode = '22023';
    end if;
    begin
      price_minor := round((entry ->> 'price')::numeric * 100)::bigint;
      original_price_minor := case
        when nullif(pg_catalog.btrim(coalesce(entry ->> 'original_price', '')), '') is null then null
        else round((entry ->> 'original_price')::numeric * 100)::bigint
      end;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Enter valid price amounts in every spreadsheet row.' using errcode = '22023';
    end;
    if price_minor <= 0 or original_price_minor < 0
      or (original_price_minor is not null and original_price_minor < price_minor) then
      raise exception 'Each selling price must be positive; an original price must not be less than the selling price.' using errcode = '22023';
    end if;

    product_sizes := coalesce(entry -> 'sizes', '[]'::jsonb);
    if jsonb_typeof(product_sizes) <> 'array' or jsonb_array_length(product_sizes) = 0 then
      raise exception 'Add at least one size and on-hand quantity to every product.' using errcode = '22023';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(product_sizes) size_entry(value)
      where pg_catalog.btrim(coalesce(size_entry.value ->> 'size', '')) = ''
        or coalesce((size_entry.value ->> 'stock')::integer, -1) < 0
    ) then
      raise exception 'Every size needs a name and a whole-number on-hand quantity of zero or more.' using errcode = '22023';
    end if;
    if (
      select count(distinct pg_catalog.lower(pg_catalog.btrim(size_entry.value ->> 'size')))
      from jsonb_array_elements(product_sizes) size_entry(value)
    ) <> jsonb_array_length(product_sizes) then
      raise exception 'Each size can appear only once per product.' using errcode = '22023';
    end if;

    if jsonb_typeof(coalesce(entry -> 'images', '[]'::jsonb)) <> 'array' then
      raise exception 'Product image URLs must be provided as a list.' using errcode = '22023';
    end if;
    select coalesce(array_agg(pg_catalog.btrim(value)), '{}')
    into product_images
    from jsonb_array_elements_text(coalesce(entry -> 'images', '[]'::jsonb)) image(value)
    where pg_catalog.btrim(value) <> '';
    if exists (
      select 1 from pg_catalog.unnest(product_images) image_entry(url)
      where image_entry.url !~* '^https?://'
    ) then
      raise exception 'Product image links must start with http:// or https://.' using errcode = '22023';
    end if;

    if jsonb_typeof(coalesce(entry -> 'colors', '[]'::jsonb)) <> 'array' then
      raise exception 'Product colours must be provided as a list.' using errcode = '22023';
    end if;
    select coalesce(array_agg(pg_catalog.btrim(value)), '{}')
    into product_colors
    from jsonb_array_elements_text(coalesce(entry -> 'colors', '[]'::jsonb)) color(value)
    where pg_catalog.btrim(value) <> '';

    insert into public.brands (vendor_id, name, partnership_status, is_active, approval_status)
    values (selected_vendor_id, brand_name, 'pending', false, 'pending')
    on conflict (name) do nothing;

    select brand.id into selected_brand_id
    from public.brands brand
    where brand.name = brand_name;
    if selected_brand_id is null then
      raise exception 'Could not associate the brand for product %.', product_title using errcode = '22023';
    end if;

    insert into public.products (
      vendor_id, store_id, brand_id, title, description, price_minor,
      original_price_minor, currency, images, sizes, colors, category,
      listing_type, is_active, approval_status, price_confirmed, stock_target
    )
    values (
      selected_vendor_id, target_store_id, selected_brand_id, product_title,
      product_description, price_minor, original_price_minor, product_currency,
      product_images, product_sizes, product_colors, product_category,
      'featured', false, 'pending', false, 0
    );
    row_count := row_count + 1;
  end loop;

  return row_count;
end;
$$;

revoke all on function public.import_product_drafts(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_product_drafts(uuid, jsonb) to authenticated;
