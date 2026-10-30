create type public.platform_role as enum (
  'super_admin',
  'admin',
  'finance',
  'support',
  'supplier',
  'provider'
);

create type public.order_status as enum ('pending', 'processing', 'paid', 'cancelled');

alter table public.vendors
  add column partner_status text not null default 'pending'
  check (partner_status in ('approved', 'pending', 'suspended', 'rejected'));
alter table public.vendors
  add column vendor_type text not null default 'supplier'
  check (vendor_type in ('supplier', 'provider'));

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.platform_role not null,
  vendor_id uuid references public.vendors (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (role in ('supplier', 'provider') and vendor_id is not null)
    or (role not in ('supplier', 'provider') and vendor_id is null)
  )
);

alter table public.profiles add column email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute procedure public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete restrict,
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  status public.order_status not null default 'pending',
  currency text not null default 'TZS' check (currency ~ '^[A-Z]{3}$'),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  shipping_minor bigint not null default 0 check (shipping_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  title text not null,
  size text not null default '',
  color text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  image_url text not null default ''
);

create index user_roles_vendor_idx on public.user_roles (vendor_id) where vendor_id is not null;
create index orders_vendor_created_idx on public.orders (vendor_id, created_at desc);
create index orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index order_items_order_idx on public.order_items (order_id);

create function public.has_role(allowed_roles public.platform_role[])
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

create function public.has_permission(permission_key text)
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
          'bookings.manage', 'catalog.view', 'catalog.manage', 'partners.view',
          'partners.manage', 'team.view', 'team.manage', 'roles.view', 'finance.view'
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

create function public.owns_vendor(target_vendor_id uuid)
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
      and role_row.role in ('supplier', 'provider')
      and role_row.vendor_id = target_vendor_id
      and exists (
        select 1 from public.vendors vendor
        where vendor.id = target_vendor_id and vendor.is_active
      )
  );
$$;

create function public.assign_team_role(
  target_user_id uuid,
  target_role public.platform_role,
  target_vendor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role public.platform_role;
begin
  select role_row.role into caller_role
  from public.user_roles role_row
  where role_row.user_id = (select auth.uid())
    and role_row.is_active
    and role_row.role in ('super_admin', 'admin')
  for update;

  if caller_role is null then
    raise exception 'You do not have permission to manage team roles.' using errcode = '42501';
  end if;

  if target_user_id = (select auth.uid()) then
    raise exception 'You cannot change your own role.' using errcode = '42501';
  end if;

  if target_role = 'super_admin' and caller_role <> 'super_admin' then
    raise exception 'Only an Owner can assign the Owner role.' using errcode = '42501';
  end if;

  if caller_role = 'admin' and exists (
    select 1 from public.user_roles role_row
    where role_row.user_id = target_user_id and role_row.role = 'super_admin'
  ) then
    raise exception 'An Admin cannot change an Owner account.' using errcode = '42501';
  end if;

  if target_role in ('supplier', 'provider') then
    if target_vendor_id is null or not exists (
      select 1 from public.vendors vendor
      where vendor.id = target_vendor_id
        and vendor.is_active
        and vendor.vendor_type = target_role::text
    ) then
      raise exception 'Choose an active business that matches this supplier or provider role.' using errcode = '22023';
    end if;
  elsif target_vendor_id is not null then
    raise exception 'This role cannot be linked to a supplier or provider business.' using errcode = '22023';
  end if;

  insert into public.user_roles (user_id, role, vendor_id, is_active)
  values (target_user_id, target_role, target_vendor_id, true)
  on conflict (user_id) do update
  set role = excluded.role, vendor_id = excluded.vendor_id, is_active = true;
end;
$$;

create function public.set_team_member_active(target_user_id uuid, make_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role public.platform_role;
  target_role public.platform_role;
begin
  select role_row.role into caller_role
  from public.user_roles role_row
  where role_row.user_id = (select auth.uid())
    and role_row.is_active
    and role_row.role in ('super_admin', 'admin')
  for update;

  if caller_role is null or target_user_id = (select auth.uid()) then
    raise exception 'You do not have permission to change this account.' using errcode = '42501';
  end if;

  select role_row.role into target_role
  from public.user_roles role_row
  where role_row.user_id = target_user_id
  for update;

  if target_role is null or (target_role = 'super_admin' and caller_role <> 'super_admin') then
    raise exception 'You cannot change this account.' using errcode = '42501';
  end if;

  update public.user_roles
  set is_active = make_active
  where user_id = target_user_id;
end;
$$;

create function public.set_vendor_status(target_vendor_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('partners.manage')
    or not public.has_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'You do not have permission to review business partners.' using errcode = '42501';
  end if;

  if next_status not in ('pending', 'approved', 'suspended', 'rejected') then
    raise exception 'This is not a valid partner status.' using errcode = '22023';
  end if;

  update public.vendors
  set partner_status = next_status,
      verification_status = case
        when next_status = 'approved' then 'verified'::public.partnership_status
        else 'pending'::public.partnership_status
      end,
      is_active = next_status = 'approved'
  where id = target_vendor_id;

  if not found then
    raise exception 'This business partner was not found.' using errcode = 'P0002';
  end if;
end;
$$;

create function public.update_order_status(target_order_id uuid, next_status public.order_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_order public.orders%rowtype;
begin
  if not public.has_permission('orders.manage') then
    raise exception 'You do not have permission to update orders.' using errcode = '42501';
  end if;

  if next_status not in ('processing', 'cancelled') then
    raise exception 'Payment status can only be updated by the payment provider.' using errcode = '42501';
  end if;

  select * into selected_order
  from public.orders
  where id = target_order_id
  for update;

  if not found or not (
    public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
    or public.owns_vendor(selected_order.vendor_id)
  ) then
    raise exception 'This order is not available to your account.' using errcode = '42501';
  end if;

  if selected_order.status not in ('pending', 'processing') then
    raise exception 'Only pending or processing orders can be changed.' using errcode = 'P0001';
  end if;

  if next_status = 'processing' and selected_order.status <> 'pending' then
    raise exception 'Only pending orders can start processing.' using errcode = 'P0001';
  end if;

  update public.orders
  set status = next_status, updated_at = now()
  where id = target_order_id;
end;
$$;

create function public.update_booking_status(target_booking_id uuid, next_status public.booking_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_booking public.bookings%rowtype;
begin
  if not public.has_permission('bookings.manage') then
    raise exception 'You do not have permission to update appointments.' using errcode = '42501';
  end if;

  select * into selected_booking
  from public.bookings
  where id = target_booking_id
  for update;

  if not found or not (
    public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
    or public.owns_vendor((select business.vendor_id from public.businesses business where business.id = selected_booking.business_id))
  ) then
    raise exception 'This appointment is not available to your account.' using errcode = '42501';
  end if;

  if next_status = 'confirmed' and selected_booking.status <> 'pending' then
    raise exception 'Only pending appointments can be confirmed.' using errcode = 'P0001';
  end if;

  if next_status = 'completed' and (
    selected_booking.status <> 'confirmed' or selected_booking.starts_at > now()
  ) then
    raise exception 'Only past, confirmed appointments can be completed.' using errcode = 'P0001';
  end if;

  if next_status = 'cancelled' and selected_booking.status not in ('pending', 'confirmed') then
    raise exception 'This appointment can no longer be cancelled.' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = next_status
  where id = target_booking_id;

  if next_status = 'cancelled' then
    update public.service_slots
    set status = 'available', booked_by = null
    where id = selected_booking.slot_id and status = 'booked';
  end if;
end;
$$;

create view public.admin_orders as
select
  order_row.id,
  order_row.customer_id,
  order_row.vendor_id,
  order_row.status,
  order_row.currency,
  order_row.subtotal_minor,
  order_row.shipping_minor,
  order_row.created_at,
  vendor.name as vendor_name,
  case
    when public.has_role(array['super_admin', 'admin', 'support']::public.platform_role[])
      then profile.display_name
    else split_part(profile.display_name, ' ', 1)
  end as customer_name,
  case
    when public.has_role(array['super_admin', 'admin', 'support']::public.platform_role[])
      then profile.email
    when profile.email is not null
      then left(split_part(profile.email, '@', 1), 1) || '***@' || split_part(profile.email, '@', 2)
    else null
  end as customer_email,
  coalesce(item_rows.items, '[]'::jsonb) as items
from public.orders order_row
join public.vendors vendor on vendor.id = order_row.vendor_id
left join public.profiles profile on profile.id = order_row.customer_id
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'id', item.id,
    'title', item.title,
    'size', item.size,
    'color', item.color,
    'quantity', item.quantity,
    'unit_price_minor', item.unit_price_minor,
    'image_url', item.image_url
  ) order by item.id) as items
  from public.order_items item
  where item.order_id = order_row.id
) item_rows on true
where public.has_permission('orders.view')
  and (
    public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
    or public.owns_vendor(order_row.vendor_id)
  );

create view public.admin_bookings as
select
  booking.id,
  booking.customer_id,
  booking.business_id,
  business.vendor_id,
  booking.service_id,
  booking.stylist_id,
  booking.starts_at,
  booking.duration_min,
  booking.price_minor,
  booking.currency,
  booking.status,
  case
    when public.has_role(array['super_admin', 'admin', 'support']::public.platform_role[])
      then profile.display_name
    else split_part(profile.display_name, ' ', 1)
  end as customer_name,
  case
    when public.has_role(array['super_admin', 'admin', 'support']::public.platform_role[])
      then profile.email
    when profile.email is not null
      then left(split_part(profile.email, '@', 1), 1) || '***@' || split_part(profile.email, '@', 2)
    else null
  end as customer_email,
  business.name as business_name,
  service.name as service_name,
  stylist.name as stylist_name,
  stylist.avatar_url as stylist_avatar
from public.bookings booking
join public.businesses business on business.id = booking.business_id
join public.business_services service on service.id = booking.service_id
join public.stylists stylist on stylist.id = booking.stylist_id
left join public.profiles profile on profile.id = booking.customer_id
where public.has_permission('bookings.view')
  and (
    public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
    or public.owns_vendor(business.vendor_id)
  );

create view public.admin_products as
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
  coalesce(stock.total, 0)::integer as stock
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

create view public.admin_partners as
select
  vendor.id,
  vendor.owner_id,
  vendor.name,
  vendor.partner_status as verification_status,
  vendor.is_active,
  vendor.created_at,
  owner_profile.display_name as owner_name,
  owner_profile.email as owner_email,
  coalesce(stores.location_city, businesses.location_city, '') as city,
  vendor.vendor_type as partner_type
from public.vendors vendor
left join public.profiles owner_profile on owner_profile.id = vendor.owner_id
left join lateral (
  select store.vendor_id, min(store.city) as location_city
  from public.stores store
  where store.vendor_id = vendor.id
  group by store.vendor_id
) stores on true
left join lateral (
  select business.vendor_id, min(business.city) as location_city
  from public.businesses business
  where business.vendor_id = vendor.id
  group by business.vendor_id
) businesses on true
where public.has_permission('partners.view')
  and public.has_role(array['super_admin', 'admin']::public.platform_role[]);

alter table public.user_roles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Users can see their own active role"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) and is_active);
create policy "Admins can see active team roles"
  on public.user_roles for select to authenticated
  using (public.has_role(array['super_admin', 'admin']::public.platform_role[]));
create policy "Vendors can see their active team roles"
  on public.user_roles for select to authenticated
  using (public.owns_vendor(vendor_id) and is_active);

create policy "Customers and authorized staff can view orders"
  on public.orders for select to authenticated
  using (
    customer_id = (select auth.uid())
    or (
      public.has_permission('orders.view')
      and (
        public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
        or public.owns_vendor(vendor_id)
      )
    )
  );

create policy "Team managers can see their partner contacts"
  on public.profiles for select to authenticated
  using (
    public.has_permission('partners.view')
    and public.has_role(array['super_admin', 'admin']::public.platform_role[])
    and exists (
      select 1 from public.vendors vendor
      where vendor.owner_id = profiles.id
    )
  );

create policy "Team managers can see team profiles"
  on public.profiles for select to authenticated
  using (
    public.has_permission('team.view')
    and public.has_role(array['super_admin', 'admin']::public.platform_role[])
    and exists (
      select 1 from public.user_roles member
      where member.user_id = profiles.id
    )
  );

drop policy if exists "Only authorized partner owners can read order customers" on public.profiles;

create policy "Authorized catalog managers can read products"
  on public.products for select to authenticated
  using (public.has_permission('catalog.view'));
create policy "Authorized catalog managers can read brands"
  on public.brands for select to authenticated
  using (public.has_permission('catalog.view'));
create policy "Authorized catalog managers can read stores"
  on public.stores for select to authenticated
  using (public.has_permission('catalog.view'));
create policy "Partner owners can read their own stores"
  on public.stores for select to authenticated
  using (public.owns_vendor(vendor_id));
create policy "Partner owners can read their own brands"
  on public.brands for select to authenticated
  using (
    vendor_id is not null and public.owns_vendor(vendor_id)
  );
create policy "Authorized staff can read business directory"
  on public.businesses for select to authenticated
  using (public.has_permission('partners.view') or public.has_permission('catalog.view'));
create policy "Authorized staff can read business services"
  on public.business_services for select to authenticated
  using (public.has_permission('catalog.view'));
create policy "Authorized staff can read stylists"
  on public.stylists for select to authenticated
  using (public.has_permission('catalog.view'));
create policy "Partner owners can read their own business services"
  on public.business_services for select to authenticated
  using (
    business_id in (
      select business.id from public.businesses business
      where public.owns_vendor(business.vendor_id)
    )
  );
create policy "Partner owners can read their own stylists"
  on public.stylists for select to authenticated
  using (public.owns_vendor(vendor_id));

create policy "Customers and authorized staff can view order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders order_row
      where order_row.id = order_items.order_id
        and (
          order_row.customer_id = (select auth.uid())
          or (
            public.has_permission('orders.view')
            and (
              public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
              or public.owns_vendor(order_row.vendor_id)
            )
          )
        )
    )
  );

create policy "Only authorized partner owners can read order customers"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (
      public.has_permission('orders.view')
      and exists (
        select 1 from public.orders order_row
        where order_row.customer_id = profiles.id
          and (
            public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
            or public.owns_vendor(order_row.vendor_id)
          )
      )
    )
    or (
      public.has_permission('bookings.view')
      and exists (
        select 1 from public.bookings booking
        join public.businesses business on business.id = booking.business_id
        where booking.customer_id = profiles.id
          and (
            public.has_role(array['super_admin', 'admin', 'finance', 'support']::public.platform_role[])
            or public.owns_vendor(business.vendor_id)
          )
      )
    )
  );

create policy "Vendors can read their own vendor profiles"
  on public.vendors for select to authenticated using (public.owns_vendor(id));

grant select on public.user_roles to authenticated;
grant select on public.orders, public.order_items to authenticated;
revoke insert, update on public.profiles from authenticated;
grant update (display_name, avatar_url, phone) on public.profiles to authenticated;
grant insert (owner_id, name, vendor_type) on public.vendors to authenticated;
grant select on public.admin_orders, public.admin_bookings, public.admin_products, public.admin_partners
  to authenticated;
revoke all on function public.has_role(public.platform_role[]) from public, anon, authenticated;
revoke all on function public.has_permission(text) from public, anon, authenticated;
revoke all on function public.owns_vendor(uuid) from public, anon, authenticated;
revoke all on function public.assign_team_role(uuid, public.platform_role, uuid) from public, anon, authenticated;
revoke all on function public.set_team_member_active(uuid, boolean) from public, anon, authenticated;
revoke all on function public.set_vendor_status(uuid, text) from public, anon, authenticated;
revoke all on function public.update_order_status(uuid, public.order_status) from public, anon, authenticated;
revoke all on function public.update_booking_status(uuid, public.booking_status) from public, anon, authenticated;
grant execute on function public.has_role(public.platform_role[]) to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.owns_vendor(uuid) to authenticated;
grant execute on function public.assign_team_role(uuid, public.platform_role, uuid) to authenticated;
grant execute on function public.set_team_member_active(uuid, boolean) to authenticated;
grant execute on function public.set_vendor_status(uuid, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.update_booking_status(uuid, public.booking_status) to authenticated;
