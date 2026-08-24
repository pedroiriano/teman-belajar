package draft

import (
	"encoding/json"
	"errors"
	"time"
)

const (
	SchemaVersion  = 1
	MaxPayloadSize = 256 * 1024
	ListLimit      = 20
)

var (
	ErrNotFound       = errors.New("draft not found")
	ErrConflict       = errors.New("draft revision conflict")
	ErrValidation     = errors.New("draft validation failed")
	ErrUnsupported    = errors.New("unsupported draft form")
	ErrIdentityLocked = errors.New("draft identity cannot be changed")
)

type FormDraft struct {
	ID                string          `json:"id"`
	ActorSubject      string          `json:"-"`
	DraftKey          string          `json:"draft_key"`
	FormKey           string          `json:"form_key"`
	EntityType        string          `json:"entity_type"`
	EntityID          *string         `json:"entity_id,omitempty"`
	SchemaVersion     int             `json:"schema_version"`
	Payload           json.RawMessage `json:"payload"`
	BaseEntityVersion *string         `json:"base_entity_version,omitempty"`
	Revision          int64           `json:"revision"`
	ClientUpdatedAt   time.Time       `json:"client_updated_at"`
	ExpiresAt         time.Time       `json:"expires_at"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

type SaveInput struct {
	DraftKey          string          `json:"-"`
	FormKey           string          `json:"form_key"`
	EntityType        string          `json:"entity_type"`
	EntityID          *string         `json:"entity_id"`
	SchemaVersion     int             `json:"schema_version"`
	Payload           json.RawMessage `json:"payload"`
	BaseEntityVersion *string         `json:"base_entity_version"`
	ExpectedRevision  int64           `json:"expected_revision"`
	ClientUpdatedAt   time.Time       `json:"client_updated_at"`
}

type ListFilter struct {
	FormKey    string
	EntityType string
	EntityID   *string
}

type DeleteReason string

const (
	DeleteDiscarded DeleteReason = "discarded"
	DeleteFinalized DeleteReason = "finalized"
)

type Conflict struct {
	Current *FormDraft
}

func (c *Conflict) Error() string { return ErrConflict.Error() }

func (c *Conflict) Unwrap() error { return ErrConflict }
