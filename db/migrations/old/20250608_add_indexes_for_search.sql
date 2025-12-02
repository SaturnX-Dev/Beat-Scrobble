-- +goose Up
-- +goose StatementBegin

CREATE INDEX idx_artist_aliases_alias_trgm ON artist_aliases USING GIN (alias gin_trgm_ops);
CREATE INDEX idx_release_aliases_alias_trgm ON release_aliases USING GIN (alias gin_trgm_ops);

-- +goose StatementEnd