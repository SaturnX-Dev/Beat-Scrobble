-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
-- +goose StatementEnd

-- Performance Indexes for Beat Scrobble
-- optimizing for: WHERE user_id = $ AND listened_at ...

CREATE INDEX IF NOT EXISTS idx_listens_user_id_listened_at 
ON listens USING btree (user_id, listened_at DESC);

CREATE INDEX IF NOT EXISTS idx_listens_user_id_track_id 
ON listens USING btree (user_id, track_id);

CREATE INDEX IF NOT EXISTS idx_listens_user_id_track_id_listened_at 
ON listens USING btree (user_id, track_id, listened_at DESC);

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd

DROP INDEX IF EXISTS idx_listens_user_id_listened_at;
DROP INDEX IF EXISTS idx_listens_user_id_track_id;
DROP INDEX IF EXISTS idx_listens_user_id_track_id_listened_at;
