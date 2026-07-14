-- S-Grill schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

-- 1. Profiles ---------------------------------------------------------------
-- One row per signed-up user, created automatically on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any signed-in user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Auto-create a profile row when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Menu: categories + dishes ------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null,
  evening_and_holidays_only boolean not null default false,
  is_custom boolean not null default false,
  -- Rough per-portion estimate, not a nutritionist's figure. Feeds the Halouf Awards ranking.
  calories_estimate int not null default 0,
  added_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.dishes enable row level security;

create policy "categories readable by any signed-in user"
  on public.categories for select to authenticated using (true);

create policy "dishes readable by any signed-in user"
  on public.dishes for select to authenticated using (true);

create policy "signed-in users can add a dish"
  on public.dishes for insert to authenticated
  with check (added_by = auth.uid());

-- 3. Outings + rounds ----------------------------------------------------------
-- An "outing" is one visit to the restaurant; it contains 1-3 ordering rounds.
create table public.outings (
  id uuid primary key default gen_random_uuid(),
  label text not null default to_char(now(), 'DD/MM/YYYY'),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  outing_id uuid not null references public.outings (id) on delete cascade,
  round_number int not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  unique (outing_id, round_number)
);

alter table public.outings enable row level security;
alter table public.rounds enable row level security;

create policy "outings readable by any signed-in user"
  on public.outings for select to authenticated using (true);
create policy "signed-in users can create an outing"
  on public.outings for insert to authenticated with check (created_by = auth.uid());
create policy "signed-in users can close an outing"
  on public.outings for update to authenticated using (true);

create policy "rounds readable by any signed-in user"
  on public.rounds for select to authenticated using (true);
create policy "signed-in users can manage rounds"
  on public.rounds for all to authenticated using (true) with check (true);

-- 4. Orders --------------------------------------------------------------------
-- One row per (round, user, dish): how many of that dish this person wants this round.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  dish_id uuid not null references public.dishes (id) on delete cascade,
  quantity int not null check (quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (round_id, user_id, dish_id)
);

alter table public.orders enable row level security;

create policy "orders readable by any signed-in user"
  on public.orders for select to authenticated using (true);

create policy "users manage their own orders"
  on public.orders for insert to authenticated
  with check (user_id = auth.uid());

create policy "users update their own orders"
  on public.orders for update to authenticated
  using (user_id = auth.uid());

create policy "users delete their own orders"
  on public.orders for delete to authenticated
  using (user_id = auth.uid());

-- keep updated_at fresh on every edit
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

-- 5. Halouf Awards --------------------------------------------------------------
-- Lifetime leaderboard: who has eaten the most estimated calories, across every outing.
-- Ranked by calories rather than dish count so a handful of chef's mains isn't
-- outranked by a pile of cheap skewers.
create view public.halouf_awards as
select
  p.id as user_id,
  p.display_name,
  coalesce(sum(o.quantity * d.calories_estimate), 0)::int as total_calories,
  coalesce(sum(o.quantity), 0)::int as total_quantity,
  count(distinct r.outing_id) as outings_count,
  case
    when count(distinct r.outing_id) = 0 then 0
    else round(coalesce(sum(o.quantity * d.calories_estimate), 0)::numeric / count(distinct r.outing_id), 0)
  end as avg_calories_per_outing
from public.profiles p
left join public.orders o on o.user_id = p.id and o.quantity > 0
left join public.rounds r on r.id = o.round_id
left join public.dishes d on d.id = o.dish_id
group by p.id, p.display_name;

grant select on public.halouf_awards to authenticated;

-- 6. Realtime -------------------------------------------------------------------
-- Broadcast changes on orders/rounds so every phone sees the live running total.
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.rounds;
