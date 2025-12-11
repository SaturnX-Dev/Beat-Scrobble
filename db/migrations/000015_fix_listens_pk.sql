-- +goose Up
ALTER TABLE listens DROP CONSTRAINT listens_pkey;
ALTER TABLE listens ADD CONSTRAINT listens_pkey PRIMARY KEY (user_id, track_id, listened_at);

-- +goose Down
ALTER TABLE listens DROP CONSTRAINT listens_pkey;
ALTER TABLE listens ADD CONSTRAINT listens_pkey PRIMARY KEY (track_id, listened_at);
