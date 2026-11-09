-- One-time, non-destructive conversion of custom meditation rooms created through the earlier rooms API
-- into the platform meditation records that the current Meditation module reads.
-- Source rows in meditation_rooms (and all reflections) are left untouched. Re-running is a no-op.
insert or ignore into platform_entities (id,kind,tenant_id,created_by,state,revision,data_json,created_at,updated_at)
select 'meditation-' || replace(r.id,'room-custom-',''), 'meditation', t.id, r.created_by, 'published', 1,
       json_set(r.data_json, '$.convertedFromRoom', r.id), r.created_at, r.created_at
from meditation_rooms r
join tenants t on t.owner_user_id = r.created_by
where r.id like 'room-custom-%' and json_valid(r.data_json)
  and t.id = (select min(t2.id) from tenants t2 where t2.owner_user_id = r.created_by);
