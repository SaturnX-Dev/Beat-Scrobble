-- +goose Up
-- +goose StatementBegin
CREATE TABLE client_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token TEXT NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    config JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token)
);

CREATE INDEX idx_client_sources_user ON client_sources(user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS client_sources;
-- +goose StatementEnd
