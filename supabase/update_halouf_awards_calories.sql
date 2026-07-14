-- Run this once in the Supabase SQL editor if you already created halouf_awards.sql
-- before the ranking switched from dish count to estimated calories.
-- Run supabase/add_calories.sql first (it adds calories_estimate and backfills the menu).

drop view if exists public.halouf_awards;

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
