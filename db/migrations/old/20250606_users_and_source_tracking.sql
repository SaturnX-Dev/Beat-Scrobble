-- +goose Up
-- +goose StatementBegin

CREATE TYPE role AS ENUM ('admin', 'user');

CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL GENERATED ALWAYS AS IDENTITY,
    PRIMARY KEY(id),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role role NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS api_keys (
    id INT NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    label TEXT
);

CREATE TABLE IF NOT EXISTS release_aliases (
    release_id INT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    PRIMARY KEY (release_id, alias),
    source TEXT NOT NULL
);

ALTER TABLE listens 
ADD user_id INT NOT NULL REFERENCES users(id);
ALTER TABLE listens 
ADD client TEXT;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE listens 
DROP COLUMN client;
ALTER TABLE listens 
DROP COLUMN user_id;

DROP TABLE IF EXISTS release_aliases;

DROP TABLE IF EXISTS api_keys;

DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS role;

-- +goose StatementEnd
