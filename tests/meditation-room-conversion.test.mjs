import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';

test('custom rooms from the earlier rooms API are copied to platform meditation records without losing the source', () => {
  const db = new DatabaseSync(':memory:');
  const files = readdirSync(new URL('../migrations/', import.meta.url)).sort();
  for (const file of files.filter(f => f < '0033')) db.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  db.exec("insert into users (id,email,password_hash,password_salt,name,is_creator,created_at) values ('u1','a@example.test','x','','Ada',1,'t'),('u2','b@example.test','x','','Bo',1,'t')");
  db.exec("insert into tenants values ('t1','u1','Ada','t')");
  db.exec(`insert into meditation_rooms values ('room-custom-abc','u1','{"title":"Mine"}','2026-10-30T00:00:00Z'),('room-custom-def','u2','{"title":"No tenant"}','2026-10-30T00:00:00Z')`);
  const migration = readFileSync(new URL('../migrations/0033_convert_custom_meditation_rooms.sql', import.meta.url), 'utf8');
  db.exec(migration); db.exec(migration);
  const rows = db.prepare("select id,tenant_id,state,data_json from platform_entities where id like 'meditation-abc' or id like 'meditation-def'").all();
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].tenant_id, rows[0].state, JSON.parse(rows[0].data_json).title], ['t1', 'published', 'Mine']);
  assert.equal(db.prepare('select count(*) n from meditation_rooms').get().n, 2);
});
