package integration

import (
	"encoding/json"
	"testing"
	"time"
)

func validEnvelope() *EventEnvelope {
	return &EventEnvelope{
		EventID:       "evt-001",
		EventType:     "learning.user_enrolled",
		OccurredAt:    time.Now().UTC(),
		Source:        "moodle",
		SubjectID:     "user-42",
		Payload:       json.RawMessage(`{"course_id": 1}`),
		SchemaVersion: "1.0",
	}
}

func TestValidateEnvelope_Valid(t *testing.T) {
	if err := ValidateEnvelope(validEnvelope()); err != nil {
		t.Errorf("expected valid envelope, got error: %v", err)
	}
}

func TestValidateEnvelope_MissingEventID(t *testing.T) {
	e := validEnvelope()
	e.EventID = ""
	if err := ValidateEnvelope(e); err == nil {
		t.Error("expected error for missing event_id")
	}
}

func TestValidateEnvelope_UnsupportedEventType(t *testing.T) {
	e := validEnvelope()
	e.EventType = "unknown.event"
	if err := ValidateEnvelope(e); err == nil {
		t.Error("expected error for unsupported event_type")
	}
}

func TestValidateEnvelope_MissingSource(t *testing.T) {
	e := validEnvelope()
	e.Source = ""
	if err := ValidateEnvelope(e); err == nil {
		t.Error("expected error for missing source")
	}
}

func TestValidateEnvelope_MissingSubjectID(t *testing.T) {
	e := validEnvelope()
	e.SubjectID = ""
	if err := ValidateEnvelope(e); err == nil {
		t.Error("expected error for missing subject_id")
	}
}

func TestValidateEnvelope_ZeroOccurredAt(t *testing.T) {
	e := validEnvelope()
	e.OccurredAt = time.Time{}
	if err := ValidateEnvelope(e); err == nil {
		t.Error("expected error for zero occurred_at")
	}
}

func TestValidateEnvelope_UnsupportedSchemaVersion(t *testing.T) {
	e := validEnvelope()
	e.SchemaVersion = "99.0"
	if err := ValidateEnvelope(e); err == nil {
		t.Error("expected error for unsupported schema_version")
	}
}

func TestValidateEnvelope_InvalidPayloadJSON(t *testing.T) {
	e := validEnvelope()
	e.Payload = json.RawMessage(`"not-an-object"`)
	if err := ValidateEnvelope(e); err == nil {
		t.Error("expected error for non-object payload")
	}
}

func TestValidateEnvelope_EmptyPayload(t *testing.T) {
	e := validEnvelope()
	e.Payload = nil
	if err := ValidateEnvelope(e); err == nil {
		t.Error("expected error for empty payload")
	}
}

func TestComputeFingerprint_Deterministic(t *testing.T) {
	e := validEnvelope()
	fp1 := ComputeFingerprint(e)
	fp2 := ComputeFingerprint(e)
	if fp1 != fp2 {
		t.Errorf("fingerprint not deterministic: %s != %s", fp1, fp2)
	}
}

func TestComputeFingerprint_DifferentPayload(t *testing.T) {
	e1 := validEnvelope()
	e2 := validEnvelope()
	e2.Payload = json.RawMessage(`{"course_id": 2}`)
	fp1 := ComputeFingerprint(e1)
	fp2 := ComputeFingerprint(e2)
	if fp1 == fp2 {
		t.Error("expected different fingerprints for different payloads")
	}
}

func TestComputeFingerprint_DifferentEventType(t *testing.T) {
	e1 := validEnvelope()
	e2 := validEnvelope()
	e2.EventType = "learning.course_completed"
	fp1 := ComputeFingerprint(e1)
	fp2 := ComputeFingerprint(e2)
	if fp1 == fp2 {
		t.Error("expected different fingerprints for different event types")
	}
}

func TestInboxEventFromEnvelope(t *testing.T) {
	e := validEnvelope()
	inbox := InboxEventFromEnvelope(e)
	if inbox.EventID != e.EventID {
		t.Errorf("event_id mismatch: %s != %s", inbox.EventID, e.EventID)
	}
	if inbox.Status != StatusPending {
		t.Errorf("expected status pending, got %s", inbox.Status)
	}
	if inbox.Attempts != 0 {
		t.Errorf("expected 0 attempts, got %d", inbox.Attempts)
	}
	if inbox.Fingerprint == "" {
		t.Error("expected non-empty fingerprint")
	}
}

func TestAllSupportedEventTypes(t *testing.T) {
	expected := []string{
		"learning.user_enrolled",
		"learning.course_completed",
		"learning.activity_completed",
		"learning.badge_awarded",
		"learning.certificate_issued",
		"learning.course_updated",
	}
	for _, et := range expected {
		if !SupportedEventTypes[et] {
			t.Errorf("expected %s to be supported", et)
		}
	}
}
