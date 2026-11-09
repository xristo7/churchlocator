-- Creators can allow viewers to download a video they uploaded to platform storage. Off by default.
alter table spotlight_items add column allow_download integer not null default 0;
