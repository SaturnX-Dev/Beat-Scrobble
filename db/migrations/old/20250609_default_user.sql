-- +goose Up
-- +goose StatementBegin

ALTER TABLE users DROP COLUMN password;
ALTER TABLE users ADD password BYTEA NOT NULL;

-- +goose StatementEnd