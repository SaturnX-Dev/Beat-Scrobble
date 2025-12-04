-- +goose Up
-- +goose StatementBegin
CREATE TABLE user_preferences (
    user_id integer NOT NULL,
    preferences_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences USING btree (user_id);

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
DROP TABLE IF EXISTS user_preferences CASCADE;
-- +goose StatementEnd
