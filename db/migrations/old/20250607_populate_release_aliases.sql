-- +goose Up
-- +goose StatementBegin

INSERT INTO release_aliases (release_id, alias, source)
SELECT id, title, 'Canonical'
FROM releases;

-- +goose StatementEnd