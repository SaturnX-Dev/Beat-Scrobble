-- name: CleanOrphanedEntries :exec
DO $$
BEGIN
  DELETE FROM tracks WHERE id NOT IN (SELECT l.track_id FROM listens l);
  DELETE FROM releases WHERE id NOT IN (SELECT t.release_id FROM tracks t);
--   DELETE FROM releases WHERE release_group_id NOT IN (SELECT t.release_group_id FROM tracks t);
--   DELETE FROM releases WHERE release_group_id NOT IN (SELECT rg.id FROM release_groups rg);
  DELETE FROM artists WHERE id NOT IN (SELECT at.artist_id FROM artist_tracks at);
END $$;
