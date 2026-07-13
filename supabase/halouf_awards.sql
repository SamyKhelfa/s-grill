-- Run this once in the Supabase SQL editor if you already ran schema.sql before
-- the Halouf Awards leaderboard was added (it's now also included in schema.sql
-- for fresh installs).

create view public.halouf_awards as
select
  p.id as user_id,
  p.display_name,
  coalesce(sum(o.quantity), 0)::int as total_quantity,
  count(distinct r.outing_id) as outings_count,
  case
    when count(distinct r.outing_id) = 0 then 0
    else round(coalesce(sum(o.quantity), 0)::numeric / count(distinct r.outing_id), 1)
  end as avg_per_outing
from public.profiles p
left join public.orders o on o.user_id = p.id and o.quantity > 0
left join public.rounds r on r.id = o.round_id
group by p.id, p.display_name;

grant select on public.halouf_awards to authenticated;
