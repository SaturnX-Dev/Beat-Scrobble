package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ClientSource struct {
	ID        uuid.UUID       `json:"id"`
	UserID    int32           `json:"user_id"`
	Name      string          `json:"name"`
	Token     string          `json:"token"`
	LastSeen  time.Time       `json:"last_seen"`
	Config    json.RawMessage `json:"config"`
	CreatedAt time.Time       `json:"created_at"`
}
