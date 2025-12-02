-- +goose Up
-- +goose StatementBegin
CREATE TABLE user_themes (
    user_id integer NOT NULL,
    theme_data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_themes_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_themes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_themes_user_id ON user_themes USING btree (user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function before update
CREATE TRIGGER update_user_themes_updated_at 
    BEFORE UPDATE ON user_themes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS update_user_themes_updated_at ON user_themes;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS user_themes CASCADE;
-- +goose StatementEnd
