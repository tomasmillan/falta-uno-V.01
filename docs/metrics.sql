-- Pilot metrics. Run in Supabase: SQL Editor → paste → Run.

-- Matches created and completed per week
select
  date_trunc('week', created_at)::date as week,
  count(*) as matches_created,
  count(*) filter (where status = 'full') as matches_full,
  count(*) filter (where status = 'cancelled') as matches_cancelled
from public.matches
group by 1
order by 1 desc;

-- Weekly active players (created or joined a match that week)
select
  date_trunc('week', joined_at)::date as week,
  count(distinct player_id) as active_players
from public.match_players
group by 1
order by 1 desc;

-- Registered players
select count(*) as players from public.profiles;
