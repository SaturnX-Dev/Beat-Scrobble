-- +goose Up
-- +goose StatementBegin

CREATE OR REPLACE FUNCTION delete_orphan_releases()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM artist_releases
        WHERE release_id = OLD.release_id
    ) THEN
        DELETE FROM releases WHERE id = OLD.release_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_delete_orphan_releases
AFTER DELETE ON artist_releases
FOR EACH ROW
EXECUTE FUNCTION delete_orphan_releases();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TRIGGER IF EXISTS trg_delete_orphan_releases ON artist_releases;
DROP FUNCTION IF EXISTS delete_orphan_releases;

-- +goose StatementEnd
